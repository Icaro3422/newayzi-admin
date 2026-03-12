"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Input,
  Button,
  Spinner,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type AvailabilityItem, type PropertyListItem, type Operator } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

type ViewMode = "calendar" | "table";

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

const inputDark = "rounded-xl border";

type SlotDetail = {
  propertyName: string;
  date: string;
  total: number;
  currency?: string;
  priceRange?: { min: number; max: number };
  roomTypes: { roomTypeName: string; available: number; source: string; pricePerNight?: string; currency?: string }[];
};

function formatShortDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function formatLongDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function getAvailabilityColor(available: number): string {
  if (available > 0) return "bg-emerald-500/25 text-emerald-300 border border-emerald-400/30";
  return "bg-white/10 text-white/50 border border-white/[0.08]";
}

function formatPrice(value: string | number, currency = "COP"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatPriceRangeCompact(min: number, max: number, currency = "COP"): string {
  const sym = currency === "USD" ? "$" : "$";
  const fmt = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(Math.round(v)));
  return min === max ? `${sym}${fmt(min)}` : `${sym}${fmt(min)}-${fmt(max)}`;
}

export function AvailabilityList() {
  const { role, me } = useAdmin();
  const isOperador = role === "operador";
  const myOperatorId = me?.operator_id ?? null;

  const [list, setList] = useState<AvailabilityItem[]>([]);
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  });
  const [propertyId, setPropertyId] = useState<string>("");
  // Para operadores, el filtro de operador se fija al suyo propio
  const [operatorId, setOperatorId] = useState<string>(() =>
    isOperador && myOperatorId ? String(myOperatorId) : ""
  );
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  function load() {
    setLoading(true);
    const params: { date_from?: string; date_to?: string; property_id?: number; operator_id?: number } = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const pid = parseInt(propertyId, 10);
    if (!Number.isNaN(pid)) params.property_id = pid;
    // Para operadores, siempre filtrar por su operator_id, sin excepción
    const effectiveOperatorId = isOperador && myOperatorId
      ? myOperatorId
      : parseInt(operatorId, 10);
    if (!Number.isNaN(effectiveOperatorId) && effectiveOperatorId > 0) {
      params.operator_id = effectiveOperatorId;
    }
    adminApi.getAvailability(params).then((res) => {
      setList(res?.results ?? []);
      setLoading(false);
    });
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminApi.getProperties({ is_active: true }),
      // Los operadores no necesitan el selector de operador — solo el super_admin/comercial
      isOperador ? Promise.resolve(null) : adminApi.getOperators(),
    ]).then(([propsRes, opsRes]) => {
      if (cancelled) return;
      const props = propsRes?.results ?? [];
      const ops = opsRes?.results ?? [];
      // Para operadores, filtramos las propiedades a las suyas (si hay operator_name disponible)
      const filteredProps = isOperador && me?.operator_name
        ? props.filter((p) => !p.operator_name || p.operator_name === me.operator_name)
        : props;
      setProperties([...new Map(filteredProps.map((p) => [p.id, p])).values()]);
      setOperators([...new Map(ops.map((o) => [o.id, o])).values()]);
    });
    return () => { cancelled = true; };
  }, [isOperador, myOperatorId, me?.operator_name]);

  useEffect(() => {
    load();
  }, []);

  const { dates, propertyRows } = useMemo(() => {
    const dateSet = new Set<string>();
    const byProperty = new Map<
      number,
      { name: string; byDate: Map<string, number>; byDatePriceRange: Map<string, { min: number; max: number; currency: string }> }
    >();
    for (const a of list) {
      dateSet.add(a.date);
      if (!byProperty.has(a.property_id)) {
        byProperty.set(a.property_id, {
          name: a.property_name,
          byDate: new Map(),
          byDatePriceRange: new Map(),
        });
      }
      const row = byProperty.get(a.property_id)!;
      const prev = row.byDate.get(a.date) ?? 0;
      row.byDate.set(a.date, prev + a.available);
      if (a.available > 0 && a.price_per_night && a.currency) {
        const price = parseFloat(a.price_per_night);
        if (!Number.isNaN(price)) {
          const existing = row.byDatePriceRange.get(a.date);
          if (!existing) {
            row.byDatePriceRange.set(a.date, { min: price, max: price, currency: a.currency });
          } else {
            existing.min = Math.min(existing.min, price);
            existing.max = Math.max(existing.max, price);
          }
        }
      }
    }
    const sortedDates = Array.from(dateSet).sort();
    const sortedProps = Array.from(byProperty.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, data]) => ({ id, ...data }));
    return {
      dates: sortedDates,
      propertyRows: sortedProps,
    };
  }, [list]);

  const slotDetailMap = useMemo(() => {
    const map = new Map<string, SlotDetail>();
    for (const a of list) {
      const key = `${a.property_id}-${a.date}`;
      if (!map.has(key)) {
        map.set(key, {
          propertyName: a.property_name,
          date: a.date,
          total: 0,
          roomTypes: [],
        });
      }
      const slot = map.get(key)!;
      if (a.available > 0) {
        const price = a.price_per_night ? parseFloat(a.price_per_night) : undefined;
        slot.roomTypes.push({
          roomTypeName: a.room_type_name,
          available: a.available,
          source: a.source === "pms" ? "PMS" : "Interno",
          pricePerNight: a.price_per_night,
          currency: a.currency,
        });
        slot.total += a.available;
        if (a.currency) slot.currency = a.currency;
      }
    }
    for (const slot of map.values()) {
      const prices = slot.roomTypes
        .map((rt) => (rt.pricePerNight ? parseFloat(rt.pricePerNight) : NaN))
        .filter((p) => !Number.isNaN(p));
      if (prices.length > 0) {
        slot.priceRange = { min: Math.min(...prices), max: Math.max(...prices) };
      }
    }
    return map;
  }, [list]);

  const [slotDetail, setSlotDetail] = useState<SlotDetail | null>(null);

  const getSlotDetail = useCallback(
    (propertyId: number, date: string) => slotDetailMap.get(`${propertyId}-${date}`) ?? null,
    [slotDetailMap]
  );

  const hasAvailability = useMemo(() => {
    return list.some((a) => a.available > 0);
  }, [list]);

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
            <Icon icon="solar:filter-bold-duotone" className="text-[#9b74ff] text-base" />
          </div>
          <div>
            <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Filtros</p>
            <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
              {isOperador ? "Propiedad y fechas" : "Operador, propiedad y fechas"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {/* El selector de operador solo aparece para roles con acceso a múltiples operadores */}
          {!isOperador && (
            <Select
              label="Operador"
              placeholder="Todos"
              selectedKeys={operatorId ? [operatorId] : ["__all__"]}
              onSelectionChange={(s) => {
                const v = Array.from(s)[0] as string;
                setOperatorId(v === "__all__" ? "" : v);
              }}
              size="sm"
              className="w-48"
              items={[{ id: "__all__", name: "Todos los operadores" }, ...operators]}
              classNames={{
                trigger: inputDark,
                label: "!text-white/65",
                value: "!text-white/92 font-medium",
                innerWrapper: "!text-white",
                selectorIcon: "!text-white/50",
                popoverContent: "bg-[#0f1220] border border-white/[0.1]",
              }}
            >
              {(item) => <SelectItem key={String(item.id)} className="text-white">{item.name}</SelectItem>}
            </Select>
          )}
          <Select
            label="Propiedad"
            placeholder="Todas"
            selectedKeys={propertyId ? [propertyId] : ["__all__"]}
            onSelectionChange={(s) => {
              const v = Array.from(s)[0] as string;
              setPropertyId(v === "__all__" ? "" : v);
            }}
            size="sm"
            className="w-56"
            aria-label="Filtrar por propiedad"
            items={[{ id: "__all__", name: "Todas las propiedades" }, ...properties]}
            classNames={{
              trigger: inputDark,
              label: "!text-white/65",
              value: "!text-white/92 font-medium",
              innerWrapper: "!text-white",
              selectorIcon: "!text-white/50",
              popoverContent: "bg-[#0f1220] border border-white/[0.1]",
            }}
          >
            {(item) => <SelectItem key={String(item.id)} className="text-white">{item.name}</SelectItem>}
          </Select>
          <Input
            label="Desde"
            type="date"
            value={dateFrom}
            onValueChange={setDateFrom}
            size="sm"
            className="w-36"
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95 placeholder:!text-white/38",
              label: "!text-white/65",
            }}
          />
          <Input
            label="Hasta"
            type="date"
            value={dateTo}
            onValueChange={setDateTo}
            size="sm"
            className="w-36"
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95 placeholder:!text-white/38",
              label: "!text-white/65",
            }}
          />
          <Button className="btn-newayzi-primary" size="sm" onPress={load} startContent={<Icon icon="solar:magnifer-outline" width={18} />}>
            Filtrar
          </Button>
        </div>
      </GlassCard>

      {/* Tabs: Calendario / Tabla */}
      <Tabs
        selectedKey={viewMode}
        onSelectionChange={(k) => setViewMode(k as ViewMode)}
        size="sm"
        classNames={{
          tabList: "bg-white/[0.06] border border-white/[0.1] rounded-xl p-1",
          cursor: "bg-[#5e2cec]/40 rounded-lg",
          tab: "text-white/70 data-[selected=true]:text-white",
          tabContent: "group-data-[selected=true]:text-white",
        }}
      >
        <Tab
          key="calendar"
          title={
            <span className="flex items-center gap-2">
              <Icon icon="solar:calendar-outline" width={18} />
              Mapa calendario
            </span>
          }
        />
        <Tab
          key="table"
          title={
            <span className="flex items-center gap-2">
              <Icon icon="solar:list-outline" width={18} />
              Lista detallada
            </span>
          }
        />
      </Tabs>

      {loading ? (
        <GlassCard className="flex justify-center items-center py-16">
          <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
        </GlassCard>
      ) : viewMode === "calendar" ? (
        /* Vista calendario */
        <GlassCard className="p-0 overflow-hidden">
          {list.length === 0 ? (
            <div className="py-16 text-center text-white/50">
              No hay datos de disponibilidad. Ajusta filtros o espera sincronización PMS.
            </div>
          ) : (
            <>
            <div className="calendar-scroll overflow-x-auto w-full max-w-full overscroll-x-contain">
              <table className="border-collapse" style={{ minWidth: "max-content" }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[200px] border-b border-r border-white/[0.08] bg-[#0f1220] px-4 py-3 text-left text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]">
                      Propiedad
                    </th>
                    {dates.map((d) => (
                      <th
                        key={d}
                        className="min-w-[120px] w-[120px] border-b border-white/[0.08] bg-white/[0.04] px-3 py-3 text-center text-xs font-medium text-white/60 whitespace-nowrap"
                      >
                        {formatShortDate(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {propertyRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="sticky left-0 z-10 border-r border-white/[0.06] bg-[#0f1220] px-4 py-2 font-medium text-white/90 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]">
                        {row.name}
                      </td>
                      {dates.map((d) => {
                        const avail = row.byDate.get(d) ?? 0;
                        const priceRange = row.byDatePriceRange.get(d);
                        const detail = getSlotDetail(row.id, d);
                        const hasDetail = detail && detail.roomTypes.length > 0;
                        const tooltip = hasDetail
                          ? `${row.name} - ${formatLongDate(d)}. Clic para ver detalle por tipo de habitación`
                          : `${row.name} - ${d}: ${avail} disponibles`;
                        return (
                          <td
                            key={d}
                            className={`border border-white/[0.06] px-3 py-3 text-center text-sm font-semibold align-top ${getAvailabilityColor(avail)} ${hasDetail ? "cursor-pointer hover:ring-2 hover:ring-[#5e2cec]/50 hover:ring-inset transition-all" : ""}`}
                            title={tooltip}
                            role={hasDetail ? "button" : undefined}
                            tabIndex={hasDetail ? 0 : undefined}
                            onClick={hasDetail ? () => setSlotDetail(detail) : undefined}
                            onKeyDown={
                              hasDetail
                                ? (e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSlotDetail(detail);
                                    }
                                  }
                                : undefined
                            }
                          >
                            <div className="flex flex-col items-center gap-1 min-w-0">
                              <span className="text-base font-bold">{avail}</span>
                              {priceRange && (
                                <span className="text-[10px] font-medium text-white/70" title={`${formatPrice(priceRange.min, priceRange.currency)} - ${formatPrice(priceRange.max, priceRange.currency)}`}>
                                  {formatPriceRangeCompact(priceRange.min, priceRange.max, priceRange.currency)}
                                </span>
                              )}
                              {hasDetail &&
                                (detail.roomTypes.length === 1 ? (
                                  <span className="w-full text-[10px] font-normal opacity-80 leading-tight break-words line-clamp-2" title={detail.roomTypes[0].roomTypeName}>
                                    {detail.roomTypes[0].roomTypeName}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-normal opacity-70">{detail.roomTypes.length} tipos</span>
                                ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasAvailability && (
              <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.08] px-4 py-3 text-xs text-white/50 shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-500/40" /> Con disponibilidad
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-white/20" /> Sin disponibilidad
                </span>
                <span className="flex items-center gap-1.5 text-[#9b74ff]">
                  <Icon icon="solar:mouse-minimalistic-outline" width={14} /> Clic en un slot para ver detalle
                </span>
              </div>
            )}
            </>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">Propiedad</th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">Tipo habitación</th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">Fecha</th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">Disponibles</th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">Precio/noche</th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-white/50">
                      No hay datos de disponibilidad. Ajusta filtros o espera sincronización PMS.
                    </td>
                  </tr>
                ) : (
                  list.map((a) => (
                    <tr
                      key={`${a.property_id}-${a.room_type_id}-${a.date}`}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-4 px-5 text-white/85 font-medium">{a.property_name}</td>
                      <td className="py-4 px-5 text-white/70 text-sm">{a.room_type_name}</td>
                      <td className="py-4 px-5 text-white/70 text-sm">{a.date}</td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${getAvailabilityColor(a.available)}`}>
                          {a.available}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-white/70 text-sm">
                        {a.price_per_night && a.currency
                          ? formatPrice(a.price_per_night, a.currency)
                          : "—"}
                      </td>
                      <td className="py-4 px-5 text-white/60 text-sm">{a.source}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <Modal
        isOpen={!!slotDetail}
        onOpenChange={(open) => !open && setSlotDetail(null)}
        size="md"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={{
          base: "admin-modal-dark !bg-[#0f1220] max-h-[90vh] border border-white/[0.12] backdrop-blur-xl rounded-[28px] shadow-2xl shadow-black/50 overflow-hidden flex flex-col",
          header: "border-b border-white/[0.08] !text-white pb-4 shrink-0",
          body: "relative !text-white/95 !bg-transparent overflow-y-auto",
          closeButton: "!text-white/90 hover:!bg-white/10 hover:!text-white rounded-full",
          backdrop: "!bg-black/70 backdrop-blur-md",
          wrapper: "!bg-transparent",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 pt-6 px-6">
            <span className="font-sora font-semibold text-white">{slotDetail?.propertyName}</span>
            <span className="text-sm font-normal text-white/60">
              {slotDetail && formatLongDate(slotDetail.date)}
            </span>
          </ModalHeader>
          <ModalBody className="py-6 px-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
            {slotDetail && (
              <div className="relative space-y-4">
                <div className="absolute bottom-0 right-0 w-[28%] h-[35%] opacity-[0.06] select-none pointer-events-none z-[1]" aria-hidden>
                  <img src="/brand/n-patron-black.svg" alt="" className="w-full h-full object-contain object-right-bottom invert" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/20 px-4 py-3 shrink-0">
                  <Icon icon="solar:bed-outline" className="text-emerald-300 shrink-0" width={24} />
                  <span className="font-semibold text-emerald-200">
                    {slotDetail.total} {slotDetail.total === 1 ? "unidad disponible" : "unidades disponibles"}
                  </span>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-white/80">Por tipo de habitación</p>
                  <ul className="space-y-2">
                    {slotDetail.roomTypes.map((rt, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-white/[0.06] px-4 py-2.5"
                      >
                        <span className="min-w-0 flex-1 font-medium text-white/90">{rt.roomTypeName}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          {rt.pricePerNight && (
                            <span className="text-sm font-semibold text-[#b89eff]">
                              {formatPrice(rt.pricePerNight, rt.currency ?? slotDetail.currency)}
                            </span>
                          )}
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${getAvailabilityColor(rt.available)}`}>
                            {rt.available}
                          </span>
                          <span className="text-xs text-white/50">{rt.source}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-white/50">
                  Los agentes pueden usar esta información para ofrecer paquetes y planes a sus clientes.
                </p>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}

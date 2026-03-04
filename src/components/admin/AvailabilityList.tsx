"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Spinner,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type AvailabilityItem, type PropertyListItem, type Operator } from "@/lib/admin-api";
import { ModalPatternBg } from "@/components/ui/ModalPatternBg";

type ViewMode = "calendar" | "table";

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
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function formatLongDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function getAvailabilityColor(available: number): string {
  if (available > 0) return "bg-emerald-500/20 text-emerald-800 border-emerald-300";
  return "bg-slate-100 text-slate-500 border-slate-200";
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
  const [operatorId, setOperatorId] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  function load() {
    setLoading(true);
    const params: { date_from?: string; date_to?: string; property_id?: number; operator_id?: number } = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const pid = parseInt(propertyId, 10);
    if (!Number.isNaN(pid)) params.property_id = pid;
    const oid = parseInt(operatorId, 10);
    if (!Number.isNaN(oid)) params.operator_id = oid;
    adminApi.getAvailability(params).then((res) => {
      setList(res?.results ?? []);
      setLoading(false);
    });
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminApi.getProperties({ is_active: true }),
      adminApi.getOperators(),
    ]).then(([propsRes, opsRes]) => {
      if (cancelled) return;
      const props = propsRes?.results ?? [];
      const ops = opsRes?.results ?? [];
      setProperties([...new Map(props.map((p) => [p.id, p])).values()]);
      setOperators([...new Map(ops.map((o) => [o.id, o])).values()]);
    });
    return () => { cancelled = true; };
  }, []);

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
    <div className="space-y-4">
      {/* Filtros mejorados */}
      <div className="rounded-[20px] border border-gray-200/60 bg-white/90 backdrop-blur-sm shadow-sm p-4">
        <p className="mb-3 text-sm font-medium text-newayzi-jet">Filtros</p>
        <div className="flex flex-wrap items-end gap-4">
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
          >
            {(item) => <SelectItem key={String(item.id)}>{item.name}</SelectItem>}
          </Select>
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
          >
            {(item) => <SelectItem key={String(item.id)}>{item.name}</SelectItem>}
          </Select>
          <Input
            label="Desde"
            type="date"
            value={dateFrom}
            onValueChange={setDateFrom}
            size="sm"
            className="w-36"
          />
          <Input
            label="Hasta"
            type="date"
            value={dateTo}
            onValueChange={setDateTo}
            size="sm"
            className="w-36"
          />
          <Button className="btn-newayzi-primary" size="sm" onPress={load} startContent={<Icon icon="solar:magnifer-outline" width={18} />}>
            Filtrar
          </Button>
        </div>
      </div>

      {/* Tabs: Calendario / Tabla */}
      <Tabs
        selectedKey={viewMode}
        onSelectionChange={(k) => setViewMode(k as ViewMode)}
        size="sm"
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
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="primary" />
        </div>
      ) : viewMode === "calendar" ? (
        /* Vista calendario */
        <div className="overflow-x-auto rounded-[20px] border border-gray-200/60 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
          {list.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No hay datos de disponibilidad. Ajusta filtros o espera sincronización PMS.
            </div>
          ) : (
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[200px] border border-gray-200/60 bg-slate-50 px-3 py-2 text-left font-medium text-newayzi-jet">
                      Propiedad
                    </th>
                    {dates.map((d) => (
                      <th
                        key={d}
                        className="min-w-[80px] border border-gray-200/60 bg-slate-50 px-2 py-2 text-center text-xs font-medium text-slate-600"
                      >
                        {formatShortDate(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {propertyRows.map((row) => (
                    <tr key={row.id}>
                      <td className="sticky left-0 z-10 border border-gray-200/60 bg-white px-3 py-2 font-medium text-newayzi-jet">
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
                            className={`border border-gray-200/60 px-2 py-2 text-center text-sm font-semibold ${getAvailabilityColor(avail)} ${hasDetail ? "cursor-pointer hover:ring-2 hover:ring-majorelle/40 hover:ring-inset transition-all" : ""}`}
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
                            <div className="flex flex-col items-center gap-0.5">
                              <span>{avail}</span>
                              {priceRange && (
                                <span className="text-[9px] font-normal text-slate-600" title={`${formatPrice(priceRange.min, priceRange.currency)} - ${formatPrice(priceRange.max, priceRange.currency)}`}>
                                  {formatPriceRangeCompact(priceRange.min, priceRange.max, priceRange.currency)}
                                </span>
                              )}
                              {hasDetail &&
                                (detail.roomTypes.length === 1 ? (
                                  <span className="max-w-[56px] truncate text-[9px] font-normal opacity-70" title={detail.roomTypes[0].roomTypeName}>
                                    {detail.roomTypes[0].roomTypeName}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-normal opacity-60">{detail.roomTypes.length} tipos</span>
                                ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasAvailability && (
                <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-gray-200/60 px-4 py-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-emerald-500/30" /> Con disponibilidad
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-100" /> Sin disponibilidad
                  </span>
                  <span className="flex items-center gap-1.5 text-majorelle">
                    <Icon icon="solar:mouse-minimalistic-outline" width={14} /> Clic en un slot para ver detalle
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <Table aria-label="Disponibilidad" classNames={{ wrapper: "border border-gray-200/60 rounded-[20px] shadow-sm bg-white/90 backdrop-blur-sm overflow-hidden" }}>
          <TableHeader>
            <TableColumn>Propiedad</TableColumn>
            <TableColumn>Tipo habitación</TableColumn>
            <TableColumn>Fecha</TableColumn>
            <TableColumn>Disponibles</TableColumn>
            <TableColumn>Precio/noche</TableColumn>
            <TableColumn>Fuente</TableColumn>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  No hay datos de disponibilidad. Ajusta filtros o espera sincronización PMS.
                </TableCell>
              </TableRow>
            ) : (
              list.map((a) => (
                <TableRow key={`${a.property_id}-${a.room_type_id}-${a.date}`}>
                  <TableCell>{a.property_name}</TableCell>
                  <TableCell>{a.room_type_name}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>
                    <Chip size="sm" className={getAvailabilityColor(a.available)}>
                      {a.available}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {a.price_per_night && a.currency
                      ? formatPrice(a.price_per_night, a.currency)
                      : "—"}
                  </TableCell>
                  <TableCell>{a.source}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Modal
        isOpen={!!slotDetail}
        onOpenChange={(open) => !open && setSlotDetail(null)}
        size="md"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={{
          base: "max-h-[90vh] border border-gray-200/60 bg-white/90 backdrop-blur-sm rounded-[28px] shadow-md overflow-hidden",
          backdrop: "backdrop-blur-sm",
          header: "border-b border-gray-200/60 pb-4 shrink-0",
          body: "relative",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 pt-6 px-6">
            <span className="font-sora font-semibold text-newayzi-jet">{slotDetail?.propertyName}</span>
            <span className="text-sm font-normal text-slate-500">
              {slotDetail && formatLongDate(slotDetail.date)}
            </span>
          </ModalHeader>
          <ModalBody className="py-6 px-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
            {slotDetail && (
              <div className="relative space-y-4">
                <ModalPatternBg size="small" />
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-500/10 px-4 py-3 shrink-0">
                  <Icon icon="solar:bed-outline" className="text-emerald-600 shrink-0" width={24} />
                  <span className="font-semibold text-emerald-800">
                    {slotDetail.total} {slotDetail.total === 1 ? "unidad disponible" : "unidades disponibles"}
                  </span>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-newayzi-jet">Por tipo de habitación</p>
                  <ul className="space-y-2">
                    {slotDetail.roomTypes.map((rt, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 bg-white/80 px-4 py-2.5 shadow-sm"
                      >
                        <span className="min-w-0 flex-1 font-medium text-newayzi-jet">{rt.roomTypeName}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          {rt.pricePerNight && (
                            <span className="text-sm font-semibold text-newayzi-jet">
                              {formatPrice(rt.pricePerNight, rt.currency ?? slotDetail.currency)}
                            </span>
                          )}
                          <Chip size="sm" className={getAvailabilityColor(rt.available)}>
                            {rt.available}
                          </Chip>
                          <span className="text-xs text-slate-500">{rt.source}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-slate-500">
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

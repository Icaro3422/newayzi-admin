"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type AvailabilityItem, type PropertyListItem, type Operator } from "@/lib/admin-api";

type ViewMode = "calendar" | "table";

function formatShortDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function getAvailabilityColor(available: number): string {
  if (available > 0) return "bg-emerald-500/20 text-emerald-800 border-emerald-300";
  return "bg-slate-100 text-slate-500 border-slate-200";
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
    const byProperty = new Map<number, { name: string; byDate: Map<string, number> }>();
    for (const a of list) {
      dateSet.add(a.date);
      if (!byProperty.has(a.property_id)) {
        byProperty.set(a.property_id, { name: a.property_name, byDate: new Map() });
      }
      const row = byProperty.get(a.property_id)!;
      const prev = row.byDate.get(a.date) ?? 0;
      row.byDate.set(a.date, prev + a.available);
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

  const hasAvailability = useMemo(() => {
    return list.some((a) => a.available > 0);
  }, [list]);

  return (
    <div className="space-y-4">
      {/* Filtros mejorados */}
      <div className="rounded-lg border border-semantic-surface-border bg-white p-4">
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
          <Button color="primary" size="sm" onPress={load} startContent={<Icon icon="solar:magnifer-outline" width={18} />}>
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
        <div className="overflow-x-auto rounded-lg border border-semantic-surface-border bg-white">
          {list.length === 0 ? (
            <div className="py-12 text-center text-semantic-text-muted">
              No hay datos de disponibilidad. Ajusta filtros o espera sincronización PMS.
            </div>
          ) : (
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[200px] border border-semantic-surface-border bg-slate-50 px-3 py-2 text-left font-medium text-newayzi-jet">
                      Propiedad
                    </th>
                    {dates.map((d) => (
                      <th
                        key={d}
                        className="min-w-[52px] border border-semantic-surface-border bg-slate-50 px-2 py-2 text-center text-xs font-medium text-slate-600"
                      >
                        {formatShortDate(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {propertyRows.map((row) => (
                    <tr key={row.id}>
                      <td className="sticky left-0 z-10 border border-semantic-surface-border bg-white px-3 py-2 font-medium text-newayzi-jet">
                        {row.name}
                      </td>
                      {dates.map((d) => {
                        const avail = row.byDate.get(d) ?? 0;
                        return (
                          <td
                            key={d}
                            className={`border border-semantic-surface-border px-2 py-2 text-center text-sm font-semibold ${getAvailabilityColor(avail)}`}
                            title={`${row.name} - ${d}: ${avail} disponibles`}
                          >
                            {avail}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasAvailability && (
                <div className="mt-3 flex items-center gap-4 border-t border-semantic-surface-border px-4 py-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-emerald-500/30" /> Con disponibilidad
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-100" /> Sin disponibilidad
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <Table aria-label="Disponibilidad" classNames={{ wrapper: "border border-semantic-surface-border rounded-lg" }}>
          <TableHeader>
            <TableColumn>Propiedad</TableColumn>
            <TableColumn>Tipo habitación</TableColumn>
            <TableColumn>Fecha</TableColumn>
            <TableColumn>Disponibles</TableColumn>
            <TableColumn>Fuente</TableColumn>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-semantic-text-muted">
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
                  <TableCell>{a.source}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

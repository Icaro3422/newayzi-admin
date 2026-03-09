"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Select,
  SelectItem,
  Input,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type PropertyListItem, type PMSConnectionListItem } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

/* ─── Primitivos (línea visual) ───────────────────────── */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

// Clases base complementadas por los estilos globales de globals.css (.admin-panel)
const inputDark = "rounded-xl border";

export function PropertiesList() {
  const { canEditProperty } = useAdmin();
  const [list, setList] = useState<PropertyListItem[]>([]);
  const [connections, setConnections] = useState<PMSConnectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterCity, setFilterCity] = useState("");
  const [filterPms, setFilterPms] = useState<string>("all");
  const [patching, setPatching] = useState<number | null>(null);

  useEffect(() => {
    adminApi
      .getConnections()
      .then((res) => setConnections(res?.results ?? []))
      .catch(() => setConnections([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: { is_active?: boolean; city?: string; pms_connection_id?: number } = {};
        if (filterActive === "true") params.is_active = true;
        if (filterActive === "false") params.is_active = false;
        if (filterCity.trim()) params.city = filterCity.trim();
        if (filterPms !== "all") params.pms_connection_id = parseInt(filterPms, 10);
        const res = await adminApi.getProperties(params);
        if (cancelled) return;
        setList(res?.results ?? []);
      } catch {
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filterActive, filterCity, filterPms]);

  async function togglePublished(p: PropertyListItem) {
    if (!canEditProperty) return;
    setPatching(p.id);
    try {
      await adminApi.patchProperty(p.id, { is_published: !p.is_published });
      setList((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, is_published: !x.is_published } : x
        )
      );
    } finally {
      setPatching(null);
    }
  }

  async function toggleActive(p: PropertyListItem) {
    if (!canEditProperty) return;
    setPatching(p.id);
    try {
      await adminApi.patchProperty(p.id, { is_active: !p.is_active });
      setList((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x))
      );
    } finally {
      setPatching(null);
    }
  }

  const connectionItems = [
    { id: "all", name: "Todas las conexiones" },
    ...connections.map((c) => ({
      id: String(c.id),
      name: c.name || c.pms_type_display || c.pms_type,
    })),
  ];

  return (
    <div className="space-y-5">
      {/* ── Filtros ── */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
            <Icon icon="solar:filter-bold-duotone" className="text-[#9b74ff] text-base" />
          </div>
          <div>
            <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Filtros</p>
            <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
              Estado, ciudad y conexión PMS
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Estado"
            selectedKeys={[filterActive]}
            onSelectionChange={(s) => setFilterActive(Array.from(s)[0] as string)}
            className="w-40"
            size="sm"
            classNames={{
              trigger: inputDark,
              label: "!text-white/65",
              value: "!text-white/92 font-medium",
              innerWrapper: "!text-white",
              selectorIcon: "!text-white/50",
              popoverContent: "bg-[#0f1220] border border-white/[0.1]",
            }}
          >
            <SelectItem key="all" className="text-white">Todos</SelectItem>
            <SelectItem key="true" className="text-white">Activos</SelectItem>
            <SelectItem key="false" className="text-white">Inactivos</SelectItem>
          </Select>
          <Input
            label="Ciudad"
            placeholder="Filtrar por ciudad"
            value={filterCity}
            onValueChange={setFilterCity}
            className="w-48"
            size="sm"
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95 placeholder:!text-white/38",
              label: "!text-white/65",
            }}
          />
          <Select
            label="PMS"
            selectedKeys={[filterPms]}
            onSelectionChange={(s) => setFilterPms(Array.from(s)[0] as string)}
            className="w-52"
            size="sm"
            placeholder="Todas las conexiones"
            items={connectionItems}
            classNames={{
              trigger: inputDark,
              label: "!text-white/65",
              value: "!text-white/92 font-medium",
              innerWrapper: "!text-white",
              selectorIcon: "!text-white/50",
              popoverContent: "bg-[#0f1220] border border-white/[0.1]",
            }}
          >
            {(item) => <SelectItem key={item.id} className="text-white">{item.name}</SelectItem>}
          </Select>
        </div>
      </GlassCard>

      {/* ── Lista / Tabla ── */}
      {loading ? (
        <GlassCard className="flex justify-center items-center py-16">
          <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
        </GlassCard>
      ) : list.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 flex items-center justify-center mb-4">
            <Icon icon="solar:buildings-2-bold-duotone" className="text-[#9b74ff] text-2xl" />
          </div>
          <p className="font-sora font-bold text-white text-base">Sin resultados</p>
          <p className="mt-2 text-sm text-white/50">
            No hay propiedades que coincidan con los filtros.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                    Nombre
                  </th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                    Ciudad
                  </th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                    Tipo
                  </th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                    Operador / PMS
                  </th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                    Activo
                  </th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                    Publicado
                  </th>
                  <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                    Mascotas
                  </th>
                  {canEditProperty && (
                    <th className="text-right py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-4 px-5">
                      <Link
                        href={`/admin/properties/${p.id}`}
                        className="font-sora font-semibold text-[#9b74ff] hover:text-[#b89eff] transition-colors"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-4 px-5 text-white/70 text-sm">{p.city_name ?? "—"}</td>
                    <td className="py-4 px-5 text-white/70 text-sm">{p.property_type}</td>
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1">
                        {p.operator_name && (
                          <span className="text-sm font-medium text-white/80">{p.operator_name}</span>
                        )}
                        {p.pms_connections && p.pms_connections.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {p.pms_connections.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center rounded-full bg-[#5e2cec]/25 border border-[#5e2cec]/30 px-2.5 py-0.5 text-[0.7rem] font-semibold text-[#b89eff]"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-white/40">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${
                          p.is_active
                            ? "bg-emerald-500/25 border border-emerald-400/30 text-emerald-300"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {p.is_active ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${
                          p.is_published
                            ? "bg-[#5e2cec]/25 border border-[#5e2cec]/40 text-[#b89eff]"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {p.is_published ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-white/70 text-sm">{p.pets_allowed ? "Sí" : "No"}</td>
                    {canEditProperty && (
                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => togglePublished(p)}
                            disabled={patching === p.id}
                            className={`
                              px-3 py-1.5 rounded-xl text-[0.75rem] font-semibold transition-all
                              ${p.is_published
                                ? "bg-amber-500/25 border border-amber-400/40 text-amber-200 hover:bg-amber-500/35"
                                : "bg-[#5e2cec]/25 border border-[#5e2cec]/40 text-[#b89eff] hover:bg-[#5e2cec]/35"
                              }
                              disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                          >
                            {patching === p.id ? "…" : p.is_published ? "Ocultar" : "Publicar"}
                          </button>
                          <button
                            onClick={() => toggleActive(p)}
                            disabled={patching === p.id}
                            className={`
                              px-3 py-1.5 rounded-xl text-[0.75rem] font-semibold transition-all
                              ${p.is_active
                                ? "bg-red-500/25 border border-red-400/40 text-red-300 hover:bg-red-500/35"
                                : "bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/35"
                              }
                              disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                          >
                            {patching === p.id ? "…" : p.is_active ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

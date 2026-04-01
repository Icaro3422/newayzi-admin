"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreatePropertyModal } from "./CreatePropertyModal";
import {
  Button,
  Select,
  SelectItem,
  Input,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  addToast,
  Tooltip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type PropertyListItem, type PMSConnectionListItem, type PropertyRewardsInfo } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

const inputDark = "rounded-xl border";

function PropertyMetaLine({ p }: { p: PropertyListItem }) {
  const city = p.city_name ?? "—";
  const type = p.property_type || "—";
  const n = p.room_types_count ?? 0;
  const roomsLabel = n === 1 ? "1 tipo de habitación" : `${n} tipos de habitación`;
  return (
    <p className="text-xs text-white/45 mt-1 leading-snug break-words">
      {city} · {type} · {roomsLabel}
    </p>
  );
}

function RewardsCell({ ri }: { ri: PropertyRewardsInfo }) {
  const isElite = ri.label === "elite";
  const isPreferred = ri.label === "preferred";
  const badgeClass = isElite
    ? "bg-amber-500/20 border-amber-400/30 text-amber-300"
    : isPreferred
      ? "bg-violet-500/20 border-violet-400/30 text-[#c4a8ff]"
      : "bg-[#5e2cec]/20 border-[#5e2cec]/35 text-[#b89eff]";

  const extraLines: string[] = [];
  if (ri.cashback_pct !== undefined && ri.cashback_pct > 0) {
    extraLines.push(`${ri.cashback_pct}% cashback`);
  }
  if (ri.visibility_boost !== undefined && ri.visibility_boost > 0 && ri.visibility_label) {
    extraLines.push(ri.visibility_label);
  }
  const tooltipBody =
    extraLines.length > 0 ? (
      <div className="text-xs space-y-1 py-0.5">
        {extraLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    ) : (
      <span className="text-xs">Programa Rewards</span>
    );

  return (
    <Tooltip
      placement="top"
      classNames={{ content: "max-w-[220px] bg-[#1a1d2e] border border-white/10 text-white/90" }}
      content={tooltipBody}
    >
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold border cursor-default ${badgeClass}`}
      >
        <Icon icon="solar:gift-bold-duotone" width={12} />
        {ri.label_display ?? "Rewards"}
      </span>
    </Tooltip>
  );
}

/** Chips en columna para que no choquen con la columna de acciones en tablas estrechas */
function StatusColumn({ p }: { p: PropertyListItem }) {
  return (
    <div className="flex flex-col gap-1.5 items-start min-w-0">
      <Tooltip
        content={p.is_active ? "Activo en la plataforma" : "Inactivo"}
        classNames={{ content: "bg-[#1a1d2e] border border-white/10 text-white/90 text-xs" }}
      >
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold border cursor-default shrink-0 ${
            p.is_active
              ? "bg-emerald-500/20 border-emerald-400/25 text-emerald-300"
              : "bg-white/10 border-white/10 text-white/45"
          }`}
        >
          {p.is_active ? "Activo" : "Inactivo"}
        </span>
      </Tooltip>
      <Tooltip
        content={p.is_published ? "Visible en el catálogo público" : "No publicado"}
        classNames={{ content: "bg-[#1a1d2e] border border-white/10 text-white/90 text-xs" }}
      >
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold border cursor-default shrink-0 ${
            p.is_published
              ? "bg-[#5e2cec]/25 border-[#5e2cec]/35 text-[#b89eff]"
              : "bg-white/10 border-white/10 text-white/45"
          }`}
        >
          {p.is_published ? "Publicado" : "Borrador"}
        </span>
      </Tooltip>
      <Tooltip
        content={p.pets_allowed ? "Se admiten mascotas" : "No se admiten mascotas"}
        classNames={{ content: "bg-[#1a1d2e] border border-white/10 text-white/90 text-xs" }}
      >
        <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold border border-white/10 bg-white/[0.06] text-white/70 cursor-default shrink-0">
          <Icon icon="solar:cat-bold-duotone" width={12} className="opacity-80 shrink-0" />
          {p.pets_allowed ? "Sí" : "No"}
        </span>
      </Tooltip>
    </div>
  );
}

function PmsChips({ p }: { p: PropertyListItem }) {
  if (!p.pms_connections?.length) {
    return <span className="text-sm text-white/40">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.pms_connections.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center rounded-full bg-[#5e2cec]/25 border border-[#5e2cec]/30 px-2.5 py-0.5 text-[0.7rem] font-semibold text-[#b89eff] break-all"
        >
          {c.name}
        </span>
      ))}
    </div>
  );
}

type PropertyActionsProps = {
  p: PropertyListItem;
  canEditProperty: boolean;
  patching: number | null;
  onTogglePublished: (p: PropertyListItem) => void;
  onToggleActive: (p: PropertyListItem) => void;
  onDelete: (p: PropertyListItem) => void;
  layout: "card" | "table";
};

function PropertyActions({
  p,
  canEditProperty,
  patching,
  onTogglePublished,
  onToggleActive,
  onDelete,
  layout,
}: PropertyActionsProps) {
  const detailBtn = (
    <Button
      as={Link}
      href={`/admin/properties/${p.id}`}
      size="sm"
      className={`font-semibold bg-[#5e2cec]/30 border border-[#5e2cec]/50 text-[#e8deff] hover:bg-[#5e2cec]/45 ${layout === "card" ? "w-full" : "w-full"}`}
      startContent={<Icon icon="solar:eye-bold-duotone" className="text-lg shrink-0" />}
    >
      Ver detalle
    </Button>
  );

  const editRow = canEditProperty && (
    <div
      className={
        layout === "card"
          ? "grid grid-cols-1 sm:grid-cols-3 gap-2 w-full"
          : "flex flex-wrap gap-1.5 justify-end"
      }
    >
      <button
        type="button"
        onClick={() => onTogglePublished(p)}
        disabled={patching === p.id}
        className={`
          px-2.5 py-1.5 rounded-xl text-[0.7rem] font-semibold transition-all flex-1 min-h-[2.25rem]
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
        type="button"
        onClick={() => onToggleActive(p)}
        disabled={patching === p.id}
        className={`
          px-2.5 py-1.5 rounded-xl text-[0.7rem] font-semibold transition-all flex-1 min-h-[2.25rem]
          ${p.is_active
            ? "bg-red-500/25 border border-red-400/40 text-red-300 hover:bg-red-500/35"
            : "bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/35"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {patching === p.id ? "…" : p.is_active ? "Desactivar" : "Activar"}
      </button>
      <button
        type="button"
        onClick={() => onDelete(p)}
        disabled={patching === p.id}
        className="px-2.5 py-1.5 rounded-xl text-[0.7rem] font-semibold transition-all bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex-1 min-h-[2.25rem]"
      >
        Eliminar
      </button>
    </div>
  );

  return (
    <div className={`flex flex-col gap-2 ${layout === "table" ? "min-w-[200px] max-w-[280px]" : "w-full"}`}>
      {detailBtn}
      {editRow}
    </div>
  );
}

function PropertyCard({
  p,
  showOperatorColumn,
  canEditProperty,
  patching,
  onTogglePublished,
  onToggleActive,
  onDelete,
}: {
  p: PropertyListItem;
  showOperatorColumn: boolean;
  canEditProperty: boolean;
  patching: number | null;
  onTogglePublished: (p: PropertyListItem) => void;
  onToggleActive: (p: PropertyListItem) => void;
  onDelete: (p: PropertyListItem) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-4">
      <div className="flex gap-3 min-w-0">
        <Link
          href={`/admin/properties/${p.id}`}
          className="shrink-0 h-14 w-14 rounded-xl overflow-hidden border border-white/10 bg-white/[0.06] flex items-center justify-center"
          aria-label={`Ver ${p.name}`}
        >
          {p.primary_picture_url ? (
            <img src={p.primary_picture_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon icon="solar:buildings-2-bold-duotone" className="text-white/30 text-2xl" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2 flex-wrap">
            <Link
              href={`/admin/properties/${p.id}`}
              className="font-sora font-semibold text-[#9b74ff] hover:text-[#b89eff] transition-colors text-base break-words"
            >
              {p.name}
            </Link>
            {p.from_pms && (
              <span
                className="inline-flex items-center rounded-full bg-[#5e2cec]/20 border border-[#5e2cec]/40 px-2 py-0.5 text-[0.65rem] font-semibold text-[#b89eff] shrink-0"
                title="Sincronizada desde PMS"
              >
                PMS
              </span>
            )}
          </div>
          <PropertyMetaLine p={p} />
        </div>
      </div>

      {showOperatorColumn && (
        <div className="pt-1 border-t border-white/[0.06] space-y-1">
          <p className="text-[0.65rem] uppercase tracking-wider text-white/40 font-semibold">Operador / PMS</p>
          {p.operator_name && <p className="text-sm font-medium text-white/85">{p.operator_name}</p>}
          <PmsChips p={p} />
        </div>
      )}

      {!showOperatorColumn && (
        <div className="pt-1 border-t border-white/[0.06] space-y-1">
          <p className="text-[0.65rem] uppercase tracking-wider text-white/40 font-semibold">PMS</p>
          <PmsChips p={p} />
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-start justify-between pt-1 border-t border-white/[0.06]">
        <div>
          <p className="text-[0.65rem] uppercase tracking-wider text-white/40 font-semibold mb-2">Estado</p>
          <StatusColumn p={p} />
        </div>
        <div>
          <p className="text-[0.65rem] uppercase tracking-wider text-white/40 font-semibold mb-2">Rewards</p>
          {p.rewards_info?.participates ? (
            <RewardsCell ri={p.rewards_info} />
          ) : (
            <span className="text-white/30 text-sm">—</span>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-white/[0.06]">
        <PropertyActions
          p={p}
          canEditProperty={canEditProperty}
          patching={patching}
          onTogglePublished={onTogglePublished}
          onToggleActive={onToggleActive}
          onDelete={onDelete}
          layout="card"
        />
      </div>
    </div>
  );
}

export function PropertiesList() {
  const { canEditProperty, role, me } = useAdmin();
  const isOperador = role === "operador";
  const operatorId = me?.operator_id ?? null;

  const [list, setList] = useState<PropertyListItem[]>([]);
  const [connections, setConnections] = useState<PMSConnectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterCity, setFilterCity] = useState("");
  const [filterPms, setFilterPms] = useState<string>("all");
  const [patching, setPatching] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<PropertyListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

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
        const params: { is_active?: boolean; city?: string; pms_connection_id?: number; operator_id?: number } = {};
        if (filterActive === "true") params.is_active = true;
        if (filterActive === "false") params.is_active = false;
        if (filterCity.trim()) params.city = filterCity.trim();
        if (filterPms !== "all") params.pms_connection_id = parseInt(filterPms, 10);
        if (isOperador && operatorId) params.operator_id = operatorId;
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
  }, [filterActive, filterCity, filterPms, isOperador, operatorId]);

  async function togglePublished(p: PropertyListItem) {
    if (!canEditProperty) return;
    setPatching(p.id);
    try {
      await adminApi.patchProperty(p.id, { is_published: !p.is_published });
      setList((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_published: !x.is_published } : x))
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

  async function handleDeleteProperty(p: PropertyListItem) {
    if (!canEditProperty) return;
    setDeleting(true);
    try {
      await adminApi.deleteProperty(p.id);
      setList((prev) => prev.filter((x) => x.id !== p.id));
      addToast({
        title: "Propiedad eliminada",
        description: `"${p.name}" fue eliminada correctamente.`,
        color: "success",
      });
    } catch (e) {
      addToast({
        title: "Error al eliminar",
        description: e instanceof Error ? e.message : "No se pudo eliminar la propiedad.",
        color: "danger",
      });
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  }

  const connectionItems = [
    { id: "all", name: "Todas las conexiones" },
    ...connections.map((c) => ({
      id: String(c.id),
      name: c.name || c.pms_type_display || c.pms_type,
    })),
  ];

  const showOperatorColumn = !isOperador;

  return (
    <div className="space-y-5">
      {canEditProperty && role !== "agente" && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            className="btn-newayzi-primary"
            size="sm"
            startContent={<Icon icon="solar:add-circle-bold-duotone" width={18} />}
            onPress={() => setCreateOpen(true)}
          >
            Nueva propiedad (manual)
          </Button>
        </div>
      )}

      <CreatePropertyModal isOpen={createOpen} onOpenChange={setCreateOpen} role={role} />

      <GlassCard className="p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
            <Icon icon="solar:filter-bold-duotone" className="text-[#9b74ff] text-base" />
          </div>
          <div className="min-w-0">
            <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Filtros</p>
            <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
              Estado, ciudad y conexión PMS
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap items-stretch sm:items-end">
          <Select
            label="Estado"
            selectedKeys={[filterActive]}
            onSelectionChange={(s) => setFilterActive(Array.from(s)[0] as string)}
            className="w-full sm:w-40 min-w-0"
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
            <SelectItem key="all" className="text-white">
              Todos
            </SelectItem>
            <SelectItem key="true" className="text-white">
              Activos
            </SelectItem>
            <SelectItem key="false" className="text-white">
              Inactivos
            </SelectItem>
          </Select>
          <Input
            label="Ciudad"
            placeholder="Filtrar por ciudad"
            value={filterCity}
            onValueChange={setFilterCity}
            className="w-full sm:min-w-[12rem] sm:max-w-xs sm:flex-1"
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
            className="w-full sm:min-w-[13rem] sm:max-w-sm"
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
            {(item) => (
              <SelectItem key={item.id} className="text-white">
                {item.name}
              </SelectItem>
            )}
          </Select>
        </div>
      </GlassCard>

      {loading ? (
        <GlassCard className="flex justify-center items-center py-16">
          <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
        </GlassCard>
      ) : list.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 flex items-center justify-center mb-4">
            <Icon icon="solar:buildings-2-bold-duotone" className="text-[#9b74ff] text-2xl" />
          </div>
          <p className="font-sora font-bold text-white text-base">Sin resultados</p>
          <p className="mt-2 text-sm text-white/50 max-w-md">
            No hay propiedades que coincidan con los filtros. Si aún no tienes ninguna vinculada al PMS, puedes dar de alta
            una propiedad manualmente y luego cargar inventario (Excel) y fotos desde la ficha.
          </p>
          {canEditProperty && role !== "agente" && (
            <Button
              className="mt-6 btn-newayzi-primary"
              size="md"
              startContent={<Icon icon="solar:add-circle-bold-duotone" width={20} />}
              onPress={() => setCreateOpen(true)}
            >
              Crear propiedad manual
            </Button>
          )}
        </GlassCard>
      ) : (
        <>
          {/* Móvil y tablet: tarjetas apiladas (sin scroll horizontal forzado) */}
          <div className="lg:hidden flex flex-col gap-3">
            {list.map((p) => (
              <PropertyCard
                key={p.id}
                p={p}
                showOperatorColumn={showOperatorColumn}
                canEditProperty={canEditProperty}
                patching={patching}
                onTogglePublished={togglePublished}
                onToggleActive={toggleActive}
                onDelete={setDeleteModal}
              />
            ))}
          </div>

          {/* Escritorio: tabla con scroll horizontal suave si hace falta (sin sticky que solape) */}
          <GlassCard className="p-0 overflow-hidden hidden lg:block">
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-4 px-4 xl:px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                      Propiedad
                    </th>
                    {showOperatorColumn && (
                      <th className="text-left py-4 px-4 xl:px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                        Operador / PMS
                      </th>
                    )}
                    {!showOperatorColumn && (
                      <th className="text-left py-4 px-4 xl:px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                        PMS
                      </th>
                    )}
                    <th className="text-left py-4 px-3 xl:px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold align-bottom">
                      Estado
                    </th>
                    <th className="text-left py-4 px-3 xl:px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold align-bottom">
                      Rewards
                    </th>
                    <th className="text-right py-4 px-4 xl:px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold align-bottom">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-4 px-4 xl:px-5 align-top">
                        <div className="flex gap-3 min-w-0">
                          <Link
                            href={`/admin/properties/${p.id}`}
                            className="shrink-0 h-12 w-12 rounded-xl overflow-hidden border border-white/10 bg-white/[0.06] flex items-center justify-center"
                            aria-label={`Ver ${p.name}`}
                          >
                            {p.primary_picture_url ? (
                              <img src={p.primary_picture_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Icon icon="solar:buildings-2-bold-duotone" className="text-white/30 text-xl" />
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/admin/properties/${p.id}`}
                                className="font-sora font-semibold text-[#9b74ff] hover:text-[#b89eff] transition-colors break-words"
                              >
                                {p.name}
                              </Link>
                              {p.from_pms && (
                                <span
                                  className="inline-flex items-center rounded-full bg-[#5e2cec]/20 border border-[#5e2cec]/40 px-2 py-0.5 text-[0.65rem] font-semibold text-[#b89eff] shrink-0"
                                  title="Sincronizada desde PMS"
                                >
                                  PMS
                                </span>
                              )}
                            </div>
                            <PropertyMetaLine p={p} />
                          </div>
                        </div>
                      </td>
                      {showOperatorColumn && (
                        <td className="py-4 px-4 xl:px-5 align-top">
                          <div className="flex flex-col gap-1 min-w-0">
                            {p.operator_name && (
                              <span className="text-sm font-medium text-white/80 break-words">{p.operator_name}</span>
                            )}
                            <PmsChips p={p} />
                          </div>
                        </td>
                      )}
                      {!showOperatorColumn && (
                        <td className="py-4 px-4 xl:px-5 align-top min-w-0">
                          <PmsChips p={p} />
                        </td>
                      )}
                      <td className="py-4 px-3 xl:px-5 align-top">
                        <StatusColumn p={p} />
                      </td>
                      <td className="py-4 px-3 xl:px-5 align-top">
                        {p.rewards_info?.participates ? (
                          <RewardsCell ri={p.rewards_info} />
                        ) : (
                          <span className="text-white/30 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 xl:px-5 align-top text-right">
                        <div className="inline-flex flex-col items-end gap-2 w-full max-w-[280px] ml-auto">
                          <PropertyActions
                            p={p}
                            canEditProperty={canEditProperty}
                            patching={patching}
                            onTogglePublished={togglePublished}
                            onToggleActive={toggleActive}
                            onDelete={setDeleteModal}
                            layout="table"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      <Modal isOpen={!!deleteModal} onOpenChange={(open) => !open && setDeleteModal(null)}>
        <ModalContent className="bg-[#0f1220] border border-white/[0.1]">
          <ModalHeader className="text-white font-sora">Eliminar propiedad</ModalHeader>
          <ModalBody>
            {deleteModal && (
              <p className="text-white/70 text-sm">
                Se eliminará la propiedad <strong className="text-white">{deleteModal.name}</strong> y todas sus
                habitaciones asociadas. Esta acción no se puede deshacer.
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setDeleteModal(null)} className="!text-white/70">
              Cancelar
            </Button>
            <Button
              color="danger"
              onPress={() => deleteModal && handleDeleteProperty(deleteModal)}
              isLoading={deleting}
              isDisabled={!deleteModal}
            >
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

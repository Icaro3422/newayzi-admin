"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  ModalFooter,
  Textarea,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  adminApi,
  type AvailabilityItem,
  type AvailabilityBlockItem,
  type AvailabilitySlotDetail,
  type PropertyListItem,
  type Operator,
} from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

type ViewMode = "calendar" | "table" | "blocks";

/* ─── Helpers ─────────────────────────────────────────────── */

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

function formatShortDate(d: string) {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function formatLongDate(d: string) {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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
  const fmt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(Math.round(v));
  return min === max ? `$${fmt(min)}` : `$${fmt(min)}-${fmt(max)}`;
}

function getAvailabilityColor(available: number, total?: number): string {
  if (total !== undefined && total > 0) {
    if (available === 0) return "bg-red-500/20 text-red-300 border border-red-500/30";
    const ratio = available / total;
    if (ratio >= 0.5) return "bg-emerald-500/25 text-emerald-300 border border-emerald-400/30";
    if (ratio >= 0.25) return "bg-amber-500/20 text-amber-300 border border-amber-400/30";
    return "bg-orange-500/20 text-orange-300 border border-orange-400/30";
  }
  if (available > 0) return "bg-emerald-500/25 text-emerald-300 border border-emerald-400/30";
  return "bg-white/10 text-white/50 border border-white/[0.08]";
}

function AvailabilityBar({ available, total }: { available: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((available / total) * 100);
  const color = available === 0 ? "bg-red-500" : pct >= 50 ? "bg-emerald-500" : pct >= 25 ? "bg-amber-500" : "bg-orange-500";
  return (
    <div className="w-full h-1 rounded-full bg-white/10 mt-1">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function statusLabel(s: string) {
  if (s === "active") return { label: "Activo", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  if (s === "cancelled") return { label: "Cancelado", color: "bg-red-500/20 text-red-300 border-red-500/30" };
  if (s === "released") return { label: "Liberado", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
  return { label: s, color: "bg-white/10 text-white/50 border-white/10" };
}

function sourceLabel(s: string) {
  if (s === "internal") return "Interno";
  if (s === "external") return "Externo";
  if (s === "system") return "Sistema";
  return s;
}

/* ─── SlotDetail types ─────────────────────────────────────── */

type SlotDetail = {
  propertyId: number;
  propertyName: string;
  date: string;
  total: number;
  totalRooms: number;
  locked: number;
  currency?: string;
  priceRange?: { min: number; max: number };
  roomTypes: {
    roomTypeId: number;
    roomTypeName: string;
    available: number;
    totalRooms: number;
    locked: number;
    source: string;
    pricePerNight?: string;
    currency?: string;
  }[];
};

/* ─── CreateBlockModal ─────────────────────────────────────── */

function CreateBlockModal({
  isOpen,
  onClose,
  onCreated,
  propertyId,
  properties,
  defaultRoomTypeId,
  defaultDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (block: AvailabilityBlockItem) => void;
  propertyId?: number;
  properties: PropertyListItem[];
  defaultRoomTypeId?: number;
  defaultDate?: string;
}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId ? String(propertyId) : "");
  const [roomTypes, setRoomTypes] = useState<{ id: number; name: string }[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(defaultRoomTypeId ? String(defaultRoomTypeId) : "");
  const [startDate, setStartDate] = useState(defaultDate ?? "");
  const [endDate, setEndDate] = useState(defaultDate ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPropertyId(propertyId ? String(propertyId) : "");
      setSelectedRoomTypeId(defaultRoomTypeId ? String(defaultRoomTypeId) : "");
      setStartDate(defaultDate ?? "");
      setEndDate(defaultDate ?? "");
      setNote("");
      setError("");
    }
  }, [isOpen, propertyId, defaultRoomTypeId, defaultDate]);

  useEffect(() => {
    const pid = parseInt(selectedPropertyId, 10);
    if (!pid) { setRoomTypes([]); return; }
    setLoadingRoomTypes(true);
    adminApi.getProperty(pid).then((prop) => {
      setRoomTypes(prop?.room_types?.map((rt) => ({ id: rt.id, name: rt.name || rt.code || `RT-${rt.id}` })) ?? []);
      setLoadingRoomTypes(false);
    }).catch(() => setLoadingRoomTypes(false));
  }, [selectedPropertyId]);

  async function handleSubmit() {
    setError("");
    const rtId = parseInt(selectedRoomTypeId, 10);
    if (!rtId || !startDate || !endDate) {
      setError("Selecciona tipo de habitación y fechas.");
      return;
    }
    setLoading(true);
    try {
      const result = await adminApi.createAvailabilityBlock({
        room_type_id: rtId,
        start_date: startDate,
        end_date: endDate,
        note: note.trim(),
      });
      if (result) {
        onCreated(result);
        onClose();
      } else {
        setError("No se pudo crear el bloqueo.");
      }
    } catch {
      setError("Error al crear el bloqueo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="md"
      backdrop="blur"
      classNames={{
        base: "admin-modal-dark !bg-[#0f1220] border border-white/[0.12] backdrop-blur-xl rounded-[28px] shadow-2xl shadow-black/50",
        header: "border-b border-white/[0.08] !text-white pb-4",
        body: "!text-white/95 !bg-transparent",
        footer: "border-t border-white/[0.08]",
        closeButton: "!text-white/90 hover:!bg-white/10 hover:!text-white rounded-full",
        backdrop: "!bg-black/70 backdrop-blur-md",
        wrapper: "!bg-transparent",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 pt-6 px-6">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
            <Icon icon="solar:lock-bold-duotone" className="text-red-400 text-base" />
          </div>
          <div>
            <p className="font-sora font-semibold text-white">Crear bloqueo</p>
            <p className="text-sm font-normal text-white/55">Bloquear fechas para un tipo de habitación</p>
          </div>
        </ModalHeader>
        <ModalBody className="py-6 px-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <Select
            label="Propiedad"
            placeholder="Selecciona propiedad"
            selectedKeys={selectedPropertyId ? [selectedPropertyId] : []}
            onSelectionChange={(s) => { setSelectedPropertyId(Array.from(s)[0] as string); setSelectedRoomTypeId(""); }}
            size="sm"
            items={properties}
            classNames={{ trigger: inputDark, label: "!text-white/65", value: "!text-white/92 font-medium", innerWrapper: "!text-white", selectorIcon: "!text-white/50", popoverContent: "bg-[#0f1220] border border-white/[0.1]" }}
          >
            {(p) => <SelectItem key={String(p.id)} className="text-white">{p.name}</SelectItem>}
          </Select>
          <Select
            label="Tipo de habitación"
            placeholder={loadingRoomTypes ? "Cargando..." : "Selecciona tipo"}
            selectedKeys={selectedRoomTypeId ? [selectedRoomTypeId] : []}
            onSelectionChange={(s) => setSelectedRoomTypeId(Array.from(s)[0] as string)}
            size="sm"
            isDisabled={!selectedPropertyId || loadingRoomTypes}
            items={roomTypes}
            classNames={{ trigger: inputDark, label: "!text-white/65", value: "!text-white/92 font-medium", innerWrapper: "!text-white", selectorIcon: "!text-white/50", popoverContent: "bg-[#0f1220] border border-white/[0.1]" }}
          >
            {(rt) => <SelectItem key={String(rt.id)} className="text-white">{rt.name}</SelectItem>}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Desde"
              type="date"
              value={startDate}
              onValueChange={setStartDate}
              size="sm"
              classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
            />
            <Input
              label="Hasta"
              type="date"
              value={endDate}
              onValueChange={setEndDate}
              size="sm"
              classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
            />
          </div>
          <Textarea
            label="Nota (opcional)"
            placeholder="Motivo del bloqueo: mantenimiento, renovación..."
            value={note}
            onValueChange={setNote}
            size="sm"
            minRows={2}
            classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
          />
        </ModalBody>
        <ModalFooter className="px-6 py-4 gap-3">
          <Button variant="flat" size="sm" onPress={onClose} className="text-white/70 bg-white/[0.07] hover:bg-white/[0.12]">
            Cancelar
          </Button>
          <Button
            size="sm"
            className="btn-newayzi-primary"
            isLoading={loading}
            onPress={handleSubmit}
            startContent={!loading && <Icon icon="solar:lock-bold" width={16} />}
          >
            Crear bloqueo
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ─── RoomTypeDetailPanel ─────────────────────────────────── */

function RoomTypeDetailPanel({
  roomTypeId,
  date,
  canManage,
  onBlockCreated,
}: {
  roomTypeId: number;
  date: string;
  canManage: boolean;
  onBlockCreated?: () => void;
}) {
  const [detail, setDetail] = useState<AvailabilitySlotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingBlockId, setCancellingBlockId] = useState<number | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getAvailabilitySlotDetail({ room_type_id: roomTypeId, date })
      .then((res) => { setDetail(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, [roomTypeId, date]);

  useEffect(() => { load(); }, [load]);

  async function handleCancelBlock(blockId: number) {
    setCancellingBlockId(blockId);
    await adminApi.cancelAvailabilityBlock(blockId);
    setCancellingBlockId(null);
    load();
    onBlockCreated?.();
  }

  async function handleDeleteBlock(blockId: number) {
    setDeletingBlockId(blockId);
    await adminApi.deleteAvailabilityBlock(blockId);
    setDeletingBlockId(null);
    load();
    onBlockCreated?.();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-white/40 text-sm py-4 text-center">No se pudo cargar el detalle.</p>;
  }

  return (
    <div className="space-y-4 pt-1">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Total</p>
          <p className="text-xl font-bold text-white">{detail.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center">
          <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider">Disponibles</p>
          <p className="text-xl font-bold text-emerald-300">{detail.available}</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center">
          <p className="text-[10px] text-red-400/70 uppercase tracking-wider">Bloqueadas</p>
          <p className="text-xl font-bold text-red-300">{detail.locked}</p>
        </div>
      </div>

      {/* Physical rooms */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
          Habitaciones físicas
        </p>
        <div className="space-y-1.5">
          {detail.physical_rooms.map((room) => (
            <div
              key={room.id}
              className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                room.is_available
                  ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                  : "border-red-500/20 bg-red-500/[0.06]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  icon={room.is_available ? "solar:check-circle-bold-duotone" : "solar:lock-bold-duotone"}
                  className={room.is_available ? "text-emerald-400 shrink-0" : "text-red-400 shrink-0"}
                  width={18}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-white/90 text-sm">
                    {room.label}
                    {room.floor != null && (
                      <span className="text-white/40 font-normal ml-1.5 text-xs">Piso {room.floor}</span>
                    )}
                  </p>
                  {!room.is_available && room.lock && (
                    <p className="text-xs text-red-300/80 mt-0.5 truncate">
                      {room.lock.note || `Bloqueo ${room.lock.block_start} → ${room.lock.block_end}`}
                    </p>
                  )}
                  {room.last_sync && (
                    <p className="text-[10px] text-white/30 mt-0.5">
                      Sync: {new Date(room.last_sync).toLocaleDateString("es-CO")}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`shrink-0 text-[0.65rem] font-semibold rounded-full px-2.5 py-0.5 border ${
                  room.is_available
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border-red-500/30"
                }`}
              >
                {room.is_available ? "Disponible" : "Bloqueada"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active blocks */}
      {detail.active_blocks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            Bloqueos activos en esta fecha
          </p>
          <div className="space-y-2">
            {detail.active_blocks.map((blk) => {
              const st = statusLabel(blk.status);
              return (
                <div
                  key={blk.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[0.65rem] font-semibold rounded-full px-2 py-0.5 border ${st.color}`}>
                          {st.label}
                        </span>
                        <span className="text-[0.65rem] text-white/40 border border-white/[0.08] rounded-full px-2 py-0.5">
                          {sourceLabel(blk.source)}
                        </span>
                        <span className="text-xs text-white/60">
                          {blk.start_date} → {blk.end_date}
                        </span>
                      </div>
                      {blk.note && <p className="text-sm text-white/70 mt-1">{blk.note}</p>}
                      <p className="text-[10px] text-white/35 mt-0.5">{blk.rooms_affected} hab. afectadas</p>
                    </div>
                    {canManage && blk.source === "internal" && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="flat"
                          isIconOnly
                          className="h-7 w-7 min-w-7 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          title="Cancelar bloqueo"
                          isLoading={cancellingBlockId === blk.id}
                          onPress={() => handleCancelBlock(blk.id)}
                        >
                          <Icon icon="solar:close-circle-bold" width={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          isIconOnly
                          className="h-7 w-7 min-w-7 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          title="Eliminar bloqueo"
                          isLoading={deletingBlockId === blk.id}
                          onPress={() => handleDeleteBlock(blk.id)}
                        >
                          <Icon icon="solar:trash-bin-trash-bold" width={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detail.active_blocks.length === 0 && detail.locked === 0 && (
        <p className="text-xs text-emerald-400/70 text-center py-2">
          Sin bloqueos activos · Todas las habitaciones disponibles
        </p>
      )}
    </div>
  );
}

/* ─── SlotDetailModal ──────────────────────────────────────── */

function SlotDetailModal({
  slotDetail,
  onClose,
  canManage,
  properties,
  onBlocksChanged,
}: {
  slotDetail: SlotDetail | null;
  onClose: () => void;
  canManage: boolean;
  properties: PropertyListItem[];
  onBlocksChanged: () => void;
}) {
  const [expandedRoomTypeId, setExpandedRoomTypeId] = useState<number | null>(null);
  const [showCreateBlock, setShowCreateBlock] = useState(false);
  const [createBlockRoomTypeId, setCreateBlockRoomTypeId] = useState<number | undefined>();

  useEffect(() => {
    if (!slotDetail) { setExpandedRoomTypeId(null); setShowCreateBlock(false); }
  }, [slotDetail]);

  if (!slotDetail) return null;

  const availabilityPct = slotDetail.totalRooms > 0
    ? Math.round((slotDetail.total / slotDetail.totalRooms) * 100)
    : 0;

  return (
    <>
      <Modal
        isOpen={!!slotDetail}
        onOpenChange={(open) => !open && onClose()}
        size="lg"
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-sora font-semibold text-white block">{slotDetail.propertyName}</span>
                <span className="text-sm font-normal text-white/60 capitalize">{formatLongDate(slotDetail.date)}</span>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold border ${getAvailabilityColor(slotDetail.total, slotDetail.totalRooms)}`}>
                  <Icon icon="solar:bed-outline" width={14} />
                  {slotDetail.total} disp.
                </span>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="py-6 px-6 overflow-y-auto">
            <div className="space-y-5">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-center">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Total aloj.</p>
                  <p className="text-2xl font-bold text-white">{slotDetail.totalRooms}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-center">
                  <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-1">Disponibles</p>
                  <p className="text-2xl font-bold text-emerald-300">{slotDetail.total}</p>
                </div>
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-center">
                  <p className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Bloqueadas</p>
                  <p className="text-2xl font-bold text-red-300">{slotDetail.locked}</p>
                </div>
              </div>

              {/* Availability bar */}
              {slotDetail.totalRooms > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/50">Ocupación disponible</span>
                    <span className="text-xs font-semibold text-white/70">{availabilityPct}%</span>
                  </div>
                  <AvailabilityBar available={slotDetail.total} total={slotDetail.totalRooms} />
                </div>
              )}

              {/* Price range */}
              {slotDetail.priceRange && (
                <div className="flex items-center gap-2 rounded-xl border border-[#5e2cec]/30 bg-[#5e2cec]/10 px-4 py-2.5">
                  <Icon icon="solar:tag-price-bold-duotone" className="text-[#b89eff] shrink-0" width={18} />
                  <span className="text-sm font-semibold text-[#b89eff]">
                    {slotDetail.currency
                      ? `${formatPrice(slotDetail.priceRange.min, slotDetail.currency)}${slotDetail.priceRange.min !== slotDetail.priceRange.max ? ` – ${formatPrice(slotDetail.priceRange.max, slotDetail.currency)}` : ""} / noche`
                      : formatPriceRangeCompact(slotDetail.priceRange.min, slotDetail.priceRange.max)}
                  </span>
                </div>
              )}

              {/* Room types — expandable */}
              <div>
                <p className="text-sm font-semibold text-white/70 mb-3">Por tipo de habitación</p>
                <div className="space-y-2">
                  {slotDetail.roomTypes.map((rt) => {
                    const isExpanded = expandedRoomTypeId === rt.roomTypeId;
                    return (
                      <div key={rt.roomTypeId} className="rounded-2xl border border-white/[0.09] bg-white/[0.04] overflow-hidden">
                        {/* Room type header — clickable */}
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
                          onClick={() => setExpandedRoomTypeId(isExpanded ? null : rt.roomTypeId)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Icon
                              icon={isExpanded ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
                              className="text-white/40 shrink-0"
                              width={16}
                            />
                            <span className="font-semibold text-white/90 text-sm truncate">{rt.roomTypeName}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {rt.pricePerNight && (
                              <span className="text-sm font-semibold text-[#b89eff]">
                                {formatPrice(rt.pricePerNight, rt.currency)}
                              </span>
                            )}
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold border ${getAvailabilityColor(rt.available, rt.totalRooms)}`}>
                              {rt.available}/{rt.totalRooms}
                            </span>
                            {canManage && (
                              <Button
                                size="sm"
                                variant="flat"
                                isIconOnly
                                className="h-6 w-6 min-w-6 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                title="Bloquear este tipo de habitación"
                                 onPress={() => {
                                  setCreateBlockRoomTypeId(rt.roomTypeId);
                                  setShowCreateBlock(true);
                                }}
                              >
                                <Icon icon="solar:lock-bold" width={12} />
                              </Button>
                            )}
                          </div>
                        </button>

                        {/* Expanded physical room detail */}
                        {isExpanded && (
                          <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 bg-white/[0.02]">
                            <RoomTypeDetailPanel
                              roomTypeId={rt.roomTypeId}
                              date={slotDetail.date}
                              canManage={canManage}
                              onBlockCreated={onBlocksChanged}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin actions */}
              {canManage && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Acciones de administración</p>
                  <Button
                    size="sm"
                    variant="flat"
                    className="bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20"
                    startContent={<Icon icon="solar:lock-bold-duotone" width={16} />}
                    onPress={() => { setCreateBlockRoomTypeId(undefined); setShowCreateBlock(true); }}
                  >
                    Crear bloqueo para esta fecha
                  </Button>
                </div>
              )}

              <p className="text-xs text-white/35">
                Los agentes pueden usar esta información para ofrecer paquetes y planes a sus clientes.
              </p>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      <CreateBlockModal
        isOpen={showCreateBlock}
        onClose={() => setShowCreateBlock(false)}
        onCreated={() => { onBlocksChanged(); setShowCreateBlock(false); }}
        propertyId={slotDetail?.propertyId}
        properties={properties}
        defaultRoomTypeId={createBlockRoomTypeId}
        defaultDate={slotDetail?.date}
      />
    </>
  );
}

/* ─── BlocksPanel ──────────────────────────────────────────── */

function BlocksPanel({
  properties,
  operators,
  isOperador,
  myOperatorId,
  canManage,
  refreshKey,
  onBlocksChanged,
}: {
  properties: PropertyListItem[];
  operators: Operator[];
  isOperador: boolean;
  myOperatorId: number | null;
  canManage: boolean;
  refreshKey: number;
  onBlocksChanged: () => void;
}) {
  const [blocks, setBlocks] = useState<AvailabilityBlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "cancelled" | "released" | "all">("active");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Parameters<typeof adminApi.getAvailabilityBlocks>[0] = { status: statusFilter };
    const pid = parseInt(propertyId, 10);
    if (!Number.isNaN(pid) && pid > 0) params.property_id = pid;
    adminApi.getAvailabilityBlocks(params).then((res) => {
      setBlocks(res?.results ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [propertyId, statusFilter, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id: number) {
    setCancellingId(id);
    await adminApi.cancelAvailabilityBlock(id);
    setCancellingId(null);
    load();
    onBlocksChanged();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    await adminApi.deleteAvailabilityBlock(id);
    setDeletingId(null);
    load();
    onBlocksChanged();
  }

  return (
    <GlassCard className="p-0 overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-white/[0.06]">
        <Select
          label="Estado"
          size="sm"
          className="w-36"
          selectedKeys={[statusFilter]}
          onSelectionChange={(s) => setStatusFilter(Array.from(s)[0] as typeof statusFilter)}
          classNames={{ trigger: inputDark, label: "!text-white/65", value: "!text-white/92 font-medium", innerWrapper: "!text-white", selectorIcon: "!text-white/50", popoverContent: "bg-[#0f1220] border border-white/[0.1]" }}
        >
          <SelectItem key="active" className="text-white">Activos</SelectItem>
          <SelectItem key="cancelled" className="text-white">Cancelados</SelectItem>
          <SelectItem key="released" className="text-white">Liberados</SelectItem>
          <SelectItem key="all" className="text-white">Todos</SelectItem>
        </Select>
        <Select
          label="Propiedad"
          placeholder="Todas"
          size="sm"
          className="w-52"
          selectedKeys={propertyId ? [propertyId] : ["__all__"]}
          onSelectionChange={(s) => { const v = Array.from(s)[0] as string; setPropertyId(v === "__all__" ? "" : v); }}
          items={[{ id: "__all__", name: "Todas las propiedades" }, ...properties]}
          classNames={{ trigger: inputDark, label: "!text-white/65", value: "!text-white/92 font-medium", innerWrapper: "!text-white", selectorIcon: "!text-white/50", popoverContent: "bg-[#0f1220] border border-white/[0.1]" }}
        >
          {(p) => <SelectItem key={String(p.id)} className="text-white">{p.name}</SelectItem>}
        </Select>
        <Button size="sm" variant="flat" className="text-white/70 bg-white/[0.07] hover:bg-white/[0.12]" onPress={load} startContent={<Icon icon="solar:refresh-bold" width={16} />}>
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
        </div>
      ) : blocks.length === 0 ? (
        <div className="py-16 text-center text-white/50">
          No hay bloqueos con los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {["Propiedad", "Tipo habitación", "Desde", "Hasta", "Nota", "Estado", "Fuente", "Aloj.", ""].map((h, i) => (
                  <th key={i} className="text-left py-3 px-4 text-white/40 text-[0.6rem] uppercase tracking-[0.12em] font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blocks.map((blk) => {
                const st = statusLabel(blk.status);
                return (
                  <tr key={blk.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-white/85 font-medium text-sm">{blk.property_name}</td>
                    <td className="py-3 px-4 text-white/70 text-sm">{blk.room_type_name}</td>
                    <td className="py-3 px-4 text-white/70 text-sm whitespace-nowrap">{blk.start_date}</td>
                    <td className="py-3 px-4 text-white/70 text-sm whitespace-nowrap">{blk.end_date}</td>
                    <td className="py-3 px-4 text-white/55 text-sm max-w-[160px] truncate" title={blk.note}>{blk.note || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold border ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/50 text-xs">{sourceLabel(blk.source)}</td>
                    <td className="py-3 px-4 text-white/60 text-sm">{blk.locks_count ?? "—"}</td>
                    <td className="py-3 px-4">
                      {canManage && blk.source === "internal" && blk.status === "active" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="flat"
                            isIconOnly
                            className="h-7 w-7 min-w-7 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            title="Cancelar bloqueo"
                            isLoading={cancellingId === blk.id}
                            onPress={() => handleCancel(blk.id)}
                          >
                            <Icon icon="solar:close-circle-bold" width={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            isIconOnly
                            className="h-7 w-7 min-w-7 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            title="Eliminar bloqueo"
                            isLoading={deletingId === blk.id}
                            onPress={() => handleDelete(blk.id)}
                          >
                            <Icon icon="solar:trash-bin-trash-bold" width={14} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}

/* ─── AvailabilityList (main) ──────────────────────────────── */

export function AvailabilityList() {
  const { role, me } = useAdmin();
  const isOperador = role === "operador";
  const myOperatorId = me?.operator_id ?? null;
  const canManage = role === "super_admin" || role === "operador";

  const [list, setList] = useState<AvailabilityItem[]>([]);
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.toISOString().slice(0, 10);
  });
  const [propertyId, setPropertyId] = useState("");
  const [operatorId, setOperatorId] = useState(() =>
    isOperador && myOperatorId ? String(myOperatorId) : ""
  );
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [slotDetail, setSlotDetail] = useState<SlotDetail | null>(null);
  const [showCreateBlock, setShowCreateBlock] = useState(false);
  const [blocksRefreshKey, setBlocksRefreshKey] = useState(0);

  function load() {
    setLoading(true);
    const params: { date_from?: string; date_to?: string; property_id?: number; operator_id?: number } = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const pid = parseInt(propertyId, 10);
    if (!Number.isNaN(pid)) params.property_id = pid;
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
      isOperador ? Promise.resolve(null) : adminApi.getOperators(),
    ]).then(([propsRes, opsRes]) => {
      if (cancelled) return;
      const props = propsRes?.results ?? [];
      const ops = opsRes?.results ?? [];
      const filteredProps = isOperador && me?.operator_name
        ? props.filter((p) => !p.operator_name || p.operator_name === me.operator_name)
        : props;
      setProperties([...new Map(filteredProps.map((p) => [p.id, p])).values()]);
      setOperators([...new Map(ops.map((o) => [o.id, o])).values()]);
    });
    return () => { cancelled = true; };
  }, [isOperador, myOperatorId, me?.operator_name]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Computed calendar data */
  const { dates, propertyRows } = useMemo(() => {
    const dateSet = new Set<string>();
    const byProperty = new Map<
      number,
      {
        name: string;
        byDate: Map<string, number>;
        byDateTotal: Map<string, number>;
        byDatePriceRange: Map<string, { min: number; max: number; currency: string }>;
      }
    >();
    for (const a of list) {
      dateSet.add(a.date);
      if (!byProperty.has(a.property_id)) {
        byProperty.set(a.property_id, {
          name: a.property_name,
          byDate: new Map(),
          byDateTotal: new Map(),
          byDatePriceRange: new Map(),
        });
      }
      const row = byProperty.get(a.property_id)!;
      row.byDate.set(a.date, (row.byDate.get(a.date) ?? 0) + a.available);
      row.byDateTotal.set(a.date, (row.byDateTotal.get(a.date) ?? 0) + (a.total_rooms ?? 0));
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
    return { dates: sortedDates, propertyRows: sortedProps };
  }, [list]);

  /* Slot detail map */
  const slotDetailMap = useMemo(() => {
    const map = new Map<string, SlotDetail>();
    for (const a of list) {
      const key = `${a.property_id}-${a.date}`;
      if (!map.has(key)) {
        map.set(key, {
          propertyId: a.property_id,
          propertyName: a.property_name,
          date: a.date,
          total: 0,
          totalRooms: 0,
          locked: 0,
          roomTypes: [],
        });
      }
      const slot = map.get(key)!;
      slot.totalRooms += a.total_rooms ?? 0;
      slot.locked += a.locked ?? 0;
      slot.roomTypes.push({
        roomTypeId: a.room_type_id,
        roomTypeName: a.room_type_name,
        available: a.available,
        totalRooms: a.total_rooms ?? 0,
        locked: a.locked ?? 0,
        source: a.source === "pms" ? "PMS" : "Interno",
        pricePerNight: a.price_per_night,
        currency: a.currency,
      });
      slot.total += a.available;
      if (a.currency) slot.currency = a.currency;
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

  const getSlotDetail = useCallback(
    (propId: number, d: string) => slotDetailMap.get(`${propId}-${d}`) ?? null,
    [slotDetailMap]
  );

  const hasAvailability = useMemo(() => list.some((a) => a.available > 0), [list]);

  function handleBlocksChanged() {
    setBlocksRefreshKey((k) => k + 1);
    load();
  }

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
          {canManage && (
            <Button
              size="sm"
              className="ml-auto bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/25"
              startContent={<Icon icon="solar:lock-bold-duotone" width={16} />}
              onPress={() => setShowCreateBlock(true)}
            >
              Crear bloqueo
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {!isOperador && (
            <Select
              label="Operador"
              placeholder="Todos"
              selectedKeys={operatorId ? [operatorId] : ["__all__"]}
              onSelectionChange={(s) => { const v = Array.from(s)[0] as string; setOperatorId(v === "__all__" ? "" : v); }}
              size="sm"
              className="w-48"
              items={[{ id: "__all__", name: "Todos los operadores" }, ...operators]}
              classNames={{ trigger: inputDark, label: "!text-white/65", value: "!text-white/92 font-medium", innerWrapper: "!text-white", selectorIcon: "!text-white/50", popoverContent: "bg-[#0f1220] border border-white/[0.1]" }}
            >
              {(item) => <SelectItem key={String(item.id)} className="text-white">{item.name}</SelectItem>}
            </Select>
          )}
          <Select
            label="Propiedad"
            placeholder="Todas"
            selectedKeys={propertyId ? [propertyId] : ["__all__"]}
            onSelectionChange={(s) => { const v = Array.from(s)[0] as string; setPropertyId(v === "__all__" ? "" : v); }}
            size="sm"
            className="w-56"
            aria-label="Filtrar por propiedad"
            items={[{ id: "__all__", name: "Todas las propiedades" }, ...properties]}
            classNames={{ trigger: inputDark, label: "!text-white/65", value: "!text-white/92 font-medium", innerWrapper: "!text-white", selectorIcon: "!text-white/50", popoverContent: "bg-[#0f1220] border border-white/[0.1]" }}
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
            classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38", label: "!text-white/65" }}
          />
          <Input
            label="Hasta"
            type="date"
            value={dateTo}
            onValueChange={setDateTo}
            size="sm"
            className="w-36"
            classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38", label: "!text-white/65" }}
          />
          <Button className="btn-newayzi-primary" size="sm" onPress={load} startContent={<Icon icon="solar:magnifer-outline" width={18} />}>
            Filtrar
          </Button>
        </div>
      </GlassCard>

      {/* Tabs */}
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
        <Tab key="calendar" title={<span className="flex items-center gap-2"><Icon icon="solar:calendar-outline" width={18} />Mapa calendario</span>} />
        <Tab key="table" title={<span className="flex items-center gap-2"><Icon icon="solar:list-outline" width={18} />Lista detallada</span>} />
        <Tab key="blocks" title={<span className="flex items-center gap-2"><Icon icon="solar:lock-outline" width={18} />Bloqueos</span>} />
      </Tabs>

      {viewMode === "blocks" ? (
        <BlocksPanel
          properties={properties}
          operators={operators}
          isOperador={isOperador}
          myOperatorId={myOperatorId}
          canManage={canManage}
          refreshKey={blocksRefreshKey}
          onBlocksChanged={handleBlocksChanged}
        />
      ) : loading ? (
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
                          className="min-w-[110px] w-[110px] border-b border-white/[0.08] bg-white/[0.04] px-2 py-3 text-center text-xs font-medium text-white/60 whitespace-nowrap"
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
                          const total = row.byDateTotal.get(d) ?? 0;
                          const priceRange = row.byDatePriceRange.get(d);
                          const detail = getSlotDetail(row.id, d);
                          const hasDetail = detail && detail.roomTypes.length > 0;
                          return (
                            <td
                              key={d}
                              className={`border border-white/[0.06] px-2 py-2 text-center text-sm font-semibold align-top ${getAvailabilityColor(avail, total)} ${hasDetail ? "cursor-pointer hover:ring-2 hover:ring-[#5e2cec]/50 hover:ring-inset transition-all" : ""}`}
                              role={hasDetail ? "button" : undefined}
                              tabIndex={hasDetail ? 0 : undefined}
                              onClick={hasDetail ? () => setSlotDetail(detail) : undefined}
                              onKeyDown={hasDetail ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSlotDetail(detail); } } : undefined}
                            >
                              <div className="flex flex-col items-center gap-0.5 min-w-0">
                                <span className="text-base font-bold leading-tight">
                                  {avail}
                                  {total > 0 && <span className="text-[10px] font-normal opacity-60">/{total}</span>}
                                </span>
                                {priceRange && (
                                  <span className="text-[9px] font-medium text-white/60">
                                    {formatPriceRangeCompact(priceRange.min, priceRange.max, priceRange.currency)}
                                  </span>
                                )}
                                {total > 0 && <AvailabilityBar available={avail} total={total} />}
                                {hasDetail && (
                                  detail.roomTypes.length === 1 ? (
                                    <span className="w-full text-[9px] font-normal opacity-70 leading-tight break-words line-clamp-2 mt-0.5">
                                      {detail.roomTypes[0].roomTypeName}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-normal opacity-60 mt-0.5">{detail.roomTypes.length} tipos</span>
                                  )
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.08] px-4 py-3 text-xs text-white/50">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500/40" /> Alta disponibilidad (&ge;50%)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-500/40" /> Media (25-49%)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-orange-500/40" /> Baja (&lt;25%)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-500/40" /> Sin disponibilidad</span>
                <span className="flex items-center gap-1.5 text-[#9b74ff]"><Icon icon="solar:mouse-minimalistic-outline" width={14} /> Clic en slot para ver detalle</span>
              </div>
            </>
          )}
        </GlassCard>
      ) : (
        /* Vista tabla detallada */
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {["Propiedad", "Tipo habitación", "Fecha", "Total", "Disp.", "Bloq.", "% Disp.", "Precio/noche", "Fuente"].map((h, i) => (
                    <th key={i} className="text-left py-4 px-4 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-white/50">
                      No hay datos de disponibilidad. Ajusta filtros o espera sincronización PMS.
                    </td>
                  </tr>
                ) : (
                  list.map((a) => {
                    const total = a.total_rooms ?? 0;
                    const locked = a.locked ?? 0;
                    const pct = total > 0 ? Math.round((a.available / total) * 100) : null;
                    return (
                      <tr
                        key={`${a.property_id}-${a.room_type_id}-${a.date}`}
                        className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3 px-4 text-white/85 font-medium text-sm">{a.property_name}</td>
                        <td className="py-3 px-4 text-white/70 text-sm">{a.room_type_name}</td>
                        <td className="py-3 px-4 text-white/70 text-sm whitespace-nowrap">{a.date}</td>
                        <td className="py-3 px-4 text-white/60 text-sm">{total || "—"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold border ${getAvailabilityColor(a.available, total)}`}>
                            {a.available}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {locked > 0 ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold border bg-red-500/15 text-red-300 border-red-500/25">
                              {locked}
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {pct !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-white/10">
                                <div
                                  className={`h-full rounded-full ${pct >= 50 ? "bg-emerald-500" : pct >= 25 ? "bg-amber-500" : pct > 0 ? "bg-orange-500" : "bg-red-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-white/55">{pct}%</span>
                            </div>
                          ) : <span className="text-white/30">—</span>}
                        </td>
                        <td className="py-3 px-4 text-white/70 text-sm whitespace-nowrap">
                          {a.price_per_night && a.currency ? formatPrice(a.price_per_night, a.currency) : "—"}
                        </td>
                        <td className="py-3 px-4 text-white/50 text-xs capitalize">{a.source}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Slot detail modal */}
      <SlotDetailModal
        slotDetail={slotDetail}
        onClose={() => setSlotDetail(null)}
        canManage={canManage}
        properties={properties}
        onBlocksChanged={handleBlocksChanged}
      />

      {/* Global create block modal */}
      <CreateBlockModal
        isOpen={showCreateBlock}
        onClose={() => setShowCreateBlock(false)}
        onCreated={() => { handleBlocksChanged(); setShowCreateBlock(false); }}
        properties={properties}
      />
    </div>
  );
}

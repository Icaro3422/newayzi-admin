"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Switch, Spinner, addToast, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  adminApi,
  type PropertyPricingConfig,
  type PropertyFixedWeekSlot,
} from "@/lib/admin-api";

// ─── UI primitives ────────────────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-400/20 border border-white/10 flex items-center justify-center flex-shrink-0">
        <Icon icon={icon} className="text-amber-400 text-lg" />
      </div>
      <div>
        <h2 className="text-base font-bold text-white/90">{title}</h2>
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.06] last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <p className="text-xs text-white/45 mt-0.5">{description}</p>
      </div>
      <Switch isSelected={checked} onValueChange={onChange} isDisabled={disabled} size="sm" />
    </div>
  );
}

// ─── Markup preview ───────────────────────────────────────────────────────────

function MarkupPreview({
  displayMarkup,
  sellingMarkup,
}: {
  displayMarkup: string;
  sellingMarkup: string;
}) {
  const dm = parseFloat(displayMarkup);
  const sm = parseFloat(sellingMarkup);
  if (!isFinite(dm) || !isFinite(sm) || dm < 1) return null;

  const exampleRaw = 10_000_000;
  const original = Math.round(exampleRaw * dm);
  const selling = Math.round(exampleRaw * sm);
  const discountPct = dm > sm && dm > 0 ? ((dm - sm) / dm) * 100 : 0;

  const fmt = (n: number) =>
    n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

  return (
    <div className="mt-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 flex flex-col gap-2">
      <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">Vista previa (base $10M)</p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm line-through text-white/35">{fmt(original)}</span>
        <span className="text-base font-bold text-emerald-400">{fmt(selling)}</span>
        {discountPct > 0 && (
          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 font-semibold">
            -{discountPct.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs text-white/35">
        Tarifa base × {dm.toFixed(4)} = precio tachado · Tarifa base × {sm.toFixed(4)} = precio real
      </p>
    </div>
  );
}

// ─── Week Slots list ──────────────────────────────────────────────────────────

function WeekSlotRow({
  slot,
  onDelete,
  onEdit,
  readOnly,
}: {
  slot: PropertyFixedWeekSlot;
  onDelete: (id: number) => void;
  onEdit: (slot: PropertyFixedWeekSlot) => void;
  readOnly: boolean;
}) {
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-white/[0.05] last:border-0 group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          <Icon icon="lucide:calendar-days" className="text-amber-400/80 text-sm" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-white/85 font-medium truncate">
            {fmt(slot.check_in)} → {fmt(slot.check_out)}
            <span className="ml-2 text-xs text-white/35">{slot.nights} noches</span>
            {slot.season && <span className="ml-1 text-xs text-white/30">· Temp. {slot.season}</span>}
          </p>
          {slot.note && <p className="text-xs text-white/40 truncate">{slot.note}</p>}
        </div>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(slot)}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/50 hover:text-white/80 transition-colors"
            title="Editar nota"
          >
            <Icon icon="lucide:pen" className="text-sm" />
          </button>
          <button
            onClick={() => onDelete(slot.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
            title="Eliminar slot"
          >
            <Icon icon="lucide:trash-2" className="text-sm" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add Slot modal ───────────────────────────────────────────────────────────

function AddSlotModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { check_in: string; check_out: string; note?: string; season?: number | null }) => Promise<void>;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [note, setNote] = useState("");
  const [season, setSeason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!checkIn || !checkOut) return;
    setSaving(true);
    try {
      await onSave({
        check_in: checkIn,
        check_out: checkOut,
        note: note.trim() || undefined,
        season: season ? parseInt(season) : null,
      });
      setCheckIn(""); setCheckOut(""); setNote(""); setSeason("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" backdrop="blur">
      <ModalContent className="bg-[#161624] border border-white/[0.09]">
        <ModalHeader className="text-white/90 text-sm font-bold">Añadir semana fija</ModalHeader>
        <ModalBody className="gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Check-in</label>
              <input
                type="date"
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.10] text-white/85 text-sm px-3 py-2 outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Check-out</label>
              <input
                type="date"
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.10] text-white/85 text-sm px-3 py-2 outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
          <Input
            label="Nota (opcional)"
            placeholder="Ej: Navidad 2026"
            value={note}
            onValueChange={setNote}
            size="sm"
            classNames={{ input: "text-sm", inputWrapper: "bg-white/[0.06] border border-white/[0.10]" }}
          />
          <Input
            label="Temporada (año)"
            placeholder="Ej: 2026"
            value={season}
            onValueChange={setSeason}
            size="sm"
            type="number"
            classNames={{ input: "text-sm", inputWrapper: "bg-white/[0.06] border border-white/[0.10]" }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" size="sm" onPress={onClose} className="text-white/60">Cancelar</Button>
          <Button
            size="sm"
            className="bg-amber-500/20 text-amber-400 border border-amber-500/30"
            onPress={handleSave}
            isLoading={saving}
            isDisabled={!checkIn || !checkOut}
          >
            Añadir slot
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ─── Edit Slot modal ──────────────────────────────────────────────────────────

function EditSlotModal({
  slot,
  onClose,
  onSave,
}: {
  slot: PropertyFixedWeekSlot | null;
  onClose: () => void;
  onSave: (id: number, data: { note: string; season: number | null }) => Promise<void>;
}) {
  const [note, setNote] = useState(slot?.note ?? "");
  const [season, setSeason] = useState(slot?.season?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNote(slot?.note ?? "");
    setSeason(slot?.season?.toString() ?? "");
  }, [slot]);

  if (!slot) return null;

  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(slot.id, { note: note.trim(), season: season ? parseInt(season) : null });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!slot} onClose={onClose} size="sm" backdrop="blur">
      <ModalContent className="bg-[#161624] border border-white/[0.09]">
        <ModalHeader className="text-white/90 text-sm font-bold">
          Editar {fmt(slot.check_in)} → {fmt(slot.check_out)}
        </ModalHeader>
        <ModalBody className="gap-3">
          <Input
            label="Nota"
            placeholder="Ej: Semana 1 Navidad"
            value={note}
            onValueChange={setNote}
            size="sm"
            classNames={{ input: "text-sm", inputWrapper: "bg-white/[0.06] border border-white/[0.10]" }}
          />
          <Input
            label="Temporada (año)"
            placeholder="Ej: 2026"
            value={season}
            onValueChange={setSeason}
            size="sm"
            type="number"
            classNames={{ input: "text-sm", inputWrapper: "bg-white/[0.06] border border-white/[0.10]" }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" size="sm" onPress={onClose} className="text-white/60">Cancelar</Button>
          <Button
            size="sm"
            className="bg-amber-500/20 text-amber-400 border border-amber-500/30"
            onPress={handleSave}
            isLoading={saving}
          >
            Guardar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function PropertyPricingConfigPanel({
  propertyId,
  readOnly,
}: {
  propertyId: number;
  readOnly: boolean;
}) {
  const [config, setConfig] = useState<PropertyPricingConfig | null>(null);
  const [slots, setSlots] = useState<PropertyFixedWeekSlot[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Markup form state
  const [useCustomMarkup, setUseCustomMarkup] = useState(false);
  const [displayMarkup, setDisplayMarkup] = useState("");
  const [sellingMarkup, setSellingMarkup] = useState("");

  // Slots UI
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<PropertyFixedWeekSlot | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const cfg = await adminApi.getPricingConfig(propertyId);
      if (cfg) {
        setConfig(cfg);
        setUseCustomMarkup(cfg.display_price_markup !== null);
        setDisplayMarkup(cfg.display_price_markup ?? "");
        setSellingMarkup(cfg.selling_price_markup ?? "");
      }
    } finally {
      setLoadingConfig(false);
    }
  }, [propertyId]);

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const res = await adminApi.getWeekSlots(propertyId);
      setSlots(res?.results ?? []);
    } finally {
      setLoadingSlots(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadConfig();
    loadSlots();
  }, [loadConfig, loadSlots]);

  // ── Config save ─────────────────────────────────────────────────────────────
  const handleToggle = async (field: keyof PropertyPricingConfig, value: boolean) => {
    if (!config) return;
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    try {
      const updated = await adminApi.patchPricingConfig(propertyId, { [field]: value });
      setConfig(updated);
    } catch (e) {
      setConfig(config);
      addToast({ title: "Error", description: (e as Error).message, color: "danger" });
    }
  };

  const handleSaveMarkup = async () => {
    setSavingConfig(true);
    try {
      const payload: Partial<PropertyPricingConfig> = useCustomMarkup
        ? {
            display_price_markup: displayMarkup || null,
            selling_price_markup: sellingMarkup || null,
          }
        : {
            display_price_markup: null,
            selling_price_markup: null,
          };
      const updated = await adminApi.patchPricingConfig(propertyId, payload);
      setConfig(updated);
      setUseCustomMarkup(updated.display_price_markup !== null);
      addToast({ title: "Guardado", description: "Configuración de markup actualizada.", color: "success" });
    } catch (e) {
      addToast({ title: "Error", description: (e as Error).message, color: "danger" });
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Slot ops ─────────────────────────────────────────────────────────────────
  const handleCreateSlot = async (data: { check_in: string; check_out: string; note?: string; season?: number | null }) => {
    try {
      const slot = await adminApi.createWeekSlot(propertyId, data);
      setSlots(prev => {
        const filtered = prev.filter(s => s.id !== slot.id);
        return [...filtered, slot].sort((a, b) => a.check_in.localeCompare(b.check_in));
      });
      addToast({ title: "Slot añadido", color: "success" });
    } catch (e) {
      addToast({ title: "Error", description: (e as Error).message, color: "danger" });
      throw e;
    }
  };

  const handleEditSlot = async (id: number, data: { note: string; season: number | null }) => {
    try {
      const updated = await adminApi.patchWeekSlot(propertyId, id, data);
      setSlots(prev => prev.map(s => (s.id === id ? updated : s)));
      addToast({ title: "Slot actualizado", color: "success" });
    } catch (e) {
      addToast({ title: "Error", description: (e as Error).message, color: "danger" });
      throw e;
    }
  };

  const handleDeleteSlot = async (id: number) => {
    try {
      await adminApi.deleteWeekSlot(propertyId, id);
      setSlots(prev => prev.filter(s => s.id !== id));
      addToast({ title: "Slot eliminado", color: "success" });
    } catch (e) {
      addToast({ title: "Error", description: (e as Error).message, color: "danger" });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Eliminar todos los slots de semanas fijas de esta propiedad?")) return;
    setDeletingAll(true);
    try {
      const res = await adminApi.deleteAllWeekSlots(propertyId);
      setSlots([]);
      addToast({ title: `${res.deleted} slots eliminados`, color: "success" });
    } catch (e) {
      addToast({ title: "Error", description: (e as Error).message, color: "danger" });
    } finally {
      setDeletingAll(false);
    }
  };

  // ── Group slots by season ───────────────────────────────────────────────────
  const slotsBySeason = slots.reduce<Record<string, PropertyFixedWeekSlot[]>>((acc, s) => {
    const key = s.season ? String(s.season) : "Sin temporada";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loadingConfig) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-white/40">
          <Spinner size="sm" />
          <span className="text-sm">Cargando configuración…</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Pricing markup ──────────────────────────────────────────────────── */}
      <GlassCard>
        <SectionHeader
          icon="lucide:trending-up"
          title="Configuración de precio"
          subtitle="Markups personalizados por propiedad. Activa solo si este hotel tiene lógica de descuento visual diferente al global."
        />

        {/* Toggles de comportamiento */}
        {config && (
          <div className="mb-5">
            <ToggleRow
              label="Restringir a semanas del Excel"
              description="Solo cotizar noches cubiertas por el inventario manual importado (no usar tarifa base fuera de esas semanas)."
              checked={config.restrict_pricing_to_manual_weeks}
              onChange={v => handleToggle("restrict_pricing_to_manual_weeks", v)}
              disabled={readOnly}
            />
            <ToggleRow
              label="Forzar semanas exactas en búsqueda"
              description="Solo mostrar la propiedad cuando las fechas solicitadas coincidan exactamente con uno de los slots registrados abajo."
              checked={config.enforce_fixed_week_slots}
              onChange={v => handleToggle("enforce_fixed_week_slots", v)}
              disabled={readOnly}
            />
            <ToggleRow
              label="Visualización simplificada de habitaciones"
              description='Muestra las habitaciones al huésped solo como "Para X personas" sin nombre, imagen ni descripción. Ideal para propiedades con inventario manual básico (ej. Santa Clara Sofitel).'
              checked={config.simple_room_display}
              onChange={v => handleToggle("simple_room_display", v)}
              disabled={readOnly}
            />
          </div>
        )}

        {/* Markup custom */}
        <div className="border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-white/85">Markup personalizado</p>
              <p className="text-xs text-white/45 mt-0.5">
                Crea un descuento visual: precio tachado más alto + precio real más bajo.
              </p>
            </div>
            <Switch
              isSelected={useCustomMarkup}
              onValueChange={v => {
                setUseCustomMarkup(v);
                if (!v) { setDisplayMarkup(""); setSellingMarkup(""); }
              }}
              isDisabled={readOnly}
              size="sm"
            />
          </div>

          {useCustomMarkup && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Markup precio original (tachado)</label>
                  <Input
                    placeholder="Ej: 1.15"
                    value={displayMarkup}
                    onValueChange={setDisplayMarkup}
                    size="sm"
                    description="Ej: 1.15 → tarifa × 115%"
                    isDisabled={readOnly}
                    classNames={{ input: "text-sm font-mono", inputWrapper: "bg-white/[0.06] border border-white/[0.10]" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Markup precio real (cobrado)</label>
                  <Input
                    placeholder="Ej: 1.12"
                    value={sellingMarkup}
                    onValueChange={setSellingMarkup}
                    size="sm"
                    description="Ej: 1.12 → tarifa × 112%"
                    isDisabled={readOnly}
                    classNames={{ input: "text-sm font-mono", inputWrapper: "bg-white/[0.06] border border-white/[0.10]" }}
                  />
                </div>
              </div>

              {displayMarkup && sellingMarkup && (
                <MarkupPreview displayMarkup={displayMarkup} sellingMarkup={sellingMarkup} />
              )}
            </div>
          )}

          {!readOnly && (
            <div className="flex justify-end mt-4">
              <Button
                size="sm"
                className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                onPress={handleSaveMarkup}
                isLoading={savingConfig}
              >
                <Icon icon="lucide:save" className="text-sm mr-1" />
                Guardar markup
              </Button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── Fixed Week Slots ─────────────────────────────────────────────────── */}
      <GlassCard>
        <div className="flex items-start justify-between mb-5">
          <SectionHeader
            icon="lucide:calendar-range"
            title="Semanas fijas"
            subtitle={`${slots.length} slot${slots.length !== 1 ? "s" : ""} registrado${slots.length !== 1 ? "s" : ""}. Se generan automáticamente al importar el Excel de inventario.`}
          />
          {!readOnly && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {slots.length > 0 && (
                <Button
                  size="sm"
                  variant="flat"
                  className="text-red-400/80 border border-red-500/20 hover:bg-red-500/10"
                  onPress={handleDeleteAll}
                  isLoading={deletingAll}
                >
                  <Icon icon="lucide:trash-2" className="text-sm mr-1" />
                  Borrar todos
                </Button>
              )}
              <Button
                size="sm"
                className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                onPress={() => setAddSlotOpen(true)}
              >
                <Icon icon="lucide:plus" className="text-sm mr-1" />
                Añadir slot
              </Button>
            </div>
          )}
        </div>

        {loadingSlots ? (
          <div className="flex items-center gap-2 text-white/40 py-4">
            <Spinner size="sm" />
            <span className="text-sm">Cargando slots…</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
              <Icon icon="lucide:calendar-x" className="text-white/25 text-xl" />
            </div>
            <p className="text-sm text-white/40">No hay semanas fijas configuradas.</p>
            <p className="text-xs text-white/25 mt-1">
              Importa el Excel de inventario manual o añade slots manualmente.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {Object.entries(slotsBySeason)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([seasonLabel, seasonSlots]) => (
                <div key={seasonLabel} className="mb-4">
                  <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-2">
                    Temporada {seasonLabel} · {seasonSlots.length} semana{seasonSlots.length !== 1 ? "s" : ""}
                  </p>
                  {seasonSlots.map(slot => (
                    <WeekSlotRow
                      key={slot.id}
                      slot={slot}
                      onDelete={handleDeleteSlot}
                      onEdit={setEditingSlot}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              ))}
          </div>
        )}
      </GlassCard>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <AddSlotModal
        isOpen={addSlotOpen}
        onClose={() => setAddSlotOpen(false)}
        onSave={handleCreateSlot}
      />
      <EditSlotModal
        slot={editingSlot}
        onClose={() => setEditingSlot(null)}
        onSave={handleEditSlot}
      />
    </div>
  );
}

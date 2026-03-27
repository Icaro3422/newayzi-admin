"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Spinner,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Chip,
  Switch,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  adminApi,
  type AgencyDetail,
  type AgentWallet,
  type Operator,
  type PropertyListItem,
  LEVEL_OPTIONS,
  WALLET_REASON_OPTIONS,
  type WalletMovementReason,
  type LoyaltyLevelValue,
} from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

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

function formatCurrency(value: string | number | undefined): string {
  if (value === undefined || value === "") return "—";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPoints(pts: number) {
  return new Intl.NumberFormat("es-CO").format(Math.round(pts));
}

const LEVEL_COLORS: Record<string, string> = {
  member: "bg-white/10 text-white/70 border-white/20",
  plus: "bg-blue-500/20 text-blue-300 border-blue-400/30",
  premium: "bg-[#b89eff]/20 text-[#b89eff] border-[#b89eff]/30",
};

const REASON_ICON: Record<string, string> = {
  bonus: "solar:gift-bold",
  adjustment: "solar:pen-bold",
  cashback: "solar:cash-out-bold",
  redemption: "solar:ticket-sale-bold",
  booking_commission: "solar:document-bold",
  correction: "solar:refresh-circle-bold",
};

// ─── Wallet section ───────────────────────────────────────────────────────────

function AgencyWalletSection({ agencyId, isSuperAdmin }: { agencyId: number; isSuperAdmin: boolean }) {
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPreset, setAdjustPreset] = useState<WalletMovementReason>("bonus");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState<WalletMovementReason>("bonus");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustLevel, setAdjustLevel] = useState<LoyaltyLevelValue | "">("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAgencyWallet(agencyId);
      setWallet(data);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  function openAdjustModal(preset: WalletMovementReason = "bonus") {
    setAdjustPreset(preset);
    setAdjustReason(preset);
    setAdjustAmount("");
    setAdjustNote("");
    setAdjustLevel("");
    setSaveError(null);
    setAdjustOpen(true);
  }

  async function handleSave() {
    if (!adjustAmount.trim() && !adjustLevel) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: { amount?: number; reason?: WalletMovementReason; note?: string; level?: LoyaltyLevelValue } = {};
      if (adjustAmount.trim()) payload.amount = parseFloat(adjustAmount);
      if (adjustLevel) payload.level = adjustLevel as LoyaltyLevelValue;
      payload.reason = adjustReason;
      if (adjustNote.trim()) payload.note = adjustNote.trim();
      const updated = await adminApi.adjustAgencyWallet(agencyId, payload);
      setWallet(updated);
      setAdjustOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      const match = msg.match(/\{.*\}/);
      if (match) {
        try {
          const j = JSON.parse(match[0]) as { detail?: string };
          if (j.detail) { setSaveError(j.detail); return; }
        } catch { /* noop */ }
      }
      setSaveError(msg.replace(/^API \d+: /, "").slice(0, 200));
    } finally {
      setSaving(false);
    }
  }

  const modalClassNames = {
    base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/50 max-h-[90vh] overflow-hidden flex flex-col",
    header: "border-b border-white/[0.08] !text-white font-sora font-bold text-lg shrink-0",
    body: "!text-white/95 !bg-transparent overflow-y-auto",
    footer: "border-t border-white/[0.08] !bg-transparent gap-2 shrink-0",
    closeButton: "!text-white/90 hover:!bg-white/10 hover:!text-white rounded-full",
    backdrop: "!bg-black/70 backdrop-blur-md",
    wrapper: "!bg-transparent",
  };

  if (loading) {
    return (
      <GlassCard className="flex justify-center items-center py-10">
        <Spinner size="md" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
      </GlassCard>
    );
  }

  if (!wallet) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-white/50">
          <Icon icon="solar:wallet-outline" width={20} />
          <p className="text-sm">No se pudo cargar la billetera.</p>
        </div>
      </GlassCard>
    );
  }

  if (!wallet.exists) {
    return (
      <GlassCard>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Icon icon="solar:wallet-outline" width={40} className="text-white/30" />
          <p className="text-sm text-white/50">
            {(wallet as { detail?: string }).detail ?? "Este agente aún no tiene billetera Rewards. Se creará automáticamente cuando se conecte."}
          </p>
        </div>
      </GlassCard>
    );
  }

  const isBonus = adjustPreset === "bonus";

  return (
    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="font-sora font-bold text-white text-base flex items-center gap-2">
          <Icon icon="solar:star-bold" width={18} className="text-[#b89eff]" />
          Newayzi Rewards
        </h3>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30"
              startContent={<Icon icon="solar:gift-bold" width={15} />}
              onPress={() => openAdjustModal("bonus")}
            >
              Bono
            </Button>
            <Button
              size="sm"
              className="bg-white/10 border border-white/20 text-white/80 hover:bg-white/15"
              startContent={<Icon icon="solar:pen-bold" width={15} />}
              onPress={() => openAdjustModal("adjustment")}
            >
              Ajustar
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl bg-[#5e2cec]/15 border border-[#5e2cec]/30 p-4 text-center">
          <p className="text-2xl font-bold text-white font-sora">{formatPoints(wallet.points)}</p>
          <p className="text-xs text-white/50 mt-0.5">Puntos</p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold border ${LEVEL_COLORS[wallet.level] ?? LEVEL_COLORS.member}`}
          >
            {wallet.level_label}
          </span>
          <p className="text-xs text-white/50 mt-1.5">Nivel</p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-white font-sora">{wallet.completed_bookings}</p>
          <p className="text-xs text-white/50 mt-0.5">Reservas</p>
        </div>
      </div>

      {/* Movements */}
      <h4 className="text-sm font-semibold text-white/70 mb-3">Últimos movimientos</h4>
      {wallet.movements.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-4">Sin movimientos aún.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {wallet.movements.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 rounded-full p-1.5 bg-white/10">
                  <Icon
                    icon={REASON_ICON[m.reason] ?? "solar:wallet-outline"}
                    width={14}
                    className="text-[#b89eff]"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-white/90 font-medium truncate">{m.reason_label}</p>
                  {m.note && (
                    <p className="text-[11px] text-white/45 truncate">{m.note}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <span
                  className={`text-sm font-semibold ${m.amount >= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {m.amount >= 0 ? "+" : ""}{formatPoints(m.amount)}
                </span>
                <p className="text-[10px] text-white/35">
                  {new Date(m.created_at).toLocaleDateString("es-CO")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjust modal */}
      <Modal
        isOpen={adjustOpen}
        onOpenChange={(o) => { setAdjustOpen(o); if (!o) setSaveError(null); }}
        size="md"
        backdrop="blur"
        classNames={modalClassNames}
      >
        <ModalContent>
          <ModalHeader>
            {isBonus ? (
              <span className="flex items-center gap-2">
                <Icon icon="solar:gift-bold" width={20} className="text-emerald-300" />
                Dar bono de puntos
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon icon="solar:pen-bold" width={20} className="text-[#b89eff]" />
                Ajustar billetera
              </span>
            )}
          </ModalHeader>
          <ModalBody className="space-y-3 py-4">
            {saveError && (
              <div className="rounded-xl bg-red-500/20 border border-red-400/30 p-3 text-sm text-red-200">
                {saveError}
              </div>
            )}
            <p className="text-xs text-white/50">
              Saldo actual: <strong className="text-white">{formatPoints(wallet.points)} pts</strong>
            </p>
            <Input
              label="Puntos (positivo = añadir, negativo = restar)"
              value={adjustAmount}
              onValueChange={setAdjustAmount}
              type="number"
              classNames={{
                inputWrapper: "rounded-xl border",
                input: "!text-white/95",
                label: "!text-white/70",
              }}
            />
            <Select
              label="Razón del movimiento"
              selectedKeys={[adjustReason]}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0] as WalletMovementReason;
                if (val) setAdjustReason(val);
              }}
              classNames={{
                trigger: "rounded-xl border border-white/20 bg-white/5 !text-white/90 hover:border-white/40",
                value: "!text-white/90",
                label: "!text-white/70",
                popoverContent: "!bg-[#181c2e] border border-white/10 rounded-xl",
              }}
            >
              {WALLET_REASON_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  classNames={{ base: "!text-white/90 hover:!bg-white/10" }}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
            <Select
              label="Cambiar nivel (opcional)"
              selectedKeys={adjustLevel ? [adjustLevel] : []}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0] as LoyaltyLevelValue | "";
                setAdjustLevel(val ?? "");
              }}
              classNames={{
                trigger: "rounded-xl border border-white/20 bg-white/5 !text-white/90 hover:border-white/40",
                value: "!text-white/90",
                label: "!text-white/70",
                popoverContent: "!bg-[#181c2e] border border-white/10 rounded-xl",
              }}
            >
              {LEVEL_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  classNames={{ base: "!text-white/90 hover:!bg-white/10" }}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
            <Input
              label="Nota (opcional)"
              value={adjustNote}
              onValueChange={setAdjustNote}
              placeholder="Ej: Premio por cierre del mes"
              classNames={{
                inputWrapper: "rounded-xl border",
                input: "!text-white/95",
                label: "!text-white/70",
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setAdjustOpen(false)}
              className="!text-white hover:!bg-white/[0.12] !bg-white/[0.1] border border-white/[0.2]"
            >
              Cancelar
            </Button>
            <Button
              className={isBonus ? "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold" : "btn-newayzi-primary"}
              onPress={handleSave}
              isLoading={saving}
              isDisabled={!adjustAmount.trim() && !adjustLevel}
            >
              {isBonus ? "Dar bono" : "Guardar"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </GlassCard>
  );
}

// ─── Gestionar datos / eliminar (operador dueño o super_admin) ───────────────

function AgencyManageSection({
  agency,
  onUpdated,
  onDeleted,
}: {
  agency: AgencyDetail;
  onUpdated: (a: AgencyDetail) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(agency.name);
  const [email, setEmail] = useState(agency.contact_email ?? "");
  const [phone, setPhone] = useState(agency.contact_phone ?? "");
  const [active, setActive] = useState(agency.is_active);
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setName(agency.name);
    setEmail(agency.contact_email ?? "");
    setPhone(agency.contact_phone ?? "");
    setActive(agency.is_active);
  }, [agency.id, agency.updated, agency.name, agency.contact_email, agency.contact_phone, agency.is_active]);

  async function handleSave() {
    setErr(null);
    setSaving(true);
    try {
      const updated = await adminApi.patchAgency(agency.id, {
        name: name.trim(),
        contact_email: email.trim().toLowerCase(),
        contact_phone: phone.trim(),
        is_active: active,
      });
      if (updated) onUpdated(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      setErr(msg.replace(/^API \d+: /, "").replace(/^\{[^}]*"detail"\s*:\s*"([^"]*)".*$/, "$1").slice(0, 280));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDelBusy(true);
    setErr(null);
    try {
      await adminApi.deleteAgency(agency.id);
      setDelOpen(false);
      onDeleted();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo eliminar";
      setErr(msg.replace(/^API \d+: /, "").slice(0, 280));
    } finally {
      setDelBusy(false);
    }
  }

  return (
    <>
      <GlassCard>
        <h3 className="font-sora font-bold text-white text-base mb-1 flex items-center gap-2">
          <Icon icon="solar:pen-new-square-bold-duotone" width={20} className="text-[#b89eff]" />
          Gestionar agente
        </h3>
        <p className="text-xs text-white/45 mb-4">
          Actualizá datos de contacto o desactivá el acceso. Eliminar quita la agencia, el usuario en Clerk y el perfil
          en el centro de usuarios (las reservas históricas se conservan sin agencia vinculada).
        </p>
        {err && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nombre de la agencia"
            value={name}
            onValueChange={setName}
            classNames={{
              inputWrapper: "rounded-xl border border-white/15",
              input: "!text-white/95",
              label: "!text-white/65",
            }}
          />
          <Input
            label="Email de contacto"
            type="email"
            value={email}
            onValueChange={setEmail}
            classNames={{
              inputWrapper: "rounded-xl border border-white/15",
              input: "!text-white/95",
              label: "!text-white/65",
            }}
          />
          <Input
            label="Teléfono"
            value={phone}
            onValueChange={setPhone}
            classNames={{
              inputWrapper: "rounded-xl border border-white/15",
              input: "!text-white/95",
              label: "!text-white/65",
            }}
          />
          <div className="flex flex-col justify-end gap-2 pb-1">
            <span className="text-xs text-white/50">Estado</span>
            <div className="flex items-center gap-3">
              <Switch
                isSelected={active}
                onValueChange={setActive}
                color="primary"
                classNames={{ wrapper: "group-data-[selected=true]:bg-[#5e2cec]" }}
              />
              <span className="text-sm text-white/80">Agencia activa</span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            className="btn-newayzi-primary"
            size="sm"
            isLoading={saving}
            onPress={handleSave}
            startContent={!saving && <Icon icon="solar:diskette-bold" width={16} />}
          >
            Guardar cambios
          </Button>
          <Button
            size="sm"
            className="bg-red-500/15 border border-red-500/35 text-red-300 hover:bg-red-500/25"
            onPress={() => {
              setErr(null);
              setDelOpen(true);
            }}
            startContent={<Icon icon="solar:trash-bin-trash-bold" width={16} />}
          >
            Eliminar agencia
          </Button>
        </div>
      </GlassCard>

      <Modal
        isOpen={delOpen}
        onOpenChange={(o) => {
          setDelOpen(o);
          if (!o) setErr(null);
        }}
        backdrop="blur"
        classNames={{
          base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/50",
          header: "border-b border-white/[0.08] !text-white",
          body: "!text-white/95",
          footer: "border-t border-white/[0.08]",
          closeButton: "!text-white/90 hover:!bg-white/10 rounded-full",
          backdrop: "!bg-black/70 backdrop-blur-md",
        }}
      >
        <ModalContent>
          <ModalHeader>¿Eliminar esta agencia?</ModalHeader>
          <ModalBody className="py-4">
            <p className="text-sm text-white/70">
              Se eliminará <strong className="text-white">{agency.name}</strong> y el acceso del usuario al panel
              (Clerk + perfil CRM). Esta acción no se puede deshacer.
            </p>
            {err && (
              <p className="mt-3 text-sm text-red-300">{err}</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" className="text-white/80" onPress={() => setDelOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 text-white font-semibold"
              isLoading={delBusy}
              onPress={handleDelete}
            >
              Eliminar definitivamente
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// ─── Inventario (solo plataforma, agencia sin operador fijo) ─────────────────

function AgencyInventoryScopeSection({
  agency,
  onSaved,
}: {
  agency: AgencyDetail;
  onSaved: (a: AgencyDetail) => void;
}) {
  const lockedToOperator = agency.operator_id != null;
  const [operators, setOperators] = useState<Operator[]>([]);
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [opSelected, setOpSelected] = useState<Set<number>>(() => new Set(agency.scoped_operator_ids ?? []));
  const [propSelected, setPropSelected] = useState<Set<number>>(() => new Set(agency.scoped_property_ids ?? []));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setOpSelected(new Set(agency.scoped_operator_ids ?? []));
    setPropSelected(new Set(agency.scoped_property_ids ?? []));
  }, [
    agency.id,
    agency.updated,
    agency.scoped_operator_ids,
    agency.scoped_property_ids,
  ]);

  useEffect(() => {
    if (lockedToOperator) return;
    let cancelled = false;
    setListsLoading(true);
    Promise.all([adminApi.getOperators(), adminApi.getProperties({ is_active: true })])
      .then(([opsRes, propsRes]) => {
        if (cancelled) return;
        setOperators(opsRes?.results ?? []);
        setProperties(propsRes?.results ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setOperators([]);
          setProperties([]);
        }
      })
      .finally(() => {
        if (!cancelled) setListsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lockedToOperator, agency.id]);

  function toggleOp(id: number) {
    setOpSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleProp(id: number) {
    setPropSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await adminApi.patchAgencyInventoryScope(agency.id, {
        scoped_operator_ids: Array.from(opSelected),
        scoped_property_ids: Array.from(propSelected),
      });
      if (updated) onSaved(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo guardar";
      setSaveError(msg.replace(/^API \d+: /, "").slice(0, 240));
    } finally {
      setSaving(false);
    }
  }

  if (lockedToOperator) return null;

  return (
    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-sora font-bold text-white text-base flex items-center gap-2">
            <Icon icon="solar:map-point-wave-bold-duotone" width={20} className="text-[#b89eff]" />
            Alcance de inventario
          </h3>
          <p className="mt-1 text-xs text-white/50 max-w-xl">
            Agencia creada por Newayzi: podés limitar qué operadores y propiedades ven los agentes. Si dejás ambas listas
            vacías, el inventario es el catálogo completo (comportamiento por defecto). La unión de operadores y propiedades
            define el alcance.
          </p>
        </div>
      </div>
      {saveError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {saveError}
        </div>
      )}
      {listsLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Operadores</p>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 space-y-1">
              {operators.length === 0 ? (
                <p className="text-sm text-white/40 py-2 px-2">No hay operadores.</p>
              ) : (
                operators.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.05] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/5 text-[#5e2cec] focus:ring-[#5e2cec]/40"
                      checked={opSelected.has(o.id)}
                      onChange={() => toggleOp(o.id)}
                    />
                    <span className="text-sm text-white/85">{o.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Propiedades</p>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 space-y-1">
              {properties.length === 0 ? (
                <p className="text-sm text-white/40 py-2 px-2">No hay propiedades activas.</p>
              ) : (
                properties.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.05] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/5 text-[#5e2cec] focus:ring-[#5e2cec]/40"
                      checked={propSelected.has(p.id)}
                      onChange={() => toggleProp(p.id)}
                    />
                    <span className="text-sm text-white/85 truncate" title={p.name}>
                      {p.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          className="btn-newayzi-primary"
          size="sm"
          isLoading={saving}
          isDisabled={listsLoading}
          onPress={handleSave}
          startContent={!saving && <Icon icon="solar:diskette-bold" width={16} />}
        >
          Guardar alcance
        </Button>
        <p className="text-[11px] text-white/35">
          {opSelected.size + propSelected.size === 0
            ? "Sin selección: inventario completo."
            : `${opSelected.size} operador(es), ${propSelected.size} propiedad(es).`}
        </p>
      </div>
    </GlassCard>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgencyDetailClient() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [agency, setAgency] = useState<AgencyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { me } = useAdmin();
  const isSuperAdmin = me?.role === "super_admin";
  const isOperator = me?.role === "operador";
  const canManageAgency = isSuperAdmin || isOperator;

  useEffect(() => {
    if (!id) return;
    adminApi
      .getAgency(id)
      .then((data) => {
        setAgency(data ?? null);
      })
      .catch(() => setAgency(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner
          size="lg"
          classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }}
        />
      </GlassCard>
    );
  }

  if (!agency) {
    return (
      <GlassCard>
        <p className="text-white/70 font-sora">Agencia no encontrada.</p>
        <Link
          href="/admin/agents"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#9b74ff] hover:text-[#b89eff] transition-colors"
        >
          <Icon icon="solar:arrow-left-outline" width={18} />
          Volver a Agentes
        </Link>
      </GlassCard>
    );
  }

  const s = agency.summary;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/agents"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white transition-colors"
      >
        <Icon icon="solar:arrow-left-outline" width={18} />
        Agentes
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white font-sora">{agency.name}</h1>
          <p className="mt-1 text-sm text-white/50">
            {agency.contact_email || agency.contact_phone || "Sin contacto"}
          </p>
        </div>
        <Chip
          className={`${
            agency.is_active
              ? "bg-emerald-500/25 border border-emerald-400/30 text-emerald-300"
              : "bg-white/10 text-white/50"
          } font-semibold`}
        >
          {agency.is_active ? "Activo" : "Inactivo"}
        </Chip>
      </div>

      {/* KPIs: operador solo rendimiento comercial; super_admin ve también nivel de socio y comisiones */}
      <div
        className={`grid gap-4 md:grid-cols-2 ${isOperator ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
      >
        {!isOperator && (
          <GlassCard className="p-5">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Nivel de socio</span>
            <p className="mt-2 text-xl font-semibold text-white">{agency.level_name ?? "—"}</p>
            <p className="mt-1 text-[11px] text-white/40">Según ventas acumuladas del programa de agencias</p>
          </GlassCard>
        )}
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Ventas totales</span>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(s.total_sales)}</p>
        </GlassCard>
        {!isOperator && (
          <GlassCard className="p-5">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Comisión generada</span>
            <p className="mt-2 text-xl font-semibold text-[#b89eff]">{formatCurrency(s.total_commission)}</p>
          </GlassCard>
        )}
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Reservas</span>
          <p className="mt-2 text-xl font-semibold text-white">{s.bookings_count}</p>
        </GlassCard>
        {isOperator && (
          <GlassCard className="p-5">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Última actividad</span>
            <p className="mt-2 text-lg font-semibold text-white">
              {s.updated_at ? new Date(s.updated_at).toLocaleString("es-CO") : "—"}
            </p>
          </GlassCard>
        )}
      </div>

      {/* Business summary */}
      <GlassCard>
        <h3 className="font-sora font-bold text-white text-base mb-4">
          {isOperator ? "Actividad del agente" : "Resumen de negocio"}
        </h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-white/50">Ventas totales (reservas confirmadas)</dt>
            <dd className="font-medium text-white mt-1">{formatCurrency(s.total_sales)}</dd>
          </div>
          {!isOperator && (
            <div>
              <dt className="text-sm text-white/50">Comisión acumulada</dt>
              <dd className="font-medium text-white mt-1">{formatCurrency(s.total_commission)}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-white/50">Número de reservas</dt>
            <dd className="font-medium text-white mt-1">{s.bookings_count}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/50">Última actualización</dt>
            <dd className="font-medium text-white mt-1">
              {s.updated_at ? new Date(s.updated_at).toLocaleString("es-CO") : "—"}
            </dd>
          </div>
        </dl>
        {isOperator && (
          <p className="mt-4 text-xs text-white/40 border-t border-white/[0.08] pt-4">
            Nivel de socio, comisiones del programa y Newayzi Rewards (puntos, bonos) los gestiona Newayzi. Si necesitas
            un ajuste para tu agente, coordina con el equipo.
          </p>
        )}
      </GlassCard>

      {canManageAgency && (
        <AgencyManageSection
          agency={agency}
          onUpdated={(a) => setAgency(a)}
          onDeleted={() => router.push("/admin/agents")}
        />
      )}

      {isSuperAdmin && (
        <AgencyInventoryScopeSection
          agency={agency}
          onSaved={(a) => setAgency(a)}
        />
      )}

      {/* Wallet Rewards: solo plataforma; operador no llama al API ni ve movimientos */}
      {!isOperator && <AgencyWalletSection agencyId={id} isSuperAdmin={isSuperAdmin} />}
    </div>
  );
}

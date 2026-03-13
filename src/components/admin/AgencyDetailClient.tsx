"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  adminApi,
  type AgencyDetail,
  type AgentWallet,
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

function formatCurrency(value: string | number): string {
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

// ─── Main component ───────────────────────────────────────────────────────────

export function AgencyDetailClient() {
  const params = useParams();
  const id = Number(params?.id);
  const [agency, setAgency] = useState<AgencyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { me } = useAdmin();
  const isSuperAdmin = me?.role === "super_admin";

  useEffect(() => {
    if (!id) return;
    adminApi.getAgency(id).then((data) => {
      setAgency(data ?? null);
      setLoading(false);
    });
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

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Nivel</span>
          <p className="mt-2 text-xl font-semibold text-white">{agency.level_name ?? "—"}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Ventas totales</span>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(s.total_sales)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Comisión generada</span>
          <p className="mt-2 text-xl font-semibold text-[#b89eff]">{formatCurrency(s.total_commission)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Reservas</span>
          <p className="mt-2 text-xl font-semibold text-white">{s.bookings_count}</p>
        </GlassCard>
      </div>

      {/* Business summary */}
      <GlassCard>
        <h3 className="font-sora font-bold text-white text-base mb-4">Resumen de negocio</h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-white/50">Ventas totales (reservas confirmadas)</dt>
            <dd className="font-medium text-white mt-1">{formatCurrency(s.total_sales)}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/50">Comisión acumulada</dt>
            <dd className="font-medium text-white mt-1">{formatCurrency(s.total_commission)}</dd>
          </div>
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
      </GlassCard>

      {/* Wallet Rewards */}
      <AgencyWalletSection agencyId={id} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}

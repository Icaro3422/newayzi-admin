"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  propertyCancellationPolicies,
  type CancellationPolicyType,
  type CancellationTier,
  type PropertyCancellationPolicy,
  type CancellationPolicyResponse,
} from "@/lib/admin-api";

// ── Design helpers ─────────────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.09] bg-white/[0.04] p-5 ${className}`}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-white/40 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-1">{children}</p>;
}

const POLICY_META: Record<CancellationPolicyType, { label: string; description: string; icon: string; color: string }> = {
  flexible: {
    label: "Flexible",
    description: "Cancelación gratuita hasta 24h antes del check-in. Sin reembolso después.",
    icon: "solar:leaf-bold-duotone",
    color: "text-emerald-300",
  },
  moderate: {
    label: "Moderada",
    description: "Reembolso completo 5+ días antes. 50% de 1-5 días. Sin reembolso el día del check-in.",
    icon: "solar:scale-bold-duotone",
    color: "text-blue-300",
  },
  strict: {
    label: "Estricta",
    description: "Reembolso completo 14+ días antes. 50% de 7-14 días. Sin reembolso después.",
    icon: "solar:shield-bold-duotone",
    color: "text-amber-300",
  },
  custom: {
    label: "Personalizada",
    description: "Define tus propias reglas de reembolso por días antes del check-in.",
    icon: "solar:settings-bold-duotone",
    color: "text-[#9b74ff]",
  },
};

const REFUND_TYPE_LABELS: Record<string, string> = {
  cash: "Efectivo",
  credits: "Créditos",
  none: "Sin reembolso",
};

// ── Editor de tiers personalizados ─────────────────────────────────────────

function TiersEditor({
  tiers,
  onChange,
  disabled = false,
}: {
  tiers: CancellationTier[];
  onChange: (t: CancellationTier[]) => void;
  disabled?: boolean;
}) {
  const inputCls = `bg-white/[0.06] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/60 transition ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  function updateTier(idx: number, key: keyof CancellationTier, value: string | number) {
    const next = tiers.map((t, i) =>
      i === idx ? { ...t, [key]: key === "refund_pct" || key === "days_before_checkin" ? Number(value) : value } : t
    );
    onChange(next);
  }

  function addTier() {
    onChange([...tiers, { days_before_checkin: 0, refund_pct: 0, refund_type: "none" }]);
  }

  function removeTier(idx: number) {
    onChange(tiers.filter((_, i) => i !== idx));
  }

  const sorted = [...tiers].sort((a, b) => b.days_before_checkin - a.days_before_checkin);

  return (
    <div className="space-y-2">
      {sorted.length === 0 && (
        <p className="text-white/30 text-sm text-center py-4">Sin reglas definidas. Agrega una regla.</p>
      )}
      {sorted.map((tier, idx) => {
        const realIdx = tiers.indexOf(tier);
        return (
          <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
            <div>
              {idx === 0 && <FieldLabel>Días antes del check-in</FieldLabel>}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  className={`${inputCls} w-full`}
                  value={tier.days_before_checkin}
                  disabled={disabled}
                  onChange={e => updateTier(realIdx, "days_before_checkin", e.target.value)}
                />
                <span className="text-white/30 text-xs shrink-0">días</span>
              </div>
            </div>
            <div>
              {idx === 0 && <FieldLabel>% Reembolso</FieldLabel>}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`${inputCls} w-full`}
                  value={tier.refund_pct}
                  disabled={disabled}
                  onChange={e => updateTier(realIdx, "refund_pct", e.target.value)}
                />
                <span className="text-white/30 text-xs shrink-0">%</span>
              </div>
            </div>
            <div>
              {idx === 0 && <FieldLabel>Tipo</FieldLabel>}
              <select
                className={`${inputCls} w-full`}
                value={tier.refund_type}
                disabled={disabled}
                onChange={e => updateTier(realIdx, "refund_type", e.target.value as CancellationTier["refund_type"])}
              >
                <option value="cash">Efectivo</option>
                <option value="credits">Créditos</option>
                <option value="none">Sin reembolso</option>
              </select>
            </div>
            {!disabled && (
              <button
                onClick={() => removeTier(realIdx)}
                className="text-red-400/60 hover:text-red-400 transition mt-auto mb-0.5"
              >
                <Icon icon="solar:trash-bin-minimalistic-bold-duotone" className="text-base" />
              </button>
            )}
          </div>
        );
      })}
      {!disabled && (
        <button
          onClick={addTier}
          className="text-[#9b74ff] text-xs hover:text-white transition flex items-center gap-1.5 mt-2"
        >
          <Icon icon="solar:add-circle-bold-duotone" />
          Agregar regla
        </button>
      )}
    </div>
  );
}

// ── Vista de una política (read-only) ──────────────────────────────────────

function PolicyReadOnly({ policy }: { policy: PropertyCancellationPolicy }) {
  const meta = POLICY_META[policy.policyType];
  const sorted = [...policy.tiers].sort((a, b) => b.days_before_checkin - a.days_before_checkin);

  return (
    <GlassCard className={policy.isLocked ? "border-amber-400/15" : ""}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon icon={meta.icon} className={`text-xl ${meta.color}`} />
          <div>
            <p className="text-white font-semibold text-sm">{meta.label}</p>
            <p className="text-white/40 text-xs">{meta.description}</p>
          </div>
        </div>
        {policy.isLocked && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-400/25 text-amber-300 text-[0.6rem] font-semibold">
            <Icon icon="solar:lock-bold-duotone" className="text-xs" />
            Bloqueada por contrato
          </span>
        )}
      </div>

      {policy.contractNumber && (
        <p className="text-white/40 text-xs mb-3">
          Vinculada al contrato: <span className="text-[#9b74ff]">{policy.contractNumber}</span>
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/35 uppercase tracking-wider">
              <th className="text-left pb-2 pr-4">Días antes</th>
              <th className="text-left pb-2 pr-4">Reembolso</th>
              <th className="text-left pb-2">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {sorted.map((tier, i) => (
              <tr key={i}>
                <td className="py-2 pr-4 text-white">{tier.days_before_checkin === 0 ? "Mismo día o menos" : `≥ ${tier.days_before_checkin} días`}</td>
                <td className="py-2 pr-4">
                  <span className={tier.refund_pct === 0 ? "text-red-400" : "text-emerald-300"}>
                    {tier.refund_pct}%
                  </span>
                </td>
                <td className="py-2 text-white/50">{REFUND_TYPE_LABELS[tier.refund_type] ?? tier.refund_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// ── Panel principal ────────────────────────────────────────────────────────

interface PropertyCancellationPolicyPanelProps {
  propertyId: number;
  readOnly?: boolean;
}

export function PropertyCancellationPolicyPanel({ propertyId, readOnly = false }: PropertyCancellationPolicyPanelProps) {
  const [data, setData] = useState<CancellationPolicyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);

  // Form state
  const [policyType, setPolicyType] = useState<CancellationPolicyType>("moderate");
  const [tiers, setTiers] = useState<CancellationTier[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await propertyCancellationPolicies.get(propertyId);
      setData(resp);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  function handleTypeChange(type: CancellationPolicyType) {
    setPolicyType(type);
    if (type !== "custom" && data?.presets?.[type]) {
      setTiers(data.presets[type]);
    } else {
      setTiers([]);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const saved = await propertyCancellationPolicies.set(
        propertyId,
        {
          policy_type: policyType,
          ...(policyType === "custom" ? { tiers } : {}),
          effective_from: effectiveFrom || undefined,
          effective_until: effectiveUntil || undefined,
        },
      );
      setData(prev => prev ? {
        ...prev,
        activePolicy: saved,
        history: prev.activePolicy ? [prev.activePolicy, ...prev.history] : prev.history,
      } : null);
      setShowEditor(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#7c5cfc]/60 focus:ring-1 focus:ring-[#7c5cfc]/30 transition";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Icon icon="solar:loading-line-duotone" className="text-[#9b74ff] text-2xl animate-spin" />
      </div>
    );
  }

  const active = data?.activePolicy;
  const isLocked = active?.isLocked ?? false;
  const canEdit = !readOnly && !isLocked;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white/40 text-[0.62rem] uppercase tracking-[0.15em] font-semibold">Política de Cancelación</p>
          <p className="font-sora font-bold text-white text-base mt-0.5">Reglas de reembolso por cancelación</p>
          <p className="text-white/40 text-xs mt-1">
            {active
              ? "Esta política reemplaza la lógica estándar de T&C §19 para las cancelaciones de esta propiedad."
              : "Sin política activa. Se usará la lógica estándar de T&C §19 de Newayzi."}
          </p>
        </div>
        {canEdit && !showEditor && (
          <button
            onClick={() => {
              setPolicyType(active?.policyType ?? "moderate");
              setTiers(active?.tiers ?? data?.presets?.moderate ?? []);
              setEffectiveFrom(active?.effectiveFrom ?? "");
              setEffectiveUntil(active?.effectiveUntil ?? "");
              setShowEditor(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5e2cec] text-white text-sm font-semibold hover:bg-[#7c5cfc] transition shrink-0"
          >
            <Icon icon={active ? "solar:pen-bold-duotone" : "solar:add-circle-bold-duotone"} className="text-base" />
            {active ? "Cambiar política" : "Crear política"}
          </button>
        )}
        {isLocked && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/25 text-amber-300 text-xs font-semibold shrink-0">
            <Icon icon="solar:lock-bold-duotone" />
            Bloqueada por contrato
          </span>
        )}
      </div>

      {/* Estado actual */}
      {active && !showEditor && <PolicyReadOnly policy={active} />}

      {/* Sin política */}
      {!active && !showEditor && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center mb-3">
            <Icon icon="solar:documents-bold-duotone" className="text-white/30 text-xl" />
          </div>
          <p className="text-white/40 text-sm">Sin política de cancelación configurada</p>
          <p className="text-white/25 text-xs mt-1">Se aplicará T&C §19 de Newayzi en las cancelaciones</p>
        </div>
      )}

      {/* Editor */}
      {showEditor && !isLocked && (
        <GlassCard className="border-[#7c5cfc]/25">
          <p className="font-sora font-semibold text-white text-sm mb-4">
            {active ? "Cambiar política de cancelación" : "Nueva política de cancelación"}
          </p>

          {/* Selector de tipo */}
          <div className="mb-4">
            <FieldLabel>Tipo de política</FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["flexible", "moderate", "strict", "custom"] as CancellationPolicyType[]).map(type => {
                const m = POLICY_META[type];
                const sel = policyType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-center transition ${
                      sel
                        ? "border-[#7c5cfc]/50 bg-[#5e2cec]/15"
                        : "border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.07]"
                    }`}
                  >
                    <Icon icon={m.icon} className={`text-xl ${sel ? m.color : "text-white/40"}`} />
                    <span className={`text-xs font-semibold ${sel ? "text-white" : "text-white/50"}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-white/35 text-xs mt-2">{POLICY_META[policyType].description}</p>
          </div>

          {/* Tiers (preset o editable) */}
          <div className="mb-4">
            <FieldLabel>Reglas de reembolso</FieldLabel>
            <TiersEditor
              tiers={tiers}
              onChange={setTiers}
              disabled={policyType !== "custom"}
            />
          </div>

          {/* Fechas de vigencia */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <FieldLabel>Vigente desde (opcional)</FieldLabel>
              <input type="date" className={inputCls} value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Vigente hasta (opcional)</FieldLabel>
              <input type="date" className={inputCls} value={effectiveUntil} onChange={e => setEffectiveUntil(e.target.value)} />
            </div>
          </div>

          {/* Nota informativa */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-3 mb-4 text-white/40 text-xs">
            <Icon icon="solar:info-circle-bold-duotone" className="inline mr-1.5 text-white/30" />
            Si el operador tiene un contrato activo, esta política quedará bloqueada automáticamente y no podrá modificarse sin un nuevo contrato.
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/15 border border-red-400/25 px-4 py-3 flex items-center gap-2 mb-4">
              <Icon icon="solar:danger-circle-bold-duotone" className="text-red-400 text-base shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowEditor(false); setError(""); }}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#5e2cec] text-white hover:bg-[#7c5cfc] disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving && <Icon icon="solar:loading-line-duotone" className="animate-spin" />}
              {saving ? "Guardando…" : "Guardar política"}
            </button>
          </div>
        </GlassCard>
      )}

      {/* Historial */}
      {(data?.history?.length ?? 0) > 0 && (
        <details className="mt-2">
          <summary className="text-white/30 text-xs cursor-pointer hover:text-white/50 transition select-none">
            {data!.history.length} política{data!.history.length > 1 ? "s" : ""} anterior{data!.history.length > 1 ? "es" : ""}
          </summary>
          <div className="space-y-3 mt-3">
            {data!.history.slice(0, 5).map(p => (
              <PolicyReadOnly key={p.id} policy={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

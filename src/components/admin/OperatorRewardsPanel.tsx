"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  rewardsAgreementsApi,
  type RewardsAgreement,
  type AgreementStatus,
  type OperatorRewardsData,
} from "@/lib/admin-api";

// ── Design tokens (dark glass system) ─────────────────────────────────────

const STATUS_META: Record<AgreementStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:     { label: "Borrador",           color: "text-white/50",    bg: "bg-white/[0.08] border-white/[0.12]",       dot: "bg-white/40" },
  pending:   { label: "Pendiente de firma", color: "text-amber-300",   bg: "bg-amber-500/15 border-amber-400/25",       dot: "bg-amber-400" },
  active:    { label: "Activo",             color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-400/25",   dot: "bg-emerald-400" },
  paused:    { label: "Pausado",            color: "text-orange-300",  bg: "bg-orange-500/15 border-orange-400/25",     dot: "bg-orange-400" },
  expired:   { label: "Expirado",           color: "text-red-300",     bg: "bg-red-500/15 border-red-400/25",           dot: "bg-red-400" },
  cancelled: { label: "Cancelado",          color: "text-red-400/70",  bg: "bg-red-500/10 border-red-400/15",           dot: "bg-red-400/60" },
};

const VISIBILITY_LABELS: Record<number, string> = {
  0: "Sin boost",
  1: "Destacado (+10%)",
  2: "Top Results (+25%)",
  3: "Featured",
};

const LABEL_META: Record<string, { label: string; color: string }> = {
  none:      { label: "Sin etiqueta",      color: "text-white/40" },
  partner:   { label: "Rewards Partner",   color: "text-blue-300" },
  preferred: { label: "Preferred Rewards", color: "text-[#9b74ff]" },
  elite:     { label: "Elite Rewards",     color: "text-amber-300" },
};

function fmt(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(val);
}

// ── Formulario de acuerdo ──────────────────────────────────────────────────

interface AgreementFormProps {
  operatorId: number;
  initial?: Partial<RewardsAgreement>;
  onSave: (data: Partial<RewardsAgreement>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function AgreementForm({ operatorId: _operatorId, initial, onSave, onCancel, saving }: AgreementFormProps) {
  const [form, setForm] = useState({
    cashbackContributionRate: String((initial?.cashbackContributionRate ?? 0) * 100),
    visibilityBoost:          String(initial?.visibilityBoost ?? 0),
    rewardsLabel:             initial?.rewardsLabel ?? "none",
    commissionOffsetPct:      String((initial?.commissionOffsetPct ?? 0) * 100),
    minMonthlyBookings:       String(initial?.minMonthlyBookings ?? 0),
    effectiveFrom:            initial?.effectiveFrom ?? new Date().toISOString().split("T")[0],
    effectiveUntil:           initial?.effectiveUntil ?? "",
    autoRenew:                initial?.autoRenew ?? false,
    renewalNoticeDays:        String(initial?.renewalNoticeDays ?? 30),
    termsNotes:               initial?.termsNotes ?? "",
    signedByNewayzi:          initial?.signedByNewayzi ?? "",
    signedByOperator:         initial?.signedByOperator ?? "",
    internalNotes:            initial?.internalNotes ?? "",
  });

  const handle = (k: string, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate   = parseFloat(form.cashbackContributionRate) / 100;
    const offset = parseFloat(form.commissionOffsetPct) / 100;
    await onSave({
      cashbackContributionRate: isNaN(rate) ? 0 : rate,
      visibilityBoost:     parseInt(form.visibilityBoost) as any,
      rewardsLabel:        form.rewardsLabel as any,
      commissionOffsetPct: isNaN(offset) ? 0 : offset,
      minMonthlyBookings:  parseInt(form.minMonthlyBookings) || 0,
      effectiveFrom:       form.effectiveFrom,
      effectiveUntil:      form.effectiveUntil || null,
      autoRenew:           form.autoRenew,
      renewalNoticeDays:   parseInt(form.renewalNoticeDays) || 30,
      termsNotes:          form.termsNotes,
      signedByNewayzi:     form.signedByNewayzi,
      signedByOperator:    form.signedByOperator,
      internalNotes:       form.internalNotes,
    });
  };

  const inputCls =
    "w-full border border-white/[0.12] bg-white/[0.06] rounded-lg px-3 py-2 text-[0.8375rem] text-white placeholder:text-white/25 " +
    "focus:outline-none focus:border-[#5e2cec] focus:ring-2 focus:ring-[#5e2cec]/20 transition-all font-sora " +
    "[color-scheme:dark]"; // for date inputs
  const labelCls =
    "block text-[0.62rem] font-semibold text-white/40 mb-1.5 uppercase tracking-[0.12em]";
  const hintCls = "text-[0.6rem] text-white/25 mt-1 leading-snug";
  const sectionCls =
    "rounded-xl border border-white/[0.09] bg-white/[0.03] p-4 space-y-4";
  const sectionTitleCls =
    "text-[0.6rem] font-bold uppercase tracking-[0.15em] text-white/35 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sora">

      {/* Condiciones comerciales */}
      <div className={sectionCls}>
        <p className={sectionTitleCls}>Condiciones comerciales negociadas</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Aporte al cashback (%)</label>
            <input
              type="number" step="0.5" min="0" max="20"
              className={inputCls}
              value={form.cashbackContributionRate}
              onChange={(e) => handle("cashbackContributionRate", e.target.value)}
              placeholder="ej. 2.5"
              required
            />
            <p className={hintCls}>% del valor de reserva que el operador aporta al cashback</p>
          </div>
          <div>
            <label className={labelCls}>Offset de comisión (%)</label>
            <input
              type="number" step="0.5" min="0" max="100"
              className={inputCls}
              value={form.commissionOffsetPct}
              onChange={(e) => handle("commissionOffsetPct", e.target.value)}
              placeholder="ej. 1.5"
            />
            <p className={hintCls}>Reducción de comisión Newayzi como compensación</p>
          </div>
          <div>
            <label className={labelCls}>Boost de visibilidad</label>
            <select
              className={inputCls}
              value={form.visibilityBoost}
              onChange={(e) => handle("visibilityBoost", e.target.value)}
            >
              {Object.entries(VISIBILITY_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#0f1220] text-white">{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Etiqueta en tarjetas</label>
            <select
              className={inputCls}
              value={form.rewardsLabel}
              onChange={(e) => handle("rewardsLabel", e.target.value)}
            >
              {Object.entries(LABEL_META).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#0f1220] text-white">{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Mín. reservas/mes para mantener tier</label>
            <input
              type="number" min="0"
              className={inputCls}
              value={form.minMonthlyBookings}
              onChange={(e) => handle("minMonthlyBookings", e.target.value)}
              placeholder="0 = sin mínimo"
            />
          </div>
        </div>
      </div>

      {/* Vigencia */}
      <div className={sectionCls}>
        <p className={sectionTitleCls}>Vigencia del acuerdo</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Vigente desde *</label>
            <input
              type="date"
              className={inputCls}
              value={form.effectiveFrom}
              onChange={(e) => handle("effectiveFrom", e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Vigente hasta (vacío = indefinido)</label>
            <input
              type="date"
              className={inputCls}
              value={form.effectiveUntil}
              onChange={(e) => handle("effectiveUntil", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Días de aviso para renovación</label>
            <input
              type="number" min="7" max="90"
              className={inputCls}
              value={form.renewalNoticeDays}
              onChange={(e) => handle("renewalNoticeDays", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input
              type="checkbox"
              id="autoRenew"
              checked={form.autoRenew}
              onChange={(e) => handle("autoRenew", e.target.checked)}
              className="w-4 h-4 accent-[#5e2cec] rounded"
            />
            <label htmlFor="autoRenew" className="text-[0.8125rem] text-white/80 font-medium cursor-pointer">
              Renovación automática
            </label>
          </div>
        </div>
      </div>

      {/* Firma y notas */}
      <div className={sectionCls}>
        <p className={sectionTitleCls}>Firma y condiciones pactadas</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Firmado por (Newayzi)</label>
            <input
              type="text"
              className={inputCls}
              value={form.signedByNewayzi}
              onChange={(e) => handle("signedByNewayzi", e.target.value)}
              placeholder="Nombre del ejecutivo"
            />
          </div>
          <div>
            <label className={labelCls}>Firmado por (Operador)</label>
            <input
              type="text"
              className={inputCls}
              value={form.signedByOperator}
              onChange={(e) => handle("signedByOperator", e.target.value)}
              placeholder="Nombre del representante"
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Condiciones adicionales pactadas (visible para el operador)</label>
          <textarea
            className={`${inputCls} h-20 resize-none`}
            value={form.termsNotes}
            onChange={(e) => handle("termsNotes", e.target.value)}
            placeholder="Ej: 'Se exime del mínimo mensual durante los primeros 3 meses.'"
          />
        </div>
        <div>
          <label className={labelCls}>
            <span className="inline-flex items-center gap-1">
              <Icon icon="solar:lock-keyhole-minimalistic-bold-duotone" width={10} className="text-amber-400" />
              Notas internas — no visibles para el operador
            </span>
          </label>
          <textarea
            className={`${inputCls} h-16 resize-none border-amber-400/20 focus:border-amber-400/50`}
            value={form.internalNotes}
            onChange={(e) => handle("internalNotes", e.target.value)}
            placeholder="Contexto de negociación, prioridad, próximos pasos..."
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-[0.8125rem] font-semibold text-white/50 border border-white/[0.12] rounded-xl hover:bg-white/[0.05] hover:text-white/80 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-[0.8125rem] font-bold text-white rounded-xl
            bg-gradient-to-br from-[#3d21c4] to-[#5e2cec]
            shadow-[0_4px_14px_rgba(94,44,236,0.35)]
            hover:from-[#5e2cec] hover:to-[#422df6]
            hover:-translate-y-px active:translate-y-0
            transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2"
        >
          {saving ? (
            <><Icon icon="svg-spinners:ring-resize" width={14} /> Guardando…</>
          ) : (
            <><Icon icon="solar:diskette-bold-duotone" width={14} /> Guardar acuerdo</>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Tarjeta de un acuerdo ──────────────────────────────────────────────────

function AgreementCard({
  agreement,
  onStatusChange,
  onEdit,
}: {
  agreement: RewardsAgreement;
  onStatusChange?: (id: number, status: AgreementStatus) => Promise<void>;
  onEdit?: (agreement: RewardsAgreement) => void;
}) {
  const meta = STATUS_META[agreement.status];
  const labelMeta = LABEL_META[agreement.rewardsLabel] ?? LABEL_META.none;

  const allowedTransitions: Partial<Record<AgreementStatus, AgreementStatus[]>> = {
    draft:   ["pending", "cancelled"],
    pending: ["active", "draft", "cancelled"],
    active:  ["paused", "cancelled"],
    paused:  ["active", "cancelled"],
  };
  const nextStatuses = allowedTransitions[agreement.status] ?? [];

  const TRANSITION_LABELS: Partial<Record<AgreementStatus, string>> = {
    pending:   "Enviar a firma",
    active:    "Activar",
    paused:    "Pausar",
    cancelled: "Cancelar",
    draft:     "Volver a borrador",
  };

  const TRANSITION_STYLES: Partial<Record<AgreementStatus, string>> = {
    active:    "border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/15",
    paused:    "border-amber-400/25 text-amber-300 hover:bg-amber-500/10",
    cancelled: "border-red-400/25 text-red-400 hover:bg-red-500/10",
    pending:   "border-white/[0.15] text-white/60 hover:bg-white/[0.06]",
    draft:     "border-white/[0.15] text-white/60 hover:bg-white/[0.06]",
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all font-sora ${
        agreement.isActiveToday
          ? "border-emerald-400/25 bg-emerald-500/[0.07]"
          : "border-white/[0.09] bg-white/[0.04]"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-[0.7rem] font-bold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
            {meta.label}
          </span>
          {agreement.isActiveToday && (
            <span className="text-[0.65rem] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Vigente hoy
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && !["expired", "cancelled"].includes(agreement.status) && (
            <button
              onClick={() => onEdit(agreement)}
              className="text-[0.75rem] font-semibold text-white/35 hover:text-[#9b74ff] transition-colors flex items-center gap-1"
            >
              <Icon icon="solar:pen-bold-duotone" width={12} />
              Editar
            </button>
          )}
          {onStatusChange && nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(agreement.id, s)}
              className={`text-[0.72rem] font-bold px-2.5 py-1 rounded-lg border transition-all ${TRANSITION_STYLES[s] ?? "border-white/[0.12] text-white/50 hover:bg-white/[0.05]"}`}
            >
              {TRANSITION_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Condiciones — 4 stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 text-center">
          <p className="text-xl font-black text-[#9b74ff]">{agreement.cashbackContributionPct}</p>
          <p className="text-[0.6rem] text-white/35 font-medium mt-0.5 uppercase tracking-wide">Aporte cashback</p>
        </div>
        <div className="rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 text-center">
          <p className="text-[0.8rem] font-bold text-white/80 leading-snug">{VISIBILITY_LABELS[agreement.visibilityBoost]}</p>
          <p className="text-[0.6rem] text-white/35 font-medium mt-0.5 uppercase tracking-wide">Visibilidad</p>
        </div>
        <div className="rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 text-center">
          <p className={`text-[0.8rem] font-bold leading-snug ${labelMeta.color}`}>{labelMeta.label}</p>
          <p className="text-[0.6rem] text-white/35 font-medium mt-0.5 uppercase tracking-wide">Etiqueta</p>
        </div>
        <div className="rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 text-center">
          <p className="text-[0.8rem] font-bold text-white/80 leading-snug">
            {agreement.commissionOffsetPct > 0
              ? `−${(agreement.commissionOffsetPct * 100).toFixed(1)}%`
              : "Sin offset"}
          </p>
          <p className="text-[0.6rem] text-white/35 font-medium mt-0.5 uppercase tracking-wide">Offset comisión</p>
        </div>
      </div>

      {/* Vigencia y firma */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[0.72rem] text-white/40 border-t border-white/[0.08] pt-3">
        <span>
          <span className="text-white/55 font-semibold">Desde:</span>{" "}
          {new Date(agreement.effectiveFrom).toLocaleDateString("es-CO")}
        </span>
        {agreement.effectiveUntil && (
          <span>
            <span className="text-white/55 font-semibold">Hasta:</span>{" "}
            {new Date(agreement.effectiveUntil).toLocaleDateString("es-CO")}
          </span>
        )}
        {!agreement.effectiveUntil && (
          <span className="text-emerald-400/80 font-semibold">Sin fecha de vencimiento</span>
        )}
        {agreement.autoRenew && (
          <span className="text-blue-400/80 font-semibold flex items-center gap-1">
            <Icon icon="solar:refresh-circle-bold-duotone" width={11} />
            Auto-renovación
          </span>
        )}
        {agreement.signedByNewayzi && (
          <span>
            <span className="text-white/55 font-semibold">Firmado Newayzi:</span> {agreement.signedByNewayzi}
          </span>
        )}
        {agreement.signedByOperator && (
          <span>
            <span className="text-white/55 font-semibold">Firmado Operador:</span> {agreement.signedByOperator}
          </span>
        )}
      </div>

      {/* Notas */}
      {agreement.termsNotes && (
        <div className="mt-3 text-[0.75rem] text-white/50 bg-white/[0.04] rounded-xl px-3.5 py-2.5 border border-white/[0.08]">
          <span className="font-semibold text-white/65">Condiciones pactadas:</span>{" "}
          {agreement.termsNotes}
        </div>
      )}
      {agreement.internalNotes && (
        <div className="mt-2 text-[0.75rem] bg-amber-500/10 rounded-xl px-3.5 py-2.5 border border-amber-400/20 flex items-start gap-2">
          <Icon icon="solar:lock-keyhole-minimalistic-bold-duotone" width={13} className="text-amber-400 shrink-0 mt-px" />
          <span>
            <span className="font-semibold text-amber-300">Nota interna:</span>{" "}
            <span className="text-amber-200/70">{agreement.internalNotes}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Panel principal ────────────────────────────────────────────────────────

interface OperatorRewardsPanelProps {
  operatorId: number;
  readOnly?: boolean;
}

export function OperatorRewardsPanel({ operatorId, readOnly = false }: OperatorRewardsPanelProps) {
  const [data, setData]                 = useState<OperatorRewardsData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [editingAgreement, setEditing]  = useState<RewardsAgreement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await rewardsAgreementsApi.getForOperator(operatorId);
      setData(result);
    } catch (e: any) {
      setError(e.message ?? "Error al cargar acuerdos");
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (formData: Partial<RewardsAgreement>) => {
    setSaving(true);
    try {
      await rewardsAgreementsApi.create(operatorId, formData);
      setShowForm(false);
      await load();
    } catch (e: any) {
      alert(e.message ?? "Error al crear acuerdo");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (formData: Partial<RewardsAgreement>) => {
    if (!editingAgreement) return;
    setSaving(true);
    try {
      await rewardsAgreementsApi.update(operatorId, editingAgreement.id, formData);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e.message ?? "Error al actualizar acuerdo");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (agreementId: number, newStatus: AgreementStatus) => {
    try {
      await rewardsAgreementsApi.update(operatorId, agreementId, { status: newStatus });
      await load();
    } catch (e: any) {
      alert(e.message ?? "Error al cambiar estado");
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Icon icon="svg-spinners:ring-resize" className="text-[#7c4cff] text-2xl" />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    const is403 = error.includes("403");
    return (
      <div className={`rounded-2xl border p-4 font-sora ${
        is403
          ? "bg-amber-500/10 border-amber-400/25"
          : "bg-red-500/10 border-red-400/25"
      }`}>
        <div className="flex items-start gap-3">
          <Icon
            icon={is403 ? "solar:lock-keyhole-bold-duotone" : "solar:danger-circle-bold-duotone"}
            className={`text-xl shrink-0 mt-0.5 ${is403 ? "text-amber-400" : "text-red-400"}`}
          />
          <div className="min-w-0">
            {is403 ? (
              <>
                <p className="font-semibold text-amber-300 text-[0.8375rem]">Sin permisos para ver este acuerdo</p>
                <p className="text-[0.78rem] text-amber-200/60 mt-1 leading-relaxed">
                  Tu perfil no tiene el rol de plataforma configurado en el servidor.
                  Ve a <strong className="text-amber-200/80">Usuarios y roles</strong>, selecciona tu usuario
                  y vuelve a guardar el rol <strong className="text-amber-200/80">Super admin</strong>.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-red-300 text-[0.8375rem]">{error}</p>
                <button onClick={load} className="mt-2 text-[0.78rem] font-semibold text-red-400 hover:text-red-300 underline transition-colors">
                  Reintentar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const stats      = data?.stats;
  const agreements = data?.agreements ?? [];

  return (
    <div className="space-y-5 font-sora">

      {/* ── Stats del programa ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "solar:money-bag-bold-duotone",   label: "Aportado al pool",      value: fmt(stats.poolContributions),    color: "text-[#9b74ff]" },
            { icon: "solar:gift-bold-duotone",         label: "Cashback emitido",       value: fmt(stats.cashbackEmitted),      color: "text-emerald-400" },
            { icon: "solar:bookmark-bold-duotone",     label: "Reservas con Rewards",   value: String(stats.bookingsRewarded),  color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 text-center">
              <Icon icon={s.icon} className={`text-2xl mb-1.5 ${s.color}`} />
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[0.6rem] text-white/35 font-medium mt-0.5 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Acuerdo activo ── */}
      {data?.activeAgreement && (
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-white/35 mb-2">
            Acuerdo vigente hoy
          </p>
          <AgreementCard
            agreement={data.activeAgreement}
            onStatusChange={readOnly ? undefined : handleStatusChange}
            onEdit={readOnly ? undefined : (a) => { setEditing(a); setShowForm(false); }}
          />
        </div>
      )}

      {/* ── Formulario nuevo / edición ── */}
      {!readOnly && (showForm || editingAgreement) && (
        <div className="rounded-2xl border border-[#5e2cec]/30 bg-[#5e2cec]/[0.07] p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#5e2cec]/25 border border-[#5e2cec]/30 flex items-center justify-center">
                <Icon icon={editingAgreement ? "solar:pen-bold-duotone" : "solar:add-circle-bold-duotone"} className="text-[#9b74ff] text-sm" />
              </div>
              <h3 className="font-bold text-[0.875rem] text-white">
                {editingAgreement ? "Editar acuerdo" : "Nuevo acuerdo de participación"}
              </h3>
            </div>
            <button
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="text-white/30 hover:text-white/70 transition-colors"
            >
              <Icon icon="solar:close-circle-bold-duotone" width={20} />
            </button>
          </div>
          <AgreementForm
            operatorId={operatorId}
            initial={editingAgreement ?? undefined}
            onSave={editingAgreement ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            saving={saving}
          />
        </div>
      )}

      {/* ── Botón crear ── */}
      {!readOnly && !showForm && !editingAgreement && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-[#5e2cec]/35 text-[0.8125rem] font-bold text-[#9b74ff]
            hover:bg-[#5e2cec]/10 hover:border-[#5e2cec]/55
            transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Icon icon="solar:add-circle-bold-duotone" width={18} />
          Crear nuevo acuerdo Rewards
        </button>
      )}

      {/* ── Historial ── */}
      {agreements.length > 0 && (
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-white/35 mb-2.5">
            Historial de acuerdos ({agreements.length})
          </p>
          <div className="space-y-3">
            {agreements.map((a) => (
              <AgreementCard
                key={a.id}
                agreement={a}
                onStatusChange={readOnly ? undefined : handleStatusChange}
                onEdit={readOnly ? undefined : (ag) => { setEditing(ag); setShowForm(false); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Estado vacío ── */}
      {agreements.length === 0 && !showForm && (
        <div className="text-center py-12 text-white/30">
          <Icon icon="solar:handshake-bold-duotone" className="text-5xl mb-3 mx-auto text-[#5e2cec]/40" />
          <p className="text-[0.875rem] font-semibold text-white/45">Este operador aún no tiene acuerdos Rewards.</p>
          {!readOnly && (
            <p className="text-[0.78rem] mt-1 text-white/25">Crea el primer acuerdo para integrarlo al programa de cashback.</p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  rewardsAgreementsApi,
  type RewardsAgreement,
  type AgreementStatus,
  type OperatorRewardsData,
} from "@/lib/admin-api";

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_META: Record<AgreementStatus, { label: string; color: string; dot: string }> = {
  draft:     { label: "Borrador",            color: "text-gray-500",  dot: "bg-gray-400" },
  pending:   { label: "Pendiente de firma",  color: "text-amber-600", dot: "bg-amber-400" },
  active:    { label: "Activo",              color: "text-emerald-600", dot: "bg-emerald-400" },
  paused:    { label: "Pausado",             color: "text-orange-500", dot: "bg-orange-400" },
  expired:   { label: "Expirado",            color: "text-red-500",   dot: "bg-red-400" },
  cancelled: { label: "Cancelado",           color: "text-red-400",   dot: "bg-red-300" },
};

const VISIBILITY_LABELS: Record<number, string> = {
  0: "Sin boost",
  1: "Destacado (+10%)",
  2: "Top Results (+25%)",
  3: "Featured",
};

const LABEL_META: Record<string, { label: string; color: string }> = {
  none:      { label: "Sin etiqueta",       color: "text-gray-400" },
  partner:   { label: "Rewards Partner",    color: "text-blue-600" },
  preferred: { label: "Preferred Rewards",  color: "text-purple-600" },
  elite:     { label: "Elite Rewards",      color: "text-amber-600" },
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

function AgreementForm({ operatorId, initial, onSave, onCancel, saving }: AgreementFormProps) {
  const [form, setForm] = useState({
    cashbackContributionRate: String((initial?.cashbackContributionRate ?? 0) * 100),
    visibilityBoost: String(initial?.visibilityBoost ?? 0),
    rewardsLabel: initial?.rewardsLabel ?? "none",
    commissionOffsetPct: String((initial?.commissionOffsetPct ?? 0) * 100),
    minMonthlyBookings: String(initial?.minMonthlyBookings ?? 0),
    effectiveFrom: initial?.effectiveFrom ?? new Date().toISOString().split("T")[0],
    effectiveUntil: initial?.effectiveUntil ?? "",
    autoRenew: initial?.autoRenew ?? false,
    renewalNoticeDays: String(initial?.renewalNoticeDays ?? 30),
    termsNotes: initial?.termsNotes ?? "",
    signedByNewayzi: initial?.signedByNewayzi ?? "",
    signedByOperator: initial?.signedByOperator ?? "",
    internalNotes: initial?.internalNotes ?? "",
  });

  const handle = (k: string, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(form.cashbackContributionRate) / 100;
    const offset = parseFloat(form.commissionOffsetPct) / 100;
    await onSave({
      cashbackContributionRate: isNaN(rate) ? 0 : rate,
      visibilityBoost: parseInt(form.visibilityBoost) as any,
      rewardsLabel: form.rewardsLabel as any,
      commissionOffsetPct: isNaN(offset) ? 0 : offset,
      minMonthlyBookings: parseInt(form.minMonthlyBookings) || 0,
      effectiveFrom: form.effectiveFrom,
      effectiveUntil: form.effectiveUntil || null,
      autoRenew: form.autoRenew,
      renewalNoticeDays: parseInt(form.renewalNoticeDays) || 30,
      termsNotes: form.termsNotes,
      signedByNewayzi: form.signedByNewayzi,
      signedByOperator: form.signedByOperator,
      internalNotes: form.internalNotes,
    });
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300";
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Condiciones comerciales */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Condiciones comerciales negociadas
        </p>
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
            <p className="text-[10px] text-gray-400 mt-0.5">
              % del valor de la reserva que el operador aporta al cashback del huésped
            </p>
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
            <p className="text-[10px] text-gray-400 mt-0.5">
              Reducción de comisión Newayzi como compensación por el aporte
            </p>
          </div>
          <div>
            <label className={labelCls}>Boost de visibilidad</label>
            <select
              className={inputCls}
              value={form.visibilityBoost}
              onChange={(e) => handle("visibilityBoost", e.target.value)}
            >
              {Object.entries(VISIBILITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
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
                <option key={k} value={k}>{v.label}</option>
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
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Vigencia</p>
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
          <div className="flex items-center gap-3 pt-4">
            <input
              type="checkbox"
              id="autoRenew"
              checked={form.autoRenew}
              onChange={(e) => handle("autoRenew", e.target.checked)}
              className="w-4 h-4 accent-purple-600"
            />
            <label htmlFor="autoRenew" className="text-sm text-gray-700 font-medium">
              Renovación automática
            </label>
          </div>
        </div>
      </div>

      {/* Firma y notas */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Firma y condiciones</p>
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
          <label className={labelCls}>Notas internas del equipo comercial (NO visible para el operador)</label>
          <textarea
            className={`${inputCls} h-16 resize-none`}
            value={form.internalNotes}
            onChange={(e) => handle("internalNotes", e.target.value)}
            placeholder="Contexto de la negociación, prioridad, próximos pasos..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg hover:shadow-md transition-all disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar acuerdo"}
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
  onStatusChange: (id: number, status: AgreementStatus) => Promise<void>;
  onEdit: (agreement: RewardsAgreement) => void;
}) {
  const meta = STATUS_META[agreement.status];
  const labelMeta = LABEL_META[agreement.rewardsLabel];

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

  return (
    <div className={`rounded-xl border p-4 transition-all ${agreement.isActiveToday ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100 bg-white"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${meta.color} border-current/20 bg-current/5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          {agreement.isActiveToday && (
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Acuerdo vigente hoy
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!["expired", "cancelled"].includes(agreement.status) && (
            <button
              onClick={() => onEdit(agreement)}
              className="text-xs font-semibold text-gray-400 hover:text-purple-600 transition-colors"
            >
              Editar
            </button>
          )}
          {nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(agreement.id, s)}
              className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                s === "active"
                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  : s === "cancelled"
                  ? "border-red-200 text-red-500 hover:bg-red-50"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {TRANSITION_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Condiciones */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
          <p className="text-xl font-black text-purple-600">{agreement.cashbackContributionPct}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Aporte cashback</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
          <p className="text-base font-black text-gray-700">{VISIBILITY_LABELS[agreement.visibilityBoost]}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Visibilidad</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
          <p className={`text-base font-black ${labelMeta.color}`}>{labelMeta.label}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Etiqueta</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
          <p className="text-base font-black text-gray-700">
            {agreement.commissionOffsetPct > 0
              ? `−${(agreement.commissionOffsetPct * 100).toFixed(1)}%`
              : "Sin offset"}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Offset comisión</p>
        </div>
      </div>

      {/* Vigencia y firma */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
        <span>
          <span className="font-semibold">Desde:</span>{" "}
          {new Date(agreement.effectiveFrom).toLocaleDateString("es-CO")}
        </span>
        {agreement.effectiveUntil && (
          <span>
            <span className="font-semibold">Hasta:</span>{" "}
            {new Date(agreement.effectiveUntil).toLocaleDateString("es-CO")}
          </span>
        )}
        {!agreement.effectiveUntil && (
          <span className="text-emerald-600 font-semibold">Sin fecha de vencimiento</span>
        )}
        {agreement.autoRenew && (
          <span className="text-blue-500 font-semibold">Auto-renovación activa</span>
        )}
        {agreement.signedByNewayzi && (
          <span>
            <span className="font-semibold">Firmado por Newayzi:</span> {agreement.signedByNewayzi}
          </span>
        )}
        {agreement.signedByOperator && (
          <span>
            <span className="font-semibold">Firmado por operador:</span> {agreement.signedByOperator}
          </span>
        )}
      </div>

      {/* Notas */}
      {agreement.termsNotes && (
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <span className="font-semibold text-gray-600">Condiciones pactadas:</span>{" "}
          {agreement.termsNotes}
        </div>
      )}
      {agreement.internalNotes && (
        <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
          <span className="font-semibold">Nota interna:</span> {agreement.internalNotes}
        </div>
      )}
    </div>
  );
}

// ── Panel principal ────────────────────────────────────────────────────────

interface OperatorRewardsPanelProps {
  operatorId: number;
}

export function OperatorRewardsPanel({ operatorId }: OperatorRewardsPanelProps) {
  const [data, setData] = useState<OperatorRewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<RewardsAgreement | null>(null);

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
      setEditingAgreement(null);
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

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <i className="icon-[mdi--loading] animate-spin text-2xl text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
        {error}
        <button onClick={load} className="ml-3 underline font-semibold">Reintentar</button>
      </div>
    );
  }

  const stats = data?.stats;
  const agreements = data?.agreements ?? [];

  return (
    <div className="space-y-6">
      {/* Estadísticas del operador en el programa */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "mdi--bank-transfer-in", label: "Aportado al pool", value: fmt(stats.poolContributions) },
            { icon: "mdi--gift", label: "Cashback emitido", value: fmt(stats.cashbackEmitted) },
            { icon: "mdi--bookmark-multiple", label: "Reservas con Rewards", value: String(stats.bookingsRewarded) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 text-center">
              <i className={`icon-[${s.icon}] text-2xl text-purple-500 mb-1`} />
              <p className="text-lg font-black text-gray-800">{s.value}</p>
              <p className="text-[11px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Acuerdo activo */}
      {data?.activeAgreement && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Acuerdo vigente hoy
          </p>
          <AgreementCard
            agreement={data.activeAgreement}
            onStatusChange={handleStatusChange}
            onEdit={(a) => { setEditingAgreement(a); setShowForm(false); }}
          />
        </div>
      )}

      {/* Formulario: nuevo o edición */}
      {(showForm || editingAgreement) && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-800">
              {editingAgreement ? "Editar acuerdo" : "Nuevo acuerdo de participación"}
            </h3>
            <button
              onClick={() => { setShowForm(false); setEditingAgreement(null); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="icon-[mdi--close] text-lg" />
            </button>
          </div>
          <AgreementForm
            operatorId={operatorId}
            initial={editingAgreement ?? undefined}
            onSave={editingAgreement ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingAgreement(null); }}
            saving={saving}
          />
        </div>
      )}

      {/* Botón crear */}
      {!showForm && !editingAgreement && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-purple-200 text-sm font-bold text-purple-500 hover:bg-purple-50 hover:border-purple-300 transition-all flex items-center justify-center gap-2"
        >
          <i className="icon-[mdi--plus-circle] text-lg" />
          Crear nuevo acuerdo Rewards
        </button>
      )}

      {/* Historial de acuerdos */}
      {agreements.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Historial de acuerdos ({agreements.length})
          </p>
          <div className="space-y-3">
            {agreements.map((a) => (
              <AgreementCard
                key={a.id}
                agreement={a}
                onStatusChange={handleStatusChange}
                onEdit={(ag) => { setEditingAgreement(ag); setShowForm(false); }}
              />
            ))}
          </div>
        </div>
      )}

      {agreements.length === 0 && !showForm && (
        <div className="text-center py-10 text-gray-400">
          <i className="icon-[mdi--handshake-outline] text-4xl mb-2 block" />
          <p className="text-sm font-medium">Este operador aún no tiene acuerdos Rewards.</p>
          <p className="text-xs mt-0.5">Crea el primer acuerdo para integrarlo al programa.</p>
        </div>
      )}
    </div>
  );
}

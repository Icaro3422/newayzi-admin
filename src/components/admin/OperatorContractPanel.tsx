"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { operatorContracts, type ContractStatus, type OperatorContract } from "@/lib/admin-api";

// ── Status meta ────────────────────────────────────────────────────────────

const STATUS_META: Record<ContractStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:             { label: "Borrador",                    color: "text-white/50",    bg: "bg-white/[0.08] border-white/[0.12]",     dot: "bg-white/40" },
  sent_to_operator:  { label: "Pendiente firma del operador", color: "text-amber-300",   bg: "bg-amber-500/15 border-amber-400/25",     dot: "bg-amber-400 animate-pulse" },
  signed:            { label: "Firmado por el operador",      color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-400/25", dot: "bg-emerald-400" },
  active:            { label: "Activo",                       color: "text-blue-300",    bg: "bg-blue-500/15 border-blue-400/25",       dot: "bg-blue-400" },
  superseded:        { label: "Reemplazado",                  color: "text-white/35",    bg: "bg-white/[0.05] border-white/[0.08]",     dot: "bg-white/25" },
};

// ── Design system helpers ──────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.09] bg-white/[0.04] p-5 ${className}`}>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${m.bg} ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-white/40 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-1">{children}</p>;
}

function FieldValue({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <p className={`text-white text-sm font-medium break-all ${mono ? "font-mono text-xs text-white/70" : ""}`}>
      {children || <span className="text-white/30 italic">—</span>}
    </p>
  );
}

// ── Formulario de contrato (draft) ─────────────────────────────────────────

interface ContractFormProps {
  operatorId: number;
  initial?: OperatorContract | null;
  onSave: (contract: OperatorContract) => void;
  onCancel: () => void;
}

function ContractForm({ operatorId, initial, onSave, onCancel }: ContractFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "");
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const inputCls = "w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#7c5cfc]/60 focus:ring-1 focus:ring-[#7c5cfc]/30 transition";

  async function handleSave() {
    if (!title.trim()) return setError("El título es obligatorio.");
    if (!initial && !pdfFile) return setError("Debes subir un archivo PDF.");
    setSaving(true);
    setError("");
    try {
      let contract: OperatorContract;
      if (initial) {
        contract = await operatorContracts.patch(
          operatorId,
          initial.id,
          { title, valid_from: validFrom || undefined, valid_until: validUntil || undefined, notes, ...(pdfFile ? { document_pdf: pdfFile } : {}) },
        );
      } else {
        contract = await operatorContracts.create(
          operatorId,
          { title, document_pdf: pdfFile!, valid_from: validFrom || undefined, valid_until: validUntil || undefined, notes },
        );
      }
      onSave(contract);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Título del contrato *</FieldLabel>
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Contrato de Servicio Newayzi 2026" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Vigencia desde</FieldLabel>
          <input type="date" className={inputCls} value={validFrom} onChange={e => setValidFrom(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Vigencia hasta</FieldLabel>
          <input type="date" className={inputCls} value={validUntil} onChange={e => setValidUntil(e.target.value)} />
        </div>
      </div>

      <div>
        <FieldLabel>Documento PDF *</FieldLabel>
        <div
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-white/[0.15] rounded-xl px-4 py-5 flex flex-col items-center gap-2 cursor-pointer hover:border-[#7c5cfc]/40 hover:bg-white/[0.03] transition"
        >
          <Icon icon="solar:document-add-bold-duotone" className="text-[#9b74ff] text-3xl" />
          {pdfFile ? (
            <p className="text-sm text-emerald-300 font-medium">{pdfFile.name}</p>
          ) : initial?.documentPdfUrl ? (
            <p className="text-sm text-white/50">Hay un PDF cargado. Haz clic para reemplazarlo.</p>
          ) : (
            <p className="text-sm text-white/40">Haz clic para seleccionar el PDF del contrato</p>
          )}
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      <div>
        <FieldLabel>Notas internas</FieldLabel>
        <textarea
          className={`${inputCls} resize-none h-20`}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notas para el equipo Newayzi (no visibles para el operador)"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/15 border border-red-400/25 px-4 py-3 flex items-center gap-2">
          <Icon icon="solar:danger-circle-bold-duotone" className="text-red-400 text-base shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#5e2cec] text-white hover:bg-[#7c5cfc] disabled:opacity-50 transition flex items-center gap-2"
        >
          {saving && <Icon icon="solar:loading-line-duotone" className="animate-spin" />}
          {saving ? "Guardando…" : "Guardar contrato"}
        </button>
      </div>
    </div>
  );
}

// ── Modal de firma Newayzi ─────────────────────────────────────────────────

function SignNewayziModal({
  operatorId,
  contract,
  onSigned,
  onClose,
}: {
  operatorId: number;
  contract: OperatorContract;
  onSigned: (c: OperatorContract) => void;
  onClose: () => void;
}) {
  const [signerName, setSignerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSign() {
    if (!signerName.trim()) return setError("El nombre del firmante es obligatorio.");
    setSaving(true);
    setError("");
    try {
      const updated = await operatorContracts.signNewayzi(operatorId, contract.id, signerName);
      onSigned(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al firmar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#13111e] border border-white/[0.12] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-sora font-bold text-white text-base">Firma de Newayzi</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <Icon icon="solar:close-circle-bold-duotone" className="text-xl" />
          </button>
        </div>
        <p className="text-white/55 text-sm">
          Al continuar, se registrará tu firma como representante de Newayzi y se enviará un link de firma al operador por email.
        </p>
        <div>
          <FieldLabel>Tu nombre completo *</FieldLabel>
          <input
            className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#7c5cfc]/60 focus:ring-1 focus:ring-[#7c5cfc]/30 transition"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder="Nombre del firmante de Newayzi"
          />
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 px-4 py-3 text-amber-200/80 text-xs">
          Contrato: <strong>{contract.title}</strong> ({contract.contractNumber})
        </div>
        {error && (
          <p className="text-red-300 text-sm flex items-center gap-1.5">
            <Icon icon="solar:danger-circle-bold-duotone" className="shrink-0" />
            {error}
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition">
            Cancelar
          </button>
          <button
            onClick={handleSign}
            disabled={saving || !signerName.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#5e2cec] text-white hover:bg-[#7c5cfc] disabled:opacity-50 transition flex items-center gap-2"
          >
            {saving && <Icon icon="solar:loading-line-duotone" className="animate-spin" />}
            {saving ? "Firmando…" : "Firmar y enviar al operador"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de contrato ────────────────────────────────────────────────────

function ContractCard({
  contract,
  operatorId,
  onUpdated,
  onEdit,
}: {
  contract: OperatorContract;
  operatorId: number;
  onUpdated: (c: OperatorContract) => void;
  onEdit: (c: OperatorContract) => void;
}) {
  const [showSignModal, setShowSignModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : "—";

  async function handleActivate() {
    setActionLoading(true);
    setError("");
    try {
      const updated = await operatorContracts.activate(operatorId, contract.id);
      onUpdated(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al activar.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResend() {
    setActionLoading(true);
    setError("");
    try {
      const updated = await operatorContracts.resendLink(operatorId, contract.id);
      onUpdated(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al reenviar.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      {showSignModal && (
        <SignNewayziModal
          operatorId={operatorId}
          contract={contract}
          onSigned={(c) => { onUpdated(c); setShowSignModal(false); }}
          onClose={() => setShowSignModal(false)}
        />
      )}
      <GlassCard className={contract.status === "active" ? "border-blue-400/20" : ""}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="font-sora font-bold text-white text-sm truncate">{contract.title}</p>
            <p className="text-white/35 text-xs mt-0.5">{contract.contractNumber}</p>
          </div>
          <StatusBadge status={contract.status} />
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <FieldLabel>Vigencia</FieldLabel>
            <FieldValue>
              {contract.validFrom ? `${fmtDate(contract.validFrom)}${contract.validUntil ? ` → ${fmtDate(contract.validUntil)}` : " (indefinido)"}` : "—"}
            </FieldValue>
          </div>
          <div>
            <FieldLabel>Firma Newayzi</FieldLabel>
            <FieldValue>{contract.signedByNewayziName || "—"}</FieldValue>
          </div>
          {contract.signedByOperatorName && (
            <div>
              <FieldLabel>Firma Operador</FieldLabel>
              <FieldValue>{contract.signedByOperatorName}</FieldValue>
            </div>
          )}
          {contract.signedByOperatorAt && (
            <div>
              <FieldLabel>Firmado el</FieldLabel>
              <FieldValue>{fmtDate(contract.signedByOperatorAt)}</FieldValue>
            </div>
          )}
        </div>

        {/* Hash de integridad (solo si está firmado/activo) */}
        {contract.contentHash && (
          <div className="mb-4">
            <FieldLabel>Hash de integridad (SHA-256)</FieldLabel>
            <FieldValue mono>{contract.contentHash}</FieldValue>
          </div>
        )}

        {/* PDF */}
        {contract.documentPdfUrl && (
          <a
            href={contract.documentPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[#9b74ff] text-sm hover:text-white transition mb-4"
          >
            <Icon icon="solar:document-bold-duotone" className="text-base" />
            Ver documento PDF
          </a>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-500/15 border border-red-400/25 px-3 py-2 mb-3 text-red-300 text-xs flex items-center gap-1.5">
            <Icon icon="solar:danger-circle-bold-duotone" />
            {error}
          </div>
        )}

        {/* Acciones según estado */}
        <div className="flex gap-2 flex-wrap">
          {contract.status === "draft" && (
            <>
              <button
                onClick={() => onEdit(contract)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/[0.12] text-white/70 hover:text-white hover:bg-white/[0.08] transition flex items-center gap-1.5"
              >
                <Icon icon="solar:pen-bold-duotone" className="text-sm" />
                Editar
              </button>
              <button
                onClick={() => setShowSignModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#5e2cec] text-white hover:bg-[#7c5cfc] transition flex items-center gap-1.5"
              >
                <Icon icon="solar:pen-new-square-bold-duotone" className="text-sm" />
                Firmar y enviar al operador
              </button>
            </>
          )}
          {contract.status === "sent_to_operator" && (
            <button
              onClick={handleResend}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-400/25 text-amber-300 hover:bg-amber-500/10 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {actionLoading ? <Icon icon="solar:loading-line-duotone" className="animate-spin" /> : <Icon icon="solar:send-twice-bold-duotone" className="text-sm" />}
              Reenviar link de firma
            </button>
          )}
          {contract.status === "signed" && (
            <button
              onClick={handleActivate}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/80 text-white hover:bg-emerald-500 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {actionLoading ? <Icon icon="solar:loading-line-duotone" className="animate-spin" /> : <Icon icon="solar:check-circle-bold-duotone" className="text-sm" />}
              Activar contrato
            </button>
          )}
        </div>
      </GlassCard>
    </>
  );
}

// ── Panel principal ────────────────────────────────────────────────────────

interface OperatorContractPanelProps {
  operatorId: number;
  readOnly?: boolean;
}

export function OperatorContractPanel({ operatorId, readOnly = false }: OperatorContractPanelProps) {
  const [contracts, setContracts] = useState<OperatorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<OperatorContract | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await operatorContracts.list(operatorId);
      setContracts(data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => { load(); }, [load]);

  function handleSaved(contract: OperatorContract) {
    setContracts(prev => {
      const idx = prev.findIndex(c => c.id === contract.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = contract;
        return next;
      }
      return [contract, ...prev];
    });
    setShowForm(false);
    setEditingContract(null);
  }

  function handleUpdated(contract: OperatorContract) {
    setContracts(prev => prev.map(c => c.id === contract.id ? contract : c));
  }

  function handleEdit(contract: OperatorContract) {
    setEditingContract(contract);
    setShowForm(true);
  }

  const active = contracts.find(c => c.status === "active");
  const pending = contracts.filter(c => c.status !== "active" && c.status !== "superseded");
  const history = contracts.filter(c => c.status === "superseded");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon icon="solar:loading-line-duotone" className="text-[#9b74ff] text-2xl animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/40 text-[0.62rem] uppercase tracking-[0.15em] font-semibold">Contratos de Servicio</p>
          <p className="font-sora font-bold text-white text-base mt-0.5">Acuerdo legal con el operador</p>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => { setEditingContract(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5e2cec] text-white text-sm font-semibold hover:bg-[#7c5cfc] transition"
          >
            <Icon icon="solar:add-circle-bold-duotone" className="text-base" />
            Nuevo contrato
          </button>
        )}
      </div>

      {/* Formulario (create / edit draft) */}
      {showForm && !readOnly && (
        <GlassCard className="border-[#7c5cfc]/30">
          <p className="font-sora font-semibold text-white text-sm mb-4">
            {editingContract ? "Editar contrato" : "Nuevo contrato"}
          </p>
          <ContractForm
            operatorId={operatorId}
            initial={editingContract}
            onSave={handleSaved}
            onCancel={() => { setShowForm(false); setEditingContract(null); }}
          />
        </GlassCard>
      )}

      {/* Contrato activo */}
      {active && (
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Contrato activo</p>
          <ContractCard
            contract={active}
            operatorId={operatorId}
            onUpdated={handleUpdated}
            onEdit={handleEdit}
          />
        </div>
      )}

      {/* Contratos en proceso */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">En proceso</p>
          {pending.map(c => (
            <ContractCard
              key={c.id}
              contract={c}
              operatorId={operatorId}
              onUpdated={handleUpdated}
              onEdit={!readOnly ? handleEdit : () => {}}
            />
          ))}
        </div>
      )}

      {/* Sin contratos */}
      {contracts.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#5e2cec]/15 border border-[#5e2cec]/25 flex items-center justify-center mb-3">
            <Icon icon="solar:document-add-bold-duotone" className="text-[#9b74ff] text-xl" />
          </div>
          <p className="text-white/60 text-sm font-medium">Sin contratos</p>
          <p className="text-white/30 text-xs mt-1 max-w-xs">
            Sube el contrato de servicio PDF y gestiona el proceso de firma digital con el operador.
          </p>
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <details className="mt-2">
          <summary className="text-white/30 text-xs cursor-pointer hover:text-white/50 transition select-none">
            {history.length} contrato{history.length > 1 ? "s" : ""} reemplazado{history.length > 1 ? "s" : ""}
          </summary>
          <div className="space-y-3 mt-3">
            {history.map(c => (
              <ContractCard
                key={c.id}
                contract={c}
                operatorId={operatorId}
                onUpdated={handleUpdated}
                onEdit={() => {}}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

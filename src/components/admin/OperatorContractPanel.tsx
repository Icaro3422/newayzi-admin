"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/react";
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
  /** Nombre del operador en sistema (valor por defecto de «parte operadora» en plantilla) */
  operatorName?: string;
  initial?: OperatorContract | null;
  onSave: (contract: OperatorContract) => void;
  onCancel: () => void;
}

type CreationMode = "upload" | "platform_template";

function ContractForm({ operatorId, operatorName = "", initial, onSave, onCancel }: ContractFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "");
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [creationMode, setCreationMode] = useState<CreationMode>(() =>
    initial?.documentSource === "platform_template" ? "platform_template" : "upload",
  );
  const [counterpartyDisplayName, setCounterpartyDisplayName] = useState(
    () => (initial?.counterpartyDisplayName ?? operatorName).trim(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Si el nombre del operador llega después de abrir el formulario, rellenar solo mientras el campo siga vacío
  const lastSyncedOperatorName = useRef("");
  useEffect(() => {
    if (initial || !operatorName.trim()) return;
    if (operatorName === lastSyncedOperatorName.current) return;
    lastSyncedOperatorName.current = operatorName;
    setCounterpartyDisplayName((prev) => (prev.trim() === "" ? operatorName.trim() : prev));
  }, [operatorName, initial]);

  const inputCls = "w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#d4b97a]/60 focus:ring-1 focus:ring-[#d4b97a]/30 transition";

  const isTemplateContract = initial?.documentSource === "platform_template";
  const showCounterpartyField = !initial || isTemplateContract;

  async function handleSave() {
    if (!title.trim()) return setError("El título es obligatorio.");
    if (!initial && creationMode === "upload" && !pdfFile) return setError("Debes subir un archivo PDF.");
    setSaving(true);
    setError("");
    try {
      let contract: OperatorContract;
      if (initial) {
        contract = await operatorContracts.patch(operatorId, initial.id, {
          title,
          valid_from: validFrom || undefined,
          valid_until: validUntil || undefined,
          notes,
          ...(isTemplateContract ? { counterparty_display_name: counterpartyDisplayName.trim() } : {}),
          ...(pdfFile ? { document_pdf: pdfFile } : {}),
        });
      } else if (creationMode === "platform_template") {
        contract = await operatorContracts.create(operatorId, {
          title,
          creation_mode: "platform_template",
          counterparty_display_name: counterpartyDisplayName.trim() || undefined,
          valid_from: validFrom || undefined,
          valid_until: validUntil || undefined,
          notes,
        });
      } else {
        contract = await operatorContracts.create(operatorId, {
          title,
          creation_mode: "upload",
          document_pdf: pdfFile!,
          counterparty_display_name: counterpartyDisplayName.trim() || undefined,
          valid_from: validFrom || undefined,
          valid_until: validUntil || undefined,
          notes,
        });
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
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Contrato de Servicio Almara 2026" />
      </div>

      {!initial && (
        <div>
          <FieldLabel>Origen del documento *</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCreationMode("platform_template")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                creationMode === "platform_template"
                  ? "bg-[#b89a5e] border-[#d4b97a] text-white"
                  : "border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              Plantilla estándar Almara
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("upload")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                creationMode === "upload"
                  ? "bg-[#b89a5e] border-[#d4b97a] text-white"
                  : "border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              Subir PDF propio
            </button>
          </div>
          <p className="text-white/40 text-xs mt-2">
            La plantilla incluye cláusulas de referencia (cancelación, Rewards, políticas) y un recuadro fijo para la firma del operador.
          </p>
        </div>
      )}

      {initial && (
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 flex items-center gap-2">
          <Icon icon="solar:document-text-bold-duotone" className="text-[#d4b97a] text-lg shrink-0" />
          <span className="text-white/80 text-sm">
            {isTemplateContract ? "Contrato generado desde plantilla estándar Almara (firma del operador incrustada al firmar)." : "Documento PDF subido manualmente (firma como anexo si no es plantilla v1)."}
          </span>
        </div>
      )}

      {showCounterpartyField && (
        <div>
          <FieldLabel>Nombre / razón social en el documento</FieldLabel>
          <input
            className={inputCls}
            value={counterpartyDisplayName}
            onChange={e => setCounterpartyDisplayName(e.target.value)}
            placeholder={operatorName || "Ej. Hotel Ejemplo S.A.S."}
          />
          <p className="text-white/35 text-[0.65rem] mt-1">
            Si lo dejas vacío, se usará el nombre del operador en la plataforma ({operatorName || "—"}).
            {initial && isTemplateContract
              ? " Cambiar este campo no regenera el PDF: crea un nuevo borrador si necesitas otro nombre impreso."
              : ""}
          </p>
        </div>
      )}

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

      {(!initial && creationMode === "upload") || initial ? (
        <div>
          <FieldLabel>{initial ? "Reemplazar PDF (opcional)" : "Documento PDF *"}</FieldLabel>
          <div
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-white/[0.15] rounded-xl px-4 py-5 flex flex-col items-center gap-2 cursor-pointer hover:border-[#d4b97a]/40 hover:bg-white/[0.03] transition"
          >
            <Icon icon="solar:document-add-bold-duotone" className="text-[#d4b97a] text-3xl" />
            {pdfFile ? (
              <p className="text-sm text-emerald-300 font-medium">{pdfFile.name}</p>
            ) : initial?.documentPdfUrl ? (
              <p className="text-sm text-white/50">
                {initial ? "Hay un PDF cargado. Haz clic solo si quieres sustituirlo." : "Hay un PDF cargado. Haz clic para reemplazarlo."}
              </p>
            ) : (
              <p className="text-sm text-white/40">Haz clic para seleccionar el PDF del contrato</p>
            )}
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
      ) : null}

      <div>
        <FieldLabel>Notas internas</FieldLabel>
        <textarea
          className={`${inputCls} resize-none h-20`}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notas para el equipo Almara (no visibles para el operador)"
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
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#b89a5e] text-white hover:bg-[#d4b97a] disabled:opacity-50 transition flex items-center gap-2"
        >
          {saving && <Icon icon="solar:loading-line-duotone" className="animate-spin" />}
          {saving ? "Guardando…" : "Guardar contrato"}
        </button>
      </div>
    </div>
  );
}

// ── Modal de firma plataforma (Almara) ─────────────────────────────────────

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
  const [emailWarning, setEmailWarning] = useState("");

  async function handleSign() {
    if (!signerName.trim()) return setError("El nombre del firmante es obligatorio.");
    setSaving(true);
    setError("");
    setEmailWarning("");
    try {
      const updated = await operatorContracts.signNewayzi(operatorId, contract.id, signerName);
      onSigned(updated);
      if (updated.signEmailSent === false) {
        setEmailWarning(
          updated.signEmailWarning ??
            "El contrato quedó en «pendiente firma» pero el correo no se envió. Revisa RESEND y el email del operador.",
        );
      }
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
          <h3 className="font-sora font-bold text-white text-base">Firma de Almara</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <Icon icon="solar:close-circle-bold-duotone" className="text-xl" />
          </button>
        </div>
        <p className="text-white/55 text-sm">
          Al continuar, se registrará tu firma como representante de Almara y se enviará un link de firma al operador por email.
        </p>
        <div>
          <FieldLabel>Tu nombre completo *</FieldLabel>
          <input
            className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#d4b97a]/60 focus:ring-1 focus:ring-[#d4b97a]/30 transition"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder="Nombre del firmante de Almara"
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
        {emailWarning && (
          <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 px-3 py-2 text-amber-200 text-xs flex items-start gap-2">
            <Icon icon="solar:letter-unread-bold-duotone" className="shrink-0 text-lg mt-0.5" />
            <span>{emailWarning}</span>
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition">
            {emailWarning ? "Cerrar" : "Cancelar"}
          </button>
          {!emailWarning && (
            <button
              onClick={handleSign}
              disabled={saving || !signerName.trim()}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#b89a5e] text-white hover:bg-[#d4b97a] disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving && <Icon icon="solar:loading-line-duotone" className="animate-spin" />}
              {saving ? "Firmando…" : "Firmar y enviar al operador"}
            </button>
          )}
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
  const [resendLoading, setResendLoading] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [error, setError] = useState("");

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : "—";

  async function handleActivate() {
    setActivateLoading(true);
    setError("");
    try {
      const updated = await operatorContracts.activate(operatorId, contract.id);
      onUpdated(updated);
      addToast({
        title: "Contrato activado",
        description: `${updated.contractNumber} quedó activo para este operador.`,
        color: "success",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al activar.";
      setError(msg);
      addToast({ title: "No se pudo activar", description: msg, color: "danger" });
    } finally {
      setActivateLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setError("");
    try {
      const updated = await operatorContracts.resendLink(operatorId, contract.id);
      onUpdated(updated);
      if (updated.signEmailSent === false) {
        const desc =
          updated.signEmailWarning ??
          "El token se renovó pero el correo no se envió. Revisa RESEND_API_KEY y el email del operador.";
        setError(desc);
        addToast({
          title: "Link renovado; correo no enviado",
          description: desc,
          color: "warning",
        });
      } else {
        setError("");
        addToast({
          title: "Link de firma reenviado",
          description: `Se envió un nuevo enlace al operador para ${updated.contractNumber}.`,
          color: "success",
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al reenviar el link.";
      setError(msg);
      addToast({ title: "Error al reenviar", description: msg, color: "danger" });
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <>
      {showSignModal && (
        <SignNewayziModal
          operatorId={operatorId}
          contract={contract}
          onSigned={(c) => {
            onUpdated(c);
            if (c.signEmailSent !== false) setShowSignModal(false);
          }}
          onClose={() => setShowSignModal(false)}
        />
      )}
      <GlassCard className={contract.status === "active" ? "border-blue-400/20" : ""}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="font-sora font-bold text-white text-sm truncate">{contract.title}</p>
            <p className="text-white/35 text-xs mt-0.5">{contract.contractNumber}</p>
            {contract.documentSource === "platform_template" && (
              <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-md text-[0.65rem] font-semibold uppercase tracking-wide bg-[#b89a5e]/25 text-[#c4b5fd] border border-[#d4b97a]/30">
                Plantilla Almara
              </span>
            )}
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
            <FieldLabel>Firma Almara</FieldLabel>
            <FieldValue>{contract.signedByNewayziName || "—"}</FieldValue>
          </div>
          {contract.documentSource === "platform_template" && (
            <div className="col-span-2">
              <FieldLabel>Parte operadora en el PDF</FieldLabel>
              <FieldValue>{(contract.counterpartyDisplayName || "").trim() || contract.operatorName}</FieldValue>
            </div>
          )}
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
        <div className="flex flex-col gap-2 mb-4">
          {contract.documentPdfUrl && (
            <a
              href={contract.documentPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[#d4b97a] text-sm hover:text-white transition w-fit"
            >
              <Icon icon="solar:document-bold-duotone" className="text-base" />
              Ver documento PDF (original)
            </a>
          )}
          {contract.signedDocumentPdfUrl && (
            <a
              href={contract.signedDocumentPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-emerald-400/90 text-sm hover:text-emerald-300 transition w-fit font-semibold"
            >
              <Icon icon="solar:document-download-bold-duotone" className="text-base" />
              {contract.pdfTemplateVersion === "v1"
                ? "Descargar PDF firmado (firma en documento)"
                : "Descargar PDF firmado (con anexo)"}
            </a>
          )}
        </div>

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
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#b89a5e] text-white hover:bg-[#d4b97a] transition flex items-center gap-1.5"
              >
                <Icon icon="solar:pen-new-square-bold-duotone" className="text-sm" />
                Firmar y enviar al operador
              </button>
            </>
          )}
          {contract.status === "sent_to_operator" && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-400/25 text-amber-300 hover:bg-amber-500/10 transition flex items-center gap-1.5 disabled:opacity-60 min-w-[10rem] justify-center"
            >
              {resendLoading ? (
                <Icon icon="solar:loading-line-duotone" className="animate-spin text-base shrink-0" />
              ) : (
                <Icon icon="solar:send-twice-bold-duotone" className="text-sm shrink-0" />
              )}
              {resendLoading ? "Reenviando…" : "Reenviar link de firma"}
            </button>
          )}
          {contract.status === "signed" && (
            <button
              type="button"
              onClick={handleActivate}
              disabled={activateLoading}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/80 text-white hover:bg-emerald-500 transition flex items-center gap-1.5 disabled:opacity-60 min-w-[10rem] justify-center"
            >
              {activateLoading ? (
                <Icon icon="solar:loading-line-duotone" className="animate-spin text-base shrink-0" />
              ) : (
                <Icon icon="solar:check-circle-bold-duotone" className="text-sm shrink-0" />
              )}
              {activateLoading ? "Activando…" : "Activar contrato"}
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
  operatorName?: string;
  readOnly?: boolean;
}

export function OperatorContractPanel({ operatorId, operatorName = "", readOnly = false }: OperatorContractPanelProps) {
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
        <Icon icon="solar:loading-line-duotone" className="text-[#d4b97a] text-2xl animate-spin" />
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b89a5e] text-white text-sm font-semibold hover:bg-[#d4b97a] transition"
          >
            <Icon icon="solar:add-circle-bold-duotone" className="text-base" />
            Nuevo contrato
          </button>
        )}
      </div>

      {/* Formulario (create / edit draft) */}
      {showForm && !readOnly && (
        <GlassCard className="border-[#d4b97a]/30">
          <p className="font-sora font-semibold text-white text-sm mb-4">
            {editingContract ? "Editar contrato" : "Nuevo contrato"}
          </p>
          <ContractForm
            operatorId={operatorId}
            operatorName={operatorName}
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
          <div className="w-12 h-12 rounded-2xl bg-[#b89a5e]/15 border border-[#b89a5e]/25 flex items-center justify-center mb-3">
            <Icon icon="solar:document-add-bold-duotone" className="text-[#d4b97a] text-xl" />
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

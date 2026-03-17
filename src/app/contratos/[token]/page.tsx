"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

interface ContractPublicData {
  contractNumber: string;
  title: string;
  operatorName: string;
  validFrom: string | null;
  validUntil: string | null;
  documentPdfUrl: string | null;
  signedByNewayziName: string;
  signedByNewayziAt: string | null;
  alreadySigned: boolean;
  signedByOperatorName?: string | null;
  signedAt?: string | null;
}

type PageState = "loading" | "ready" | "already_signed" | "expired" | "error" | "success";

export default function ContratoSignPage() {
  const params = useParams();
  const token = String(params?.token ?? "");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [contract, setContract] = useState<ContractPublicData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Firma
  const [operatorName, setOperatorName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [contentHash, setContentHash] = useState("");

  const loadContract = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/sign/${token}/`);
      const data = await res.json();

      if (res.status === 410) {
        setPageState("expired");
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.detail ?? "Enlace no válido.");
        setPageState("error");
        return;
      }
      if (data.alreadySigned) {
        setContract(data);
        setPageState("already_signed");
        return;
      }
      setContract(data);
      setPageState("ready");
    } catch {
      setErrorMsg("Error al cargar el contrato. Verifica tu conexión.");
      setPageState("error");
    }
  }, [token]);

  useEffect(() => { loadContract(); }, [loadContract]);

  async function handleSign() {
    if (!operatorName.trim()) return setSignError("Por favor ingresa tu nombre completo.");
    if (!accepted) return setSignError("Debes leer y aceptar los términos del contrato.");
    setSigning(true);
    setSignError("");
    try {
      const res = await fetch(`${API_BASE}/api/contracts/sign/${token}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator_name: operatorName, accepted: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSignError(data.detail ?? "Error al firmar. Intenta nuevamente.");
        return;
      }
      setSignedAt(data.signedAt);
      setContentHash(data.contentHash);
      setPageState("success");
    } catch {
      setSignError("Error de conexión. Intenta nuevamente.");
    } finally {
      setSigning(false);
    }
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : null;

  // ── Pantalla de carga ──────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <PageShell>
        <div className="flex flex-col items-center py-20 gap-4">
          <Icon icon="solar:loading-line-duotone" className="text-[#9b74ff] text-4xl animate-spin" />
          <p className="text-white/50 text-sm">Cargando contrato…</p>
        </div>
      </PageShell>
    );
  }

  // ── Token expirado ─────────────────────────────────────────────────────
  if (pageState === "expired") {
    return (
      <PageShell>
        <StatusCard
          icon="solar:clock-circle-bold-duotone"
          iconColor="text-amber-400"
          iconBg="bg-amber-500/15 border-amber-400/25"
          title="Enlace expirado"
          message="Este enlace de firma ya no es válido. Contacta al equipo de Newayzi para recibir un nuevo enlace."
        />
      </PageShell>
    );
  }

  // ── Error genérico ─────────────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <PageShell>
        <StatusCard
          icon="solar:close-circle-bold-duotone"
          iconColor="text-red-400"
          iconBg="bg-red-500/15 border-red-400/25"
          title="Enlace no válido"
          message={errorMsg || "Este enlace no existe o ya no está disponible."}
        />
      </PageShell>
    );
  }

  // ── Ya firmado ─────────────────────────────────────────────────────────
  if (pageState === "already_signed" && contract) {
    return (
      <PageShell>
        <StatusCard
          icon="solar:check-circle-bold-duotone"
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/15 border-emerald-400/25"
          title="Contrato ya firmado"
          message={`Este contrato ya fue firmado${contract.signedByOperatorName ? ` por ${contract.signedByOperatorName}` : ""}${contract.signedAt ? ` el ${fmtDate(contract.signedAt)}` : ""}. No es necesario realizar ninguna acción adicional.`}
        />
      </PageShell>
    );
  }

  // ── Éxito ──────────────────────────────────────────────────────────────
  if (pageState === "success") {
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center py-8 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
            <Icon icon="solar:check-circle-bold-duotone" className="text-emerald-400 text-4xl" />
          </div>
          <div>
            <h2 className="font-sora font-bold text-white text-xl">¡Contrato firmado exitosamente!</h2>
            <p className="text-white/55 text-sm mt-2 max-w-sm">
              Tu firma ha sido registrada. Newayzi recibirá una notificación y podrás solicitar una copia del contrato a tu ejecutivo comercial.
            </p>
          </div>
          {signedAt && (
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.10] px-5 py-4 text-left w-full max-w-sm space-y-2">
              <Row label="Firmante" value={operatorName} />
              <Row label="Fecha" value={fmtDate(signedAt) ?? ""} />
              {contentHash && <Row label="Hash SHA-256" value={contentHash} mono />}
            </div>
          )}
        </div>
      </PageShell>
    );
  }

  // ── Página principal de firma ──────────────────────────────────────────
  if (!contract) return null;

  return (
    <PageShell>
      {/* Cabecera del contrato */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 flex items-center justify-center">
            <Icon icon="solar:document-text-bold-duotone" className="text-[#9b74ff] text-base" />
          </div>
          <div>
            <p className="text-white/40 text-[0.62rem] uppercase tracking-[0.12em] font-semibold">Firma Digital Requerida</p>
            <p className="text-white text-xs">Newayzi</p>
          </div>
        </div>

        <h1 className="font-sora font-bold text-white text-xl leading-tight mb-1">{contract.title}</h1>
        <p className="text-white/50 text-sm">{contract.contractNumber} · {contract.operatorName}</p>

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-white/50">
          {contract.validFrom && (
            <span className="flex items-center gap-1">
              <Icon icon="solar:calendar-bold-duotone" className="text-white/30" />
              Vigencia: {fmtDate(contract.validFrom)}
              {contract.validUntil ? ` → ${fmtDate(contract.validUntil)}` : " (indefinido)"}
            </span>
          )}
          {contract.signedByNewayziName && (
            <span className="flex items-center gap-1">
              <Icon icon="solar:pen-new-square-bold-duotone" className="text-white/30" />
              Firmado por Newayzi: {contract.signedByNewayziName}
            </span>
          )}
        </div>
      </div>

      {/* PDF del contrato */}
      {contract.documentPdfUrl && (
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-2">Documento del contrato</p>
          <div className="rounded-2xl border border-white/[0.10] overflow-hidden">
            <iframe
              src={contract.documentPdfUrl}
              className="w-full"
              style={{ height: "420px" }}
              title="Contrato de servicio"
            />
          </div>
          <a
            href={contract.documentPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-[#9b74ff] text-xs hover:text-white transition"
          >
            <Icon icon="solar:square-arrow-right-up-bold-duotone" className="text-sm" />
            Abrir PDF en nueva pestaña
          </a>
        </div>
      )}

      {/* Formulario de firma */}
      <div className="space-y-4">
        <div>
          <label className="text-white/40 text-[0.62rem] uppercase tracking-[0.12em] font-semibold block mb-1">
            Tu nombre completo *
          </label>
          <input
            className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#7c5cfc]/60 focus:ring-1 focus:ring-[#7c5cfc]/30 transition"
            value={operatorName}
            onChange={e => setOperatorName(e.target.value)}
            placeholder="Nombre completo del representante legal"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="mt-0.5 shrink-0">
            <input
              type="checkbox"
              className="hidden"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
            />
            <div
              onClick={() => setAccepted(!accepted)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                accepted ? "bg-[#5e2cec] border-[#5e2cec]" : "bg-transparent border-white/25 group-hover:border-white/50"
              }`}
            >
              {accepted && <Icon icon="solar:check-bold" className="text-white text-xs" />}
            </div>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            He leído íntegramente el contrato, entiendo sus términos y condiciones y acepto firmarlo digitalmente en representación de <strong className="text-white/80">{contract.operatorName}</strong>.
          </p>
        </label>

        {signError && (
          <div className="rounded-xl bg-red-500/15 border border-red-400/25 px-4 py-3 flex items-center gap-2">
            <Icon icon="solar:danger-circle-bold-duotone" className="text-red-400 text-base shrink-0" />
            <p className="text-red-300 text-sm">{signError}</p>
          </div>
        )}

        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-white/40 text-xs">
          Al hacer clic en "Firmar digitalmente", se registrará tu nombre, la fecha y hora actual, y tu dirección IP como evidencia de tu consentimiento. Esta acción es irreversible.
        </div>

        <button
          onClick={handleSign}
          disabled={signing || !operatorName.trim() || !accepted}
          className="w-full py-3.5 rounded-2xl font-sora font-bold text-white text-sm bg-gradient-to-r from-[#5e2cec] to-[#7c5cfc] hover:from-[#7c5cfc] hover:to-[#9b74ff] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {signing ? (
            <>
              <Icon icon="solar:loading-line-duotone" className="animate-spin text-lg" />
              Procesando firma…
            </>
          ) : (
            <>
              <Icon icon="solar:pen-new-square-bold-duotone" className="text-lg" />
              Firmar digitalmente
            </>
          )}
        </button>
      </div>
    </PageShell>
  );
}

// ── Componentes auxiliares ─────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d0b18] flex items-start justify-center px-4 py-8 sm:py-16">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5e2cec] to-[#9b74ff] flex items-center justify-center">
            <Icon icon="solar:home-2-bold-duotone" className="text-white text-base" />
          </div>
          <span className="font-sora font-bold text-white text-lg">Newayzi</span>
        </div>

        <div className="rounded-3xl border border-white/[0.09] bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8">
          {children}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          © {new Date().getFullYear()} Newayzi. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  iconColor,
  iconBg,
  title,
  message,
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-4">
      <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${iconBg}`}>
        <Icon icon={icon} className={`text-4xl ${iconColor}`} />
      </div>
      <div>
        <h2 className="font-sora font-bold text-white text-lg">{title}</h2>
        <p className="text-white/50 text-sm mt-2 max-w-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-white/35 text-[0.6rem] uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-white text-xs mt-0.5 break-all ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { SignaturePad } from "@/components/contratos/SignaturePad";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

const BG_GRADIENT =
  "radial-gradient(ellipse 110% 80% at 20% 15%, #1e1060 0%, #0c0720 45%, #050310 100%)";
const GLOW_1 = "radial-gradient(circle, rgba(94,44,236,0.18) 0%, transparent 70%)";
const GLOW_2 = "radial-gradient(circle, rgba(66,45,246,0.10) 0%, transparent 70%)";

interface ContractPublicData {
  contractNumber: string;
  title: string;
  operatorName: string;
  validFrom: string | null;
  validUntil: string | null;
  documentPdfUrl: string | null;
  signedDocumentPdfUrl?: string | null;
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

  const [operatorName, setOperatorName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  function onUploadSignatureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpeg|jpg)$/i.test(f.type)) {
      setSignError("Solo se permiten imágenes PNG o JPEG.");
      return;
    }
    if (f.size > 2.5 * 1024 * 1024) {
      setSignError("La imagen no debe superar 2,5 MB.");
      return;
    }
    setSignError("");
    const r = new FileReader();
    r.onload = () => {
      const url = typeof r.result === "string" ? r.result : null;
      setSignatureDataUrl(url);
    };
    r.readAsDataURL(f);
    e.target.value = "";
  }

  async function handleSign() {
    if (!operatorName.trim()) return setSignError("Por favor ingresa tu nombre completo.");
    if (!accepted) return setSignError("Debes leer y aceptar los términos del contrato.");
    if (!signatureDataUrl) {
      return setSignError("Añade tu firma dibujándola o subiendo una imagen PNG/JPEG.");
    }
    setSigning(true);
    setSignError("");
    try {
      const res = await fetch(`${API_BASE}/api/contracts/sign/${token}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_name: operatorName,
          accepted: true,
          signature_image: signatureDataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSignError(data.detail ?? "Error al firmar. Intenta nuevamente.");
        return;
      }
      setSignedAt(data.signedAt);
      setContentHash(data.contentHash);
      setSignedPdfUrl(data.signedDocumentPdfUrl ?? null);
      setPageState("success");
    } catch {
      setSignError("Error de conexión. Intenta nuevamente.");
    } finally {
      setSigning(false);
    }
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : null;

  if (pageState === "loading") {
    return (
      <PageShell>
        <div className="flex flex-col items-center py-24 gap-4">
          <Icon icon="solar:loading-line-duotone" className="text-[#9b74ff] text-4xl animate-spin" />
          <p className="text-white/50 text-sm font-medium">Cargando contrato…</p>
        </div>
      </PageShell>
    );
  }

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

  if (pageState === "already_signed" && contract) {
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center py-6 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
            <Icon icon="solar:check-circle-bold-duotone" className="text-emerald-400 text-4xl" />
          </div>
          <div>
            <h2 className="font-sora font-bold text-white text-lg">Contrato ya firmado</h2>
            <p className="text-white/55 text-sm mt-2 max-w-md leading-relaxed">
              Este contrato ya fue firmado
              {contract.signedByOperatorName ? ` por ${contract.signedByOperatorName}` : ""}
              {contract.signedAt ? ` el ${fmtDate(contract.signedAt)}` : ""}.
            </p>
          </div>
          {contract.signedDocumentPdfUrl && (
            <a
              href={contract.signedDocumentPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#5e2cec] to-[#422df6] text-white hover:opacity-95 transition"
            >
              <Icon icon="solar:document-download-bold-duotone" className="text-lg" />
              Descargar PDF firmado
            </a>
          )}
        </div>
      </PageShell>
    );
  }

  if (pageState === "success") {
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center py-6 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
            <Icon icon="solar:check-circle-bold-duotone" className="text-emerald-400 text-4xl" />
          </div>
          <div>
            <h2 className="font-sora font-bold text-white text-xl">¡Contrato firmado!</h2>
            <p className="text-white/55 text-sm mt-2 max-w-md leading-relaxed">
              Tu firma y el documento firmado quedaron registrados en la plataforma. Conserva una copia del PDF.
            </p>
          </div>
          {signedPdfUrl && (
            <a
              href={signedPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#5e2cec] to-[#422df6] text-white shadow-lg shadow-[#5e2cec]/25 hover:opacity-95 transition"
            >
              <Icon icon="solar:document-download-bold-duotone" className="text-xl" />
              Descargar PDF firmado
            </a>
          )}
          {signedAt && (
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.10] px-5 py-4 text-left w-full max-w-sm space-y-2 mt-2">
              <Row label="Firmante" value={operatorName} />
              <Row label="Fecha" value={fmtDate(signedAt) ?? ""} />
              {contentHash && <Row label="Hash SHA-256 (documento firmado)" value={contentHash} mono />}
            </div>
          )}
        </div>
      </PageShell>
    );
  }

  if (!contract) return null;

  return (
    <PageShell wide>
      <div className="mb-8">
        <p className="text-[#9b74ff] text-[0.65rem] uppercase tracking-[0.14em] font-bold mb-2">Firma digital requerida</p>
        <h1 className="font-sora font-extrabold text-white text-2xl sm:text-[1.65rem] tracking-tight leading-tight mb-2">
          {contract.title}
        </h1>
        <p className="text-white/45 text-sm font-medium">
          {contract.contractNumber} · {contract.operatorName}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-white/50">
          {contract.validFrom && (
            <span className="inline-flex items-center gap-1.5">
              <Icon icon="solar:calendar-bold-duotone" className="text-[#7c5cfc]/80 text-sm" />
              Vigencia: {fmtDate(contract.validFrom)}
              {contract.validUntil ? ` → ${fmtDate(contract.validUntil)}` : " (indefinido)"}
            </span>
          )}
          {contract.signedByNewayziName && (
            <span className="inline-flex items-center gap-1.5">
              <Icon icon="solar:verified-check-bold-duotone" className="text-emerald-400/90 text-sm" />
              Firmado por Newayzi: {contract.signedByNewayziName}
            </span>
          )}
        </div>
      </div>

      {contract.documentPdfUrl && (
        <div className="mb-8">
          <p className="text-white/35 text-[0.62rem] uppercase tracking-[0.12em] font-bold mb-3">Documento del contrato</p>
          <div className="rounded-2xl border border-white/[0.10] overflow-hidden bg-black/30 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
            <iframe
              src={contract.documentPdfUrl}
              className="w-full"
              style={{ height: "min(52vh, 520px)" }}
              title="Contrato de servicio"
            />
          </div>
          <a
            href={contract.documentPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[#b89fff] text-xs font-semibold hover:text-white transition"
          >
            <Icon icon="solar:square-arrow-right-up-bold-duotone" className="text-sm" />
            Abrir PDF en nueva pestaña
          </a>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 mb-6">
        <p className="text-white/50 text-sm font-medium mb-4">
          Completa tu firma electrónica. Se generará un PDF que incluye este documento y una página de anexo con tu firma,
          nombre, fecha e IP, alineado con los registros de Newayzi.
        </p>

        <SignaturePad onDataUrlChange={setSignatureDataUrl} className="mb-5" />

        <div className="mb-6">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onUploadSignatureFile} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold border border-white/[0.14] text-white/80 hover:bg-white/[0.06] transition flex items-center justify-center gap-2"
          >
            <Icon icon="solar:gallery-add-bold-duotone" className="text-lg text-[#9b74ff]" />
            Subir imagen de firma (PNG o JPEG)
          </button>
          {signatureDataUrl && (
            <p className="text-emerald-400/90 text-xs mt-2 flex items-center gap-1.5">
              <Icon icon="solar:check-circle-bold-duotone" />
              Firma lista para enviar
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white/40 text-[0.62rem] uppercase tracking-[0.12em] font-bold block mb-1.5">
              Tu nombre completo *
            </label>
            <input
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#7c5cfc]/70 focus:ring-1 focus:ring-[#7c5cfc]/35 transition"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              placeholder="Nombre completo del representante legal"
            />
          </div>

          <button
            type="button"
            onClick={() => setAccepted((v) => !v)}
            role="checkbox"
            aria-checked={accepted}
            className="flex items-start gap-3 w-full text-left cursor-pointer group rounded-xl p-2 -m-2 hover:bg-white/[0.04] border-0 bg-transparent transition"
          >
            <span
              className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition pointer-events-none ${
                accepted ? "bg-[#5e2cec] border-[#5e2cec]" : "bg-transparent border-white/35 group-hover:border-white/55"
              }`}
              aria-hidden
            >
              {accepted && <Icon icon="solar:check-bold" className="text-white text-xs" />}
            </span>
            <span className="text-white/60 text-sm leading-relaxed pointer-events-none">
              He leído íntegramente el contrato, entiendo sus términos y condiciones y acepto firmarlo digitalmente en
              representación de <strong className="text-white/85">{contract.operatorName}</strong>.
            </span>
          </button>

          {signError && (
            <div className="rounded-xl bg-red-500/15 border border-red-400/25 px-4 py-3 flex items-center gap-2">
              <Icon icon="solar:danger-circle-bold-duotone" className="text-red-400 text-base shrink-0" />
              <p className="text-red-200 text-sm">{signError}</p>
            </div>
          )}

          <div className="rounded-xl bg-[#5e2cec]/10 border border-[#5e2cec]/25 px-4 py-3 text-white/45 text-xs leading-relaxed">
            Al confirmar, se adjuntará tu firma al expediente, se guardará el PDF firmado y se registrarán fecha/hora e IP
            como evidencia. Esta acción es irreversible.
          </div>

          <button
            type="button"
            onClick={handleSign}
            disabled={signing || !operatorName.trim() || !accepted || !signatureDataUrl}
            className="w-full py-3.5 rounded-2xl font-sora font-bold text-white text-sm bg-gradient-to-r from-[#5e2cec] via-[#6b3df0] to-[#422df6] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-[#5e2cec]/20"
          >
            {signing ? (
              <>
                <Icon icon="solar:loading-line-duotone" className="animate-spin text-lg" />
                Generando documento firmado…
              </>
            ) : (
              <>
                <Icon icon="solar:pen-new-square-bold-duotone" className="text-lg" />
                Firmar y registrar contrato
              </>
            )}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: BG_GRADIENT }}>
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{ background: GLOW_1, backgroundPosition: "30% 20%", backgroundRepeat: "no-repeat", backgroundSize: "120% 80%" }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{ background: GLOW_2, backgroundPosition: "80% 60%", backgroundRepeat: "no-repeat" }}
      />

      <div className={`relative z-10 mx-auto px-4 py-10 sm:py-14 ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <header className="flex items-center gap-3 mb-10">
          <img
            src="/brand/n-patron-black.svg"
            alt="Newayzi"
            width={44}
            height={44}
            className="shrink-0"
            style={{ filter: "invert(1) brightness(1.15)" }}
          />
          <div>
            <span className="font-sora font-extrabold text-white text-xl tracking-tight block leading-none">Newayzi</span>
            <span className="text-white/40 text-xs font-medium mt-1 block">Portal de firma de contratos</span>
          </div>
        </header>

        <div className="rounded-3xl border border-white/[0.09] bg-[#0f1220]/75 backdrop-blur-xl p-6 sm:p-9 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {children}
        </div>

        <p className="text-center text-white/25 text-xs mt-8 font-medium">
          © {new Date().getFullYear()} Newayzi ·{" "}
          <a href="https://newayzi.com" className="text-white/35 hover:text-white/50 underline-offset-2 hover:underline">
            newayzi.com
          </a>
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
      <p className="text-white/35 text-[0.6rem] uppercase tracking-wide font-bold">{label}</p>
      <p className={`text-white text-xs mt-0.5 break-all ${mono ? "font-mono text-[0.65rem]" : ""}`}>{value}</p>
    </div>
  );
}

"use client";

import { useSignUp } from "@clerk/nextjs";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "form" | "verify";

/* ── Mapeo de errores Clerk → mensajes en español ── */
const CLERK_ERROR_MESSAGES: Record<string, string> = {
  form_identifier_not_found: "No encontramos una cuenta con ese correo electrónico.",
  form_identifier_exists: "Ya existe una cuenta con ese correo electrónico.",
  form_password_incorrect: "La contraseña es incorrecta. Inténtalo de nuevo.",
  form_password_pwned: "Esta contraseña es muy común. Elige una más segura.",
  form_password_length_too_short: "La contraseña debe tener al menos 8 caracteres.",
  form_param_format_invalid__email_address: "El formato del correo electrónico no es válido.",
  form_param_missing: "Por favor completa todos los campos obligatorios.",
  form_code_incorrect: "El código ingresado es incorrecto. Verifica e intenta de nuevo.",
  too_many_requests: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  session_exists: "Ya tienes una sesión activa.",
};

function resolveClerkError(err: unknown): string {
  const clerkErr = (err as { errors?: { code?: string; meta?: { paramName?: string }; longMessage?: string; message?: string }[] })?.errors?.[0];
  if (!clerkErr) {
    return (err as { message?: string })?.message || "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
  const code = clerkErr.code ?? "";
  // Caso especial: email con formato inválido
  const key =
    code === "form_param_format_invalid" && clerkErr.meta?.paramName === "email_address"
      ? "form_param_format_invalid__email_address"
      : code;
  return (
    CLERK_ERROR_MESSAGES[key] ||
    clerkErr.longMessage ||
    clerkErr.message ||
    "Ocurrió un error inesperado. Inténtalo de nuevo."
  );
}

/* ── UI compartidos ── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-sora font-medium text-[0.8125rem] text-gray-700 mb-1.5">
      {children}
    </label>
  );
}

function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  autoFocus,
  right,
  maxLength,
}: {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  right?: React.ReactNode;
  maxLength?: number;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        maxLength={maxLength}
        className="
          w-full font-sora text-[0.9375rem] text-gray-900
          bg-gray-50 border border-gray-200 rounded-[10px]
          px-3.5 py-3 pr-10
          placeholder:text-gray-400 placeholder:font-normal
          outline-none transition-all duration-150
          hover:border-gray-300 hover:bg-white
          focus:border-[#5e2cec] focus:bg-white focus:ring-3 focus:ring-[#5e2cec]/10
        "
        style={{ minHeight: "46px" }}
      />
      {right && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
      )}
    </div>
  );
}

function PrimaryButton({
  children,
  loading,
  disabled,
  type = "submit",
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      className="
        w-full min-h-[48px] rounded-[10px] font-sora font-bold text-[0.9375rem] text-white
        bg-gradient-to-br from-[#3d21c4] to-[#5e2cec]
        shadow-[0_4px_16px_rgba(94,44,236,0.38)]
        hover:from-[#5e2cec] hover:to-[#422df6]
        hover:shadow-[0_6px_22px_rgba(94,44,236,0.46)]
        hover:-translate-y-px
        active:translate-y-0 active:shadow-[0_2px_8px_rgba(94,44,236,0.35)]
        transition-all duration-150
        disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0
        flex items-center justify-center gap-2
      "
    >
      {loading ? (
        <>
          <Icon icon="svg-spinners:ring-resize" className="text-lg" />
          <span>Un momento…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] bg-red-50 border border-red-200 px-3.5 py-3">
      <Icon icon="solar:danger-circle-bold-duotone" className="text-red-500 text-lg shrink-0 mt-px" />
      <p className="font-sora text-red-700 text-[0.8125rem] leading-snug">{message}</p>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] bg-green-50 border border-green-200 px-3.5 py-3">
      <Icon icon="solar:check-circle-bold-duotone" className="text-green-600 text-lg shrink-0 mt-px" />
      <p className="font-sora text-green-700 text-[0.8125rem] leading-snug">{message}</p>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="font-sora text-gray-400 text-[0.7rem] uppercase tracking-widest font-medium">o</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

/* ── OTP: 6 celdas separadas ── */
function OTPInput({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: () => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleChange = (i: number, v: string) => {
    const cleaned = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    const joined = next.join("").replace(/\s/g, "");
    onChange(joined);
    if (cleaned && i < 5) {
      refs.current[i + 1]?.focus();
    } else if (cleaned && i === 5 && joined.length === 6) {
      // Auto-submit cuando se completan todos los dígitos
      setTimeout(onComplete, 80);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(text);
    const focusIdx = Math.min(text.length, 5);
    refs.current[focusIdx]?.focus();
    if (text.length === 6) setTimeout(onComplete, 80);
    e.preventDefault();
  };

  return (
    <div className="flex gap-2.5 justify-between">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={(e) => e.target.select()}
          autoFocus={i === 0}
          className={[
            "w-full aspect-square max-w-[52px] text-center",
            "font-sora font-bold text-xl text-gray-900",
            "border-[1.5px] rounded-[10px]",
            "outline-none transition-all duration-150",
            digits[i]
              ? "border-[#5e2cec] bg-white shadow-[0_2px_8px_rgba(94,44,236,0.12)]"
              : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white",
            "focus:border-[#5e2cec] focus:bg-white focus:ring-3 focus:ring-[#5e2cec]/10",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

/* ── Componente principal ── */
export function CustomSignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isLoaded) return null;

  const clearMessages = () => { setError(""); setSuccess(""); };

  /* ── Crear cuenta ── */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    if (!email.trim()) { setError("Por favor ingresa tu correo electrónico."); return; }
    if (!password) { setError("Por favor ingresa una contraseña."); return; }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }

    clearMessages();
    setLoading(true);
    try {
      const result = await signUp.create({ emailAddress: email.trim(), password });
      if (result.status === "missing_requirements") {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setCode("");
        setStep("verify");
      } else if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/admin");
      } else {
        // Si Clerk requiere pasos adicionales no contemplados
        setError("No se pudo completar el registro. Inténtalo de nuevo.");
      }
    } catch (err: unknown) {
      const clerkError = (err as { errors?: { code?: string; meta?: { paramName?: string } }[] })?.errors?.[0];
      const errCode = clerkError?.code ?? "";

      // Si la instancia de Clerk no tiene first_name/last_name, reintentar sin ellos (ya manejado arriba al no enviarlos)
      // Si hay un error de campo desconocido, mostrar mensaje genérico
      if (errCode === "form_param_unknown") {
        setError("La configuración de registro no es compatible. Contacta al administrador.");
      } else {
        setError(resolveClerkError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Google OAuth ── */
  const handleGoogle = async () => {
    if (!signUp) return;
    setGoogleLoading(true);
    clearMessages();
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/admin",
      });
      // authenticateWithRedirect redirige inmediatamente; no se ejecuta código después
    } catch (err) {
      setError(resolveClerkError(err) || "No se pudo continuar con Google. Inténtalo de nuevo.");
      setGoogleLoading(false);
    }
  };

  /* ── Verificar código de email ── */
  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!signUp) return;

    if (code.length < 6) { setError("Por favor ingresa el código completo de 6 dígitos."); return; }

    clearMessages();
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/admin");
      } else {
        setError("No se pudo verificar el correo. Inténtalo de nuevo.");
      }
    } catch (err) {
      setError(resolveClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Reenviar código ── */
  const handleResend = async () => {
    if (!signUp) return;
    clearMessages();
    setResendLoading(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setCode("");
      setSuccess("Código reenviado. Revisa tu bandeja de entrada.");
    } catch (err) {
      setError(resolveClerkError(err) || "No se pudo reenviar el código. Inténtalo de nuevo.");
    } finally {
      setResendLoading(false);
    }
  };

  /* ── PASO: formulario de registro ── */
  if (step === "form") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-sora font-extrabold text-[1.75rem] tracking-tight text-gray-900 leading-tight">
            Crear cuenta
          </h1>
          <p className="font-sora text-gray-500 text-[0.9rem] mt-1.5 leading-relaxed">
            Únete a la plataforma Newayzi y empieza a gestionar hoy.
          </p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="
            w-full min-h-[46px] flex items-center justify-center gap-3
            font-sora font-medium text-[0.9375rem] text-gray-700
            bg-white border-[1.5px] border-gray-200 rounded-[10px]
            hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm
            transition-all duration-150
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {googleLoading ? (
            <Icon icon="svg-spinners:ring-resize" className="text-lg text-gray-500" />
          ) : (
            <Icon icon="logos:google-icon" className="text-xl shrink-0" />
          )}
          Continuar con Google
        </button>

        <Divider />

        <form onSubmit={handleSignUp} className="flex flex-col gap-4" noValidate>
          <div>
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={setEmail}
              autoFocus
            />
          </div>

          <div>
            <Label>Contraseña</Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={setPassword}
              right={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  <Icon
                    icon={showPassword ? "solar:eye-closed-bold-duotone" : "solar:eye-bold-duotone"}
                    className="text-xl"
                  />
                </button>
              }
            />
            <p className="font-sora text-gray-400 text-[0.72rem] mt-1.5">
              Usa al menos 8 caracteres, una mayúscula y un número.
            </p>
          </div>

          {error && <ErrorBox message={error} />}

          <PrimaryButton loading={loading}>
            <Icon icon="solar:user-plus-bold-duotone" className="text-lg" />
            Crear cuenta
          </PrimaryButton>
        </form>

        {/* Footer */}
        <p className="text-center font-sora text-[0.9rem] text-gray-500">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/sign-in"
            className="text-[#5e2cec] font-semibold hover:text-[#422df6] transition-colors"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    );
  }

  /* ── PASO: verificar email ── */
  if (step === "verify") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-4">
            <Icon icon="solar:letter-bold-duotone" className="text-[#5e2cec] text-2xl" />
          </div>
          <h1 className="font-sora font-extrabold text-[1.75rem] tracking-tight text-gray-900 leading-tight">
            Verifica tu correo
          </h1>
          <p className="font-sora text-gray-500 text-[0.9rem] mt-1.5 leading-relaxed">
            Enviamos un código de 6 dígitos a{" "}
            <span className="font-semibold text-gray-700">{email}</span>.
            Ingrésalo para activar tu cuenta.
          </p>
        </div>

        <form
          id="verify-form"
          onSubmit={handleVerify}
          className="flex flex-col gap-5"
        >
          <OTPInput
            value={code}
            onChange={setCode}
            onComplete={() => {
              // Disparar submit del formulario cuando se completan los 6 dígitos
              document.getElementById("verify-submit")?.click();
            }}
          />

          <p className="font-sora text-gray-400 text-[0.72rem] -mt-2">
            Revisa también tu carpeta de spam.
          </p>

          {error && <ErrorBox message={error} />}
          {success && <SuccessBox message={success} />}

          <button
            id="verify-submit"
            type="submit"
            form="verify-form"
            disabled={loading || code.length < 6}
            className="
              w-full min-h-[48px] rounded-[10px] font-sora font-bold text-[0.9375rem] text-white
              bg-gradient-to-br from-[#3d21c4] to-[#5e2cec]
              shadow-[0_4px_16px_rgba(94,44,236,0.38)]
              hover:from-[#5e2cec] hover:to-[#422df6]
              hover:shadow-[0_6px_22px_rgba(94,44,236,0.46)]
              hover:-translate-y-px
              active:translate-y-0 active:shadow-[0_2px_8px_rgba(94,44,236,0.35)]
              transition-all duration-150
              disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0
              flex items-center justify-center gap-2
            "
          >
            {loading ? (
              <>
                <Icon icon="svg-spinners:ring-resize" className="text-lg" />
                <span>Un momento…</span>
              </>
            ) : (
              <>
                <Icon icon="solar:shield-check-bold-duotone" className="text-lg" />
                Verificar y acceder
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => { clearMessages(); setCode(""); setStep("form"); }}
            className="flex items-center gap-1.5 font-sora text-[0.8rem] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icon="solar:arrow-left-bold-duotone" className="text-sm" />
            Cambiar correo
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="flex items-center gap-1.5 font-sora text-[0.8rem] text-[#5e2cec] hover:text-[#422df6] font-medium transition-colors disabled:opacity-50"
          >
            {resendLoading && <Icon icon="svg-spinners:ring-resize" className="text-sm" />}
            Reenviar código
          </button>
        </div>
      </div>
    );
  }

  return null;
}

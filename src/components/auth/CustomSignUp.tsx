"use client";

import { useSignUp } from "@clerk/nextjs";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Step = "form" | "verify";

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
function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleChange = (i: number, v: string) => {
    const cleaned = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    const joined = next.join("").replace(/\s/g, "");
    onChange(joined);
    if (cleaned && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(text);
    const focusIdx = Math.min(text.length, 5);
    refs.current[focusIdx]?.focus();
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
          autoFocus={i === 0}
          className="
            w-full aspect-square max-w-[52px] text-center
            font-sora font-bold text-xl text-gray-900
            bg-gray-50 border-[1.5px] border-gray-200 rounded-[10px]
            outline-none transition-all duration-150
            hover:border-gray-300 hover:bg-white
            focus:border-[#5e2cec] focus:bg-white focus:ring-3 focus:ring-[#5e2cec]/10
          "
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
  const [loading, setLoading] = useState(false);

  if (!isLoaded) return null;

  const clearError = () => setError("");

  /* ── Crear cuenta ── */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    clearError();
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string; message?: string }[] };
      setError(
        clerkErr.errors?.[0]?.longMessage ||
        clerkErr.errors?.[0]?.message ||
        "No se pudo crear la cuenta. Verifica los datos."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Google OAuth ── */
  const handleGoogle = async () => {
    if (!signUp) return;
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/admin",
      });
    } catch {
      setError("No se pudo continuar con Google. Inténtalo de nuevo.");
    }
  };

  /* ── Verificar código de email ── */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    clearError();
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/admin");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string }[] };
      setError(clerkErr.errors?.[0]?.longMessage || "Código incorrecto. Verifica e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Reenviar código ── */
  const handleResend = async () => {
    if (!signUp) return;
    clearError();
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch {
      setError("No se pudo reenviar el código. Inténtalo de nuevo.");
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
          className="
            w-full min-h-[46px] flex items-center justify-center gap-3
            font-sora font-medium text-[0.9375rem] text-gray-700
            bg-white border-[1.5px] border-gray-200 rounded-[10px]
            hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm
            transition-all duration-150
          "
        >
          <Icon icon="logos:google-icon" className="text-xl shrink-0" />
          Continuar con Google
        </button>

        <Divider />

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
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

        <form onSubmit={handleVerify} className="flex flex-col gap-5">
          <OTPInput value={code} onChange={setCode} />

          {error && <ErrorBox message={error} />}

          <PrimaryButton loading={loading} disabled={code.length < 6}>
            <Icon icon="solar:shield-check-bold-duotone" className="text-lg" />
            Verificar y acceder
          </PrimaryButton>
        </form>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => { clearError(); setStep("form"); }}
            className="flex items-center gap-1.5 font-sora text-[0.8rem] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icon="solar:arrow-left-bold-duotone" className="text-sm" />
            Cambiar correo
          </button>
          <button
            type="button"
            onClick={handleResend}
            className="font-sora text-[0.8rem] text-[#5e2cec] hover:text-[#422df6] font-medium transition-colors"
          >
            Reenviar código
          </button>
        </div>
      </div>
    );
  }

  return null;
}

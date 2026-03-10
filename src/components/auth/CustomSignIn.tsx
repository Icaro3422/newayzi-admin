"use client";

import { useSignIn } from "@clerk/nextjs";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SignInResource } from "@clerk/types";

type Step = "credentials" | "forgot" | "reset_code" | "needs_new_password";

/* ── Mapeo de errores Clerk → mensajes en español ── */
const CLERK_ERROR_MESSAGES: Record<string, string> = {
  form_identifier_not_found: "No encontramos una cuenta con ese correo electrónico.",
  form_password_incorrect: "La contraseña es incorrecta. Inténtalo de nuevo.",
  form_password_pwned: "Esta contraseña es muy común. Elige una más segura.",
  form_password_length_too_short: "La contraseña debe tener al menos 8 caracteres.",
  form_identifier_exists: "Ya existe una cuenta con ese correo electrónico.",
  form_param_missing: "Por favor completa todos los campos obligatorios.",
  form_code_incorrect: "El código ingresado es incorrecto. Verifica e intenta de nuevo.",
  too_many_requests: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  session_exists: "Ya tienes una sesión activa.",
};

function resolveClerkError(err: unknown): string {
  const clerkErr = (err as { errors?: { code?: string; longMessage?: string; message?: string }[] })?.errors?.[0];
  if (!clerkErr) {
    return (err as { message?: string })?.message || "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
  const code = clerkErr.code ?? "";
  return (
    CLERK_ERROR_MESSAGES[code] ||
    clerkErr.longMessage ||
    clerkErr.message ||
    "Ocurrió un error inesperado. Inténtalo de nuevo."
  );
}

/* ── Componentes UI internos ── */
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
  required,
}: {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  right?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required={required}
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
  onClick,
  type = "submit",
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
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
      <span className="font-sora text-gray-400 text-[0.7rem] uppercase tracking-widest font-medium">
        o
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 font-sora text-[0.8125rem] text-gray-400 hover:text-gray-600 mb-4 transition-colors"
    >
      <Icon icon="solar:arrow-left-bold-duotone" className="text-base" />
      Volver
    </button>
  );
}

/* ── Componente principal ── */
export function CustomSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingSignIn, setPendingSignIn] = useState<SignInResource | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoaded) return null;

  const clearMessages = () => { setError(""); setSuccess(""); };

  const goTo = (s: Step) => { clearMessages(); setStep(s); };

  /* ── Submit: email + password ── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;

    if (!email.trim()) { setError("Por favor ingresa tu correo electrónico."); return; }
    if (!password) { setError("Por favor ingresa tu contraseña."); return; }

    clearMessages();
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/admin");
      } else if (result.status === "needs_new_password") {
        // Clerk marca la contraseña como comprometida (ej: invitación con contraseña temporal)
        setPendingSignIn(result);
        setNewPassword("");
        setConfirmPassword("");
        setStep("needs_new_password");
      } else if (result.status === "needs_second_factor") {
        setError("Tu cuenta requiere autenticación en dos pasos. Contacta al administrador.");
      } else {
        setError("No se pudo completar el inicio de sesión. Inténtalo de nuevo.");
      }
    } catch (err) {
      setError(resolveClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Establecer nueva contraseña (flujo needs_new_password) ── */
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSignIn) return;

    if (!newPassword) { setError("Por favor ingresa una nueva contraseña."); return; }
    if (newPassword.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }

    clearMessages();
    setLoading(true);
    try {
      const result = await pendingSignIn.resetPassword({ password: newPassword });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/admin");
      } else {
        setError("No se pudo establecer la contraseña. Inténtalo de nuevo.");
      }
    } catch (err) {
      setError(resolveClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Google OAuth ── */
  const handleGoogle = async () => {
    if (!signIn) return;
    setGoogleLoading(true);
    clearMessages();
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/admin",
      });
      // authenticateWithRedirect redirige inmediatamente; no se ejecuta código después
    } catch (err) {
      setError(resolveClerkError(err) || "No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
      setGoogleLoading(false);
    }
  };

  /* ── Olvidé contraseña: enviar código ── */
  const handleForgotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;

    if (!email.trim()) { setError("Por favor ingresa tu correo electrónico."); return; }

    clearMessages();
    setLoading(true);
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() });
      setSuccess("Te enviamos un código de verificación. Revisa tu correo.");
      setResetCode("");
      setNewPassword("");
      setStep("reset_code");
    } catch (err) {
      setError(resolveClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Verificar código de reset ── */
  const handleResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;

    if (!resetCode.trim()) { setError("Por favor ingresa el código de verificación."); return; }
    if (!newPassword) { setError("Por favor ingresa tu nueva contraseña."); return; }
    if (newPassword.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }

    clearMessages();
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/admin");
      } else {
        setError("No se pudo restablecer la contraseña. Inténtalo de nuevo.");
      }
    } catch (err) {
      setError(resolveClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── PASO: credenciales ── */
  if (step === "credentials") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-sora font-extrabold text-[1.75rem] tracking-tight text-gray-900 leading-tight">
            Iniciar sesión
          </h1>
          <p className="font-sora text-gray-500 text-[0.9rem] mt-1.5 leading-relaxed">
            ¡Bienvenido de nuevo! Ingresa tus credenciales para continuar.
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
            hover:border-gray-300 hover:bg-gray-50
            hover:shadow-sm transition-all duration-150
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

        <form onSubmit={handleSignIn} className="flex flex-col gap-4" noValidate>
          {/* Email */}
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

          {/* Contraseña */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Contraseña</Label>
              <button
                type="button"
                onClick={() => goTo("forgot")}
                className="font-sora text-[0.78rem] text-[#5e2cec] hover:text-[#422df6] font-medium transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
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
          </div>

          {error && <ErrorBox message={error} />}

          <PrimaryButton loading={loading}>
            <Icon icon="solar:login-2-bold-duotone" className="text-lg" />
            Iniciar sesión
          </PrimaryButton>
        </form>

        {/* Footer */}
        <p className="text-center font-sora text-[0.9rem] text-gray-500">
          ¿No tienes cuenta?{" "}
          <Link
            href="/sign-up"
            className="text-[#5e2cec] font-semibold hover:text-[#422df6] transition-colors"
          >
            Regístrate
          </Link>
        </p>
      </div>
    );
  }

  /* ── PASO: olvidé contraseña ── */
  if (step === "forgot") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <BackButton onClick={() => goTo("credentials")} />
          <h1 className="font-sora font-extrabold text-[1.75rem] tracking-tight text-gray-900 leading-tight">
            Recuperar contraseña
          </h1>
          <p className="font-sora text-gray-500 text-[0.9rem] mt-1.5 leading-relaxed">
            Te enviaremos un código a tu correo para restablecer tu contraseña.
          </p>
        </div>

        <form onSubmit={handleForgotSend} className="flex flex-col gap-4" noValidate>
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

          {error && <ErrorBox message={error} />}
          {success && <SuccessBox message={success} />}

          <PrimaryButton loading={loading}>
            <Icon icon="solar:letter-bold-duotone" className="text-lg" />
            Enviar código
          </PrimaryButton>
        </form>
      </div>
    );
  }

  /* ── PASO: nueva contraseña obligatoria (primer login con contraseña temporal) ── */
  if (step === "needs_new_password") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <BackButton onClick={() => { setPendingSignIn(null); goTo("credentials"); }} />
          <h1 className="font-sora font-extrabold text-[1.75rem] tracking-tight text-gray-900 leading-tight">
            Crea tu contraseña
          </h1>
          <p className="font-sora text-gray-500 text-[0.9rem] mt-1.5 leading-relaxed">
            Por seguridad, debes establecer una contraseña propia para continuar.
          </p>
        </div>

        <form onSubmit={handleSetNewPassword} className="flex flex-col gap-4" noValidate>
          <div>
            <Label>Nueva contraseña</Label>
            <Input
              type={showNewPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={setNewPassword}
              autoFocus
              right={
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  <Icon
                    icon={showNewPassword ? "solar:eye-closed-bold-duotone" : "solar:eye-bold-duotone"}
                    className="text-xl"
                  />
                </button>
              }
            />
          </div>

          <div>
            <Label>Confirmar contraseña</Label>
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              right={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  <Icon
                    icon={showConfirmPassword ? "solar:eye-closed-bold-duotone" : "solar:eye-bold-duotone"}
                    className="text-xl"
                  />
                </button>
              }
            />
          </div>

          {error && <ErrorBox message={error} />}

          <PrimaryButton loading={loading}>
            <Icon icon="solar:lock-password-bold-duotone" className="text-lg" />
            Establecer contraseña y entrar
          </PrimaryButton>
        </form>
      </div>
    );
  }

  /* ── PASO: código de restablecimiento ── */
  if (step === "reset_code") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <BackButton onClick={() => goTo("forgot")} />
          <h1 className="font-sora font-extrabold text-[1.75rem] tracking-tight text-gray-900 leading-tight">
            Nueva contraseña
          </h1>
          <p className="font-sora text-gray-500 text-[0.9rem] mt-1.5 leading-relaxed">
            Ingresa el código que recibiste en{" "}
            <span className="font-semibold text-gray-700">{email}</span>{" "}
            y elige una nueva contraseña.
          </p>
        </div>

        <form onSubmit={handleResetCode} className="flex flex-col gap-4" noValidate>
          <div>
            <Label>Código de verificación</Label>
            <Input
              type="text"
              placeholder="123456"
              value={resetCode}
              onChange={setResetCode}
              autoFocus
            />
          </div>

          <div>
            <Label>Nueva contraseña</Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={setNewPassword}
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
          </div>

          {error && <ErrorBox message={error} />}
          {success && <SuccessBox message={success} />}

          <PrimaryButton loading={loading}>
            <Icon icon="solar:lock-password-bold-duotone" className="text-lg" />
            Restablecer contraseña
          </PrimaryButton>
        </form>
      </div>
    );
  }

  return null;
}

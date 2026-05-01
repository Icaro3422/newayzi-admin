"use client";

/**
 * Operaciones (Clerk Dashboard, misma app que CLERK_SECRET_KEY del admin):
 * - Desactivar Client Trust y MFA obligatoria si los invitados deben ir directo a cambio de contraseña.
 * - Si el correo de verificación no llega: dominio/remitente verificado, plantillas, carpeta spam.
 */
import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SignInResource, SignInSecondFactor } from "@clerk/types";

import { resolveClerkError } from "@/lib/clerk-errors";

type SecondFactorSelection =
  | { strategy: "email_code"; emailAddressId: string; safeIdentifier: string }
  | { strategy: "phone_code"; phoneNumberId: string; safeIdentifier: string }
  | { strategy: "totp" }
  | { strategy: "backup_code" };

function resolveSecondFactorSelection(
  supported: SignInSecondFactor[]
): SecondFactorSelection | null {
  const email = supported.find((f) => f.strategy === "email_code");
  if (email?.strategy === "email_code") {
    return {
      strategy: "email_code",
      emailAddressId: email.emailAddressId,
      safeIdentifier: email.safeIdentifier,
    };
  }
  const phone = supported.find((f) => f.strategy === "phone_code");
  if (phone?.strategy === "phone_code") {
    return {
      strategy: "phone_code",
      phoneNumberId: phone.phoneNumberId,
      safeIdentifier: phone.safeIdentifier,
    };
  }
  if (supported.some((f) => f.strategy === "totp")) {
    return { strategy: "totp" };
  }
  if (supported.some((f) => f.strategy === "backup_code")) {
    return { strategy: "backup_code" };
  }
  return null;
}

async function prepareSignInSecondFactor(
  resource: SignInResource,
  sel: SecondFactorSelection
): Promise<void> {
  if (sel.strategy === "email_code") {
    await resource.prepareSecondFactor({
      strategy: "email_code",
      emailAddressId: sel.emailAddressId,
    });
    return;
  }
  if (sel.strategy === "phone_code") {
    await resource.prepareSecondFactor({
      strategy: "phone_code",
      phoneNumberId: sel.phoneNumberId,
    });
  }
}

type Step = "credentials" | "forgot" | "reset_code" | "needs_new_password" | "second_factor";

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
          focus:border-[#b89a5e] focus:bg-white focus:ring-3 focus:ring-[#b89a5e]/10
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
        bg-gradient-to-br from-[#8a7346] to-[#b89a5e]
        shadow-[0_4px_16px_rgba(184, 154, 94,0.38)]
        hover:from-[#b89a5e] hover:to-[#9a7d4a]
        hover:shadow-[0_6px_22px_rgba(184, 154, 94,0.46)]
        hover:-translate-y-px
        active:translate-y-0 active:shadow-[0_2px_8px_rgba(184, 154, 94,0.35)]
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

function SessionExistsBox({
  onSignOutAndRetry,
  onGoToPanel,
  loading,
}: {
  onSignOutAndRetry: () => void;
  onGoToPanel: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[10px] bg-amber-50 border border-amber-200 px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <Icon icon="solar:shield-warning-bold-duotone" className="text-amber-600 text-lg shrink-0 mt-px" />
        <div>
          <p className="font-sora font-semibold text-amber-800 text-[0.8125rem] leading-snug">
            Ya tienes una sesión activa
          </p>
          <p className="font-sora text-amber-700 text-[0.75rem] leading-snug mt-1">
            Hay una sesión abierta en otro dispositivo o pestaña. Puedes cerrar sesión para usar este dispositivo o ir al panel si ya iniciaste sesión aquí.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGoToPanel}
          disabled={loading}
          className="font-sora text-[0.8125rem] font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2 disabled:opacity-60"
        >
          Ir al panel
        </button>
        <span className="text-amber-600">·</span>
        <button
          type="button"
          onClick={onSignOutAndRetry}
          disabled={loading}
          className="font-sora text-[0.8125rem] font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2 disabled:opacity-60"
        >
          Cerrar sesión e intentar de nuevo
        </button>
      </div>
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
const SESSION_EXISTS_MSG = "Ya tienes una sesión activa.";

export function CustomSignIn() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");

  // Si ya tiene sesión (ej. otra pestaña), redirigir al panel
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/admin");
    }
  }, [isLoaded, isSignedIn, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secondFactorCode, setSecondFactorCode] = useState("");
  const [secondFactorSelection, setSecondFactorSelection] =
    useState<SecondFactorSelection | null>(null);
  const [pendingSignIn, setPendingSignIn] = useState<SignInResource | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === "second_factor" && !secondFactorSelection) {
      setPendingSignIn(null);
      setResendCooldown(0);
      setSecondFactorCode("");
      setError("");
      setSuccess("");
      setStep("credentials");
    }
  }, [step, secondFactorSelection]);

  if (!isLoaded) return null;

  const clearMessages = () => { setError(""); setSuccess(""); };

  const goTo = (s: Step) => { clearMessages(); setStep(s); };

  /* ── Submit: email + password ── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;

    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm) { setError("Por favor ingresa tu correo electrónico."); return; }
    if (!password) { setError("Por favor ingresa tu contraseña."); return; }

    clearMessages();
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: emailNorm, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/admin");
      } else if (result.status === "needs_new_password") {
        // Clerk marca la contraseña como comprometida (ej: invitación con contraseña temporal)
        setPendingSignIn(result);
        setNewPassword("");
        setConfirmPassword("");
        setStep("needs_new_password");
      } else if (
        result.status === "needs_second_factor" ||
        (result.status as string) === "needs_client_trust"
      ) {
        const supported = result.supportedSecondFactors ?? [];
        const sel = resolveSecondFactorSelection(supported);
        if (!sel) {
          setError(
            "No hay un método de verificación compatible. Contacta al equipo de Almara."
          );
          return;
        }
        setSecondFactorSelection(sel);
        setPendingSignIn(result);
        setSecondFactorCode("");
        setResendCooldown(0);

        try {
          if (sel.strategy === "email_code" || sel.strategy === "phone_code") {
            await prepareSignInSecondFactor(result, sel);
          }
          if (sel.strategy === "email_code") {
            setSuccess(
              "Te enviamos un código de 6 dígitos a tu correo. Revisa también la carpeta de spam."
            );
          } else if (sel.strategy === "phone_code") {
            setSuccess("Te enviamos un código por SMS.");
          }
        } catch (prepErr) {
          setSecondFactorSelection(null);
          setPendingSignIn(null);
          setError(resolveClerkError(prepErr));
          return;
        }
        setStep("second_factor");
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

  /* ── Verificar segundo factor (correo, SMS, TOTP o código de respaldo) ── */
  const handleSecondFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSignIn || !secondFactorSelection) return;

    if (!secondFactorCode.trim()) { setError("Por favor ingresa el código de verificación."); return; }

    clearMessages();
    setLoading(true);
    try {
      const result = await pendingSignIn.attemptSecondFactor({
        strategy: secondFactorSelection.strategy,
        code: secondFactorCode.trim(),
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/admin");
      } else if (result.status === "needs_new_password") {
        setPendingSignIn(result);
        setSecondFactorSelection(null);
        setNewPassword("");
        setConfirmPassword("");
        setStep("needs_new_password");
      } else {
        setError("No se pudo verificar el código. Inténtalo de nuevo.");
      }
    } catch (err) {
      setError(resolveClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendSecondFactor = async () => {
    if (!pendingSignIn || !secondFactorSelection) return;
    if (secondFactorSelection.strategy !== "email_code" && secondFactorSelection.strategy !== "phone_code")
      return;
    if (resendCooldown > 0 || loading) return;

    clearMessages();
    setLoading(true);
    try {
      await prepareSignInSecondFactor(pendingSignIn, secondFactorSelection);
      setSuccess(
        secondFactorSelection.strategy === "email_code"
          ? "Te enviamos un código nuevo a tu correo."
          : "Te enviamos un código nuevo por SMS."
      );
      setResendCooldown(60);
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

    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm) { setError("Por favor ingresa tu correo electrónico."); return; }

    clearMessages();
    setLoading(true);
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: emailNorm });
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
                className="font-sora text-[0.78rem] text-[#b89a5e] hover:text-[#9a7d4a] font-medium transition-colors"
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

          {error === SESSION_EXISTS_MSG ? (
            <SessionExistsBox
              onGoToPanel={() => { clearMessages(); router.push("/admin"); }}
              onSignOutAndRetry={async () => {
                clearMessages();
                setLoading(true);
                try {
                  await signOut?.({ redirectUrl: window.location.href });
                } catch {
                  setError("No se pudo cerrar sesión. Inténtalo de nuevo.");
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          ) : error ? (
            <ErrorBox message={error} />
          ) : null}

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
            className="text-[#b89a5e] font-semibold hover:text-[#9a7d4a] transition-colors"
          >
            Regístrate
          </Link>
        </p>
      </div>
    );
  }

  /* ── PASO: segundo factor (correo / SMS / TOTP / respaldo) ── */
  if (step === "second_factor" && secondFactorSelection) {
    const sf = secondFactorSelection;
    const isEmail = sf.strategy === "email_code";
    const isPhone = sf.strategy === "phone_code";
    const isTOTP = sf.strategy === "totp";
    const isBackup = sf.strategy === "backup_code";
    const canResend = isEmail || isPhone;

    let description: string;
    let fieldLabel: string;
    if (isEmail) {
      description = `Te enviamos un código de 6 dígitos a ${sf.safeIdentifier}. Si no lo ves, revisa spam o promociones.`;
      fieldLabel = "Código del correo";
    } else if (isPhone) {
      description = `Ingresa el código que enviamos por SMS a ${sf.safeIdentifier}.`;
      fieldLabel = "Código SMS";
    } else if (isTOTP) {
      description =
        "Abre tu aplicación de autenticación (Google Authenticator, Authy, etc.) e ingresa el código de 6 dígitos.";
      fieldLabel = "Código de autenticador";
    } else {
      description = "Ingresa uno de tus códigos de respaldo.";
      fieldLabel = "Código de respaldo";
    }

    return (
      <div className="flex flex-col gap-5">
        <div>
          <BackButton
            onClick={() => {
              setPendingSignIn(null);
              setSecondFactorSelection(null);
              setResendCooldown(0);
              goTo("credentials");
            }}
          />
          <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-4">
            <Icon icon="solar:shield-keyhole-bold-duotone" className="text-[#b89a5e] text-2xl" />
          </div>
          <h1 className="font-sora font-extrabold text-[1.75rem] tracking-tight text-gray-900 leading-tight">
            Verificación en dos pasos
          </h1>
          <p className="font-sora text-gray-500 text-[0.9rem] mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>

        <form onSubmit={handleSecondFactor} className="flex flex-col gap-4" noValidate>
          <div>
            <Label>{fieldLabel}</Label>
            <Input
              type="text"
              placeholder={isBackup ? "XXXXXXXX" : "000000"}
              value={secondFactorCode}
              onChange={setSecondFactorCode}
              autoFocus
            />
          </div>

          {error && <ErrorBox message={error} />}
          {success && <SuccessBox message={success} />}

          <PrimaryButton loading={loading}>
            <Icon icon="solar:shield-check-bold-duotone" className="text-lg" />
            Verificar y acceder
          </PrimaryButton>
        </form>

        {canResend && (
          <div className="flex justify-center">
            <button
              type="button"
              disabled={loading || resendCooldown > 0}
              onClick={() => void handleResendSecondFactor()}
              className="font-sora text-[0.8125rem] font-medium text-[#b89a5e] hover:text-[#9a7d4a] disabled:opacity-50 disabled:cursor-not-allowed underline underline-offset-2"
            >
              {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : "Reenviar código"}
            </button>
          </div>
        )}

        <div className="rounded-[10px] bg-amber-50 border border-amber-200 px-3.5 py-3">
          <p className="font-sora text-amber-700 text-[0.8125rem] leading-snug">
            {isEmail ? (
              <>
                <span className="font-semibold">¿No llega el correo?</span>{" "}
                Espera un minuto, revisa spam y usa &quot;Reenviar código&quot;. Si sigue fallando, pide a un
                administrador que revise el envío de emails en Clerk o contacte al equipo de Almara.
              </>
            ) : isPhone ? (
              <>
                <span className="font-semibold">¿No recibiste el SMS?</span>{" "}
                Comprueba la señal y usa &quot;Reenviar código&quot;. Si persiste el problema, contacta al equipo de
                Almara.
              </>
            ) : (
              <>
                <span className="font-semibold">¿Problemas con la verificación?</span>{" "}
                Pide a un administrador que revise tu cuenta en Clerk o contacte al equipo de Almara.
              </>
            )}
          </p>
        </div>
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

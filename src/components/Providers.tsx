"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import type { LocalizationResource } from "@clerk/types";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { ReactNode } from "react";

/** Localización en español con overrides para el admin */
const localization: LocalizationResource = {
  ...esES,
  signIn: {
    ...esES.signIn,
    start: {
      ...esES.signIn?.start,
      title: "Iniciar sesión en Almara",
      subtitle: "¡Bienvenido de nuevo! Continúa para iniciar sesión.",
      actionText: "¿No tienes cuenta?",
      actionLink: "Regístrate",
    },
  },
  signUp: {
    ...esES.signUp,
    start: {
      ...esES.signUp?.start,
      title: "Crear cuenta en Almara",
      subtitle: "Completa los datos para acceder al panel.",
      actionText: "¿Ya tienes cuenta?",
      actionLink: "Iniciar sesión",
    },
  },
  formFieldLabel__emailAddress: "Correo electrónico",
  formFieldInputPlaceholder__emailAddress: "Ingresa tu correo electrónico",
  formButtonPrimary: "Continuar",
  socialButtonsBlockButton: "Continuar con {{provider|titleize}}",
  dividerText: "o",
  footerPageLink__help: "Ayuda",
  footerPageLink__privacy: "Privacidad",
  footerPageLink__terms: "Términos",
  badge__unverified: "No verificado",
  formFieldAction__forgotPassword: "¿Olvidaste tu contraseña?",
};

/**
 * Appearance Clerk: card flat; colores marca Almara (champagne gold).
 */
const clerkAppearance = {
  variables: {
    colorPrimary: "#B89A5E",
    colorText: "#1A1A24",
    colorTextSecondary: "#6B6B7A",
    colorBackground: "transparent",
    colorInputBackground: "#f9fafb",
    colorInputText: "#1A1A24",
    fontFamily: "var(--font-sora), system-ui, sans-serif",
    borderRadius: "10px",
    fontSize: "15px",
  },
  elements: {
    rootBox: "w-full",
    card: "shadow-none border-0 bg-transparent p-0 rounded-none",
    cardBox: "shadow-none border-0 bg-transparent gap-0",
    headerTitle: "font-sora font-extrabold text-[1.875rem] tracking-tight text-gray-900",
    headerSubtitle: "font-sora text-[0.9375rem] text-gray-500 font-normal",
    formFieldLabel: "font-sora font-medium text-sm text-gray-700",
    formFieldInput: "font-sora rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 text-[0.9375rem]",
    formButtonPrimary:
      "font-sora font-bold rounded-[10px] bg-gradient-to-br from-[#9a7d4a] to-[#b89a5e] text-[#0f0f18]",
    formButtonReset: "font-sora text-[#8a7346] text-sm font-medium",
    footerActionLink: "font-sora text-[#8a7346] font-semibold",
    footerActionText: "font-sora text-gray-500",
    footer: "bg-transparent border-0 mt-5 p-0",
    socialButtonsBlockButton:
      "font-sora rounded-[10px] border-[1.5px] border-gray-200 bg-white text-gray-700 font-medium",
    dividerText: "font-sora text-gray-400 font-medium uppercase text-[0.8125rem] tracking-wider",
    dividerLine: "bg-gray-100",
    identityPreviewEditButton: "text-[#8a7346] font-sora text-sm",
    formFieldAction: "font-sora text-[#8a7346] text-[0.8125rem] font-medium",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <HeroUIProvider>
      <ToastProvider
        placement="bottom-right"
        toastProps={{
          classNames: {
            base: "bg-[#0f0f18]/95 backdrop-blur-xl border border-[#b89a5e]/20 shadow-xl",
            title: "text-white font-sora font-semibold",
            description: "text-white/70 text-sm",
          },
        }}
      />
      <ClerkProvider localization={localization} appearance={clerkAppearance}>
        {children}
      </ClerkProvider>
    </HeroUIProvider>
  );
}

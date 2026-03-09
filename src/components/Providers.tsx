"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import type { LocalizationResource } from "@clerk/types";
import { HeroUIProvider } from "@heroui/react";
import { ReactNode } from "react";

/** Localización en español con overrides para el admin */
const localization: LocalizationResource = {
  ...esES,
  signIn: {
    ...esES.signIn,
    start: {
      ...esES.signIn?.start,
      title: "Iniciar sesión en Newayzi",
      subtitle: "¡Bienvenido de nuevo! Continúa para iniciar sesión.",
      actionText: "¿No tienes cuenta?",
      actionLink: "Regístrate",
    },
  },
  signUp: {
    ...esES.signUp,
    start: {
      ...esES.signUp?.start,
      title: "Crear cuenta en Newayzi",
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
 * Appearance Clerk: card completamente flat para integrarse al
 * panel blanco del layout split-screen. Colores de marca Newayzi.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: "#5E2CEC",
    colorText: "#111827",
    colorTextSecondary: "#6B7280",
    colorBackground: "transparent",
    colorInputBackground: "#f9fafb",
    colorInputText: "#111827",
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
    formButtonPrimary: "font-sora font-bold rounded-[10px] bg-gradient-to-br from-[#3d21c4] to-newayzi-majorelle",
    formButtonReset: "font-sora text-newayzi-majorelle text-sm font-medium",
    footerActionLink: "font-sora text-newayzi-majorelle font-semibold",
    footerActionText: "font-sora text-gray-500",
    footer: "bg-transparent border-0 mt-5 p-0",
    socialButtonsBlockButton: "font-sora rounded-[10px] border-[1.5px] border-gray-200 bg-white text-gray-700 font-medium",
    dividerText: "font-sora text-gray-400 font-medium uppercase text-[0.8125rem] tracking-wider",
    dividerLine: "bg-gray-100",
    identityPreviewEditButton: "text-newayzi-majorelle font-sora text-sm",
    formFieldAction: "font-sora text-newayzi-majorelle text-[0.8125rem] font-medium",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <HeroUIProvider>
      <ClerkProvider
        localization={localization}
        appearance={clerkAppearance}
      >
        {children}
      </ClerkProvider>
    </HeroUIProvider>
  );
}

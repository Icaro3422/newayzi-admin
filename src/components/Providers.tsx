"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { HeroUIProvider } from "@heroui/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <HeroUIProvider>
      <ClerkProvider
        appearance={{
          variables: {
            colorPrimary: "#5E2CEC",
            colorText: "#2D2D2D",
            fontFamily: "var(--font-sora), sans-serif",
            borderRadius: "12px",
          },
          elements: {
            card: "shadow-xl border border-gray-200",
            formFieldInput: "rounded-lg border-gray-200 focus:ring-2 focus:ring-newayzi-majorelle",
            formButtonPrimary: "bg-newayzi-majorelle hover:bg-newayzi-han-purple text-white",
            footerActionLink: "text-newayzi-majorelle hover:text-newayzi-han-purple",
          },
        }}
      >
        {children}
      </ClerkProvider>
    </HeroUIProvider>
  );
}

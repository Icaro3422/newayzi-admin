"use client";

import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";
import { Icon } from "@iconify/react";

const userProfileAppearance = {
  variables: {
    colorPrimary: "#5E2CEC",
    colorText: "#f3f4f6",
    colorTextSecondary: "#9ca3af",
    colorBackground: "#0f1220",
    colorInputBackground: "rgba(255,255,255,0.06)",
    colorInputText: "#f3f4f6",
    fontFamily: "var(--font-sora), system-ui, sans-serif",
    borderRadius: "12px",
  },
  elements: {
    rootBox: "w-full max-w-2xl mx-auto",
    card: "bg-[#0f1220]/95 border border-white/[0.12] shadow-xl rounded-2xl",
    navbar: "border-white/[0.08]",
    pageScrollBox: "p-6",
    headerTitle: "text-white font-sora font-bold",
    headerSubtitle: "text-white/60",
    formFieldLabel: "text-white/70",
    formFieldInput: "bg-white/[0.06] border-white/[0.12] text-white",
    formButtonPrimary: "bg-[#5e2cec] hover:bg-[#4c22c4]",
    formButtonReset: "text-[#9b74ff]",
    footerActionLink: "text-[#9b74ff]",
    footerActionText: "text-white/50",
    identityPreviewEditButton: "text-[#9b74ff]",
    accordionTriggerButton: "text-white",
    badge: "bg-[#5e2cec]/20 text-[#9b74ff]",
  },
};

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/profile"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          <Icon icon="solar:arrow-left-bold" width={18} />
          Volver a Mi perfil
        </Link>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/[0.09] bg-white/[0.02]">
        <UserProfile
          appearance={userProfileAppearance}
          routing="path"
          path="/admin/account"
        />
      </div>
    </div>
  );
}

"use client";

import { PaymentsRegions } from "@/components/admin/PaymentsRegions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdmin } from "@/contexts/AdminContext";
import { Icon } from "@iconify/react";

export default function AdminPaymentsPage() {
  const { canAccess } = useAdmin();

  if (!canAccess("payments")) {
    return (
      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-10 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto mb-4">
          <Icon icon="solar:shield-warning-bold-duotone" className="text-amber-400/90 text-2xl" />
        </div>
        <h1 className="font-sora font-bold text-white text-lg">Acceso restringido</h1>
        <p className="mt-2 text-sm text-white/55">
          La configuración de métodos de pago por región es solo para super administradores de la plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Métodos de pago por región"
        subtitle="Activa o desactiva cada método de pago (PayCo, Stripe, etc.) por región. Las API keys y webhooks siguen en variables de entorno del backend. Solo super admin."
      />
      <PaymentsRegions />
    </div>
  );
}

"use client";

import { PaymentsRegions } from "@/components/admin/PaymentsRegions";
import { PaymentGatewayAnalyticsPanel } from "@/components/admin/PaymentGatewayAnalyticsPanel";
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
    <div className="space-y-10">
      <AdminPageHeader
        title="Pagos y pasarelas"
        subtitle="Configuración regional y analítica de cobros al crear reservas (intentos, éxitos y rechazos). Solo super administrador."
      />
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
          <Icon icon="solar:map-point-bold-duotone" className="text-lg text-violet-400" />
          Métodos por región
        </h2>
        <PaymentsRegions />
      </section>
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
          <Icon icon="solar:chart-2-bold-duotone" className="text-lg text-emerald-400" />
          Analítica de pasarela (reservas)
        </h2>
        <p className="text-sm text-white/50 max-w-3xl leading-relaxed">
          Cada intento de pago al completar una reserva queda registrado en el backend (estado, código de respuesta,
          mensaje y, en Mercado Pago, <code className="text-violet-300/90">status_detail</code> en la respuesta).
          Aquí ves tasas de éxito y fallo, evolución diaria y el detalle de los últimos intentos.
        </p>
        <PaymentGatewayAnalyticsPanel />
      </section>
    </div>
  );
}

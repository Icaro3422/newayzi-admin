import { PaymentsRegions } from "@/components/admin/PaymentsRegions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Métodos de pago por región"
        subtitle="Activa o desactiva cada método de pago (PayCo, Stripe, etc.) por región. La configuración de API keys y webhooks sigue en variables de entorno del backend."
      />
      <PaymentsRegions />
    </div>
  );
}

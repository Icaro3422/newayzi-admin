import { PaymentsRegions } from "@/components/admin/PaymentsRegions";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
        Métodos de pago por región
      </h1>
      <p className="text-sm text-semantic-text-muted">
        Activa o desactiva cada método de pago (PayCo, Stripe, etc.) por región. La configuración de API keys y webhooks sigue en variables de entorno del backend.
      </p>
      <PaymentsRegions />
    </div>
  );
}

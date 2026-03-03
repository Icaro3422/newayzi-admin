import { ConnectionDetailClient } from "@/components/admin/ConnectionDetailClient";

export default function AdminConnectionDetailPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
        Detalle de conexión PMS
      </h1>
      <ConnectionDetailClient />
    </div>
  );
}

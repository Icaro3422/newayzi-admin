import { ConnectionDetailClient } from "@/components/admin/ConnectionDetailClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminConnectionDetailPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Detalle de conexión PMS"
        subtitle="Revisa el estado de sincronización y configura las credenciales"
      />
      <ConnectionDetailClient />
    </div>
  );
}

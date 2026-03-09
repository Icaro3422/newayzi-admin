import { CommunicationsClient } from "@/components/admin/CommunicationsClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminCommunicationsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Comunicaciones"
        subtitle="Envía emails masivos a grupos de usuarios usando las plantillas disponibles. Solo super-admin puede acceder."
      />
      <CommunicationsClient />
    </div>
  );
}

import { AdminProfileClient } from "@/components/admin/AdminProfileClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mi perfil"
        subtitle="Información personal, rol y datos de Newayzi Rewards según tu cuenta."
      />
      <AdminProfileClient />
    </div>
  );
}

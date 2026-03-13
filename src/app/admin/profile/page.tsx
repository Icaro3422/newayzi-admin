import { AdminProfileClient } from "@/components/admin/AdminProfileClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mi perfil"
        subtitle="Edita tu foto y datos personales. Para correo, contraseña y seguridad, usa Mi cuenta."
      />
      <AdminProfileClient />
    </div>
  );
}

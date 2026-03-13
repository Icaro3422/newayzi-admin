import { AdminProfileClient } from "@/components/admin/AdminProfileClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mi perfil"
        subtitle="Edita tu foto, nombre y datos. Para correo y contraseña, usa el enlace de la tarjeta."
      />
      <AdminProfileClient />
    </div>
  );
}

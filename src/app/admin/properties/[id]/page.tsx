import { PropertyEditClient } from "@/components/admin/PropertyEditClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminPropertyEditPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Editar propiedad"
        subtitle="Modifica nombre, descripción, amenidades y visibilidad de la propiedad."
      />
      <PropertyEditClient />
    </div>
  );
}

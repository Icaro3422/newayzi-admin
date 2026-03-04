import { PropertiesList } from "@/components/admin/PropertiesList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminPropertiesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Propiedades"
        subtitle="Gestión de propiedades activas y publicadas. Filtra por estado, ciudad o conexión PMS."
      />
      <PropertiesList />
    </div>
  );
}

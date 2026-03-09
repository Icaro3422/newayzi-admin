import { AvailabilityList } from "@/components/admin/AvailabilityList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminAvailabilityPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Disponibilidad"
        subtitle="Mapa calendario y lista detallada. Filtra por operador, propiedad y fechas. Los operadores solo ven sus unidades."
      />
      <AvailabilityList />
    </div>
  );
}

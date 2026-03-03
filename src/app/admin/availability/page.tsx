import { AvailabilityList } from "@/components/admin/AvailabilityList";

export default function AdminAvailabilityPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
        Disponibilidad
      </h1>
      <p className="text-sm text-semantic-text-muted">
        Vista de disponibilidad por propiedad y tipo de habitación. Filtros por fechas y propiedad. Los operadores solo ven sus unidades.
      </p>
      <AvailabilityList />
    </div>
  );
}

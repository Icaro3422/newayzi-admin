import { AvailabilityList } from "@/components/admin/AvailabilityList";

export default function AdminAvailabilityPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
        Disponibilidad
      </h1>
      <p className="text-sm text-semantic-text-muted">
        Mapa calendario y lista detallada. Filtra por operador, propiedad y fechas. Los operadores solo ven sus unidades.
      </p>
      <AvailabilityList />
    </div>
  );
}

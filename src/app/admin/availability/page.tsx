"use client";

import { AvailabilityList } from "@/components/admin/AvailabilityList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdmin } from "@/contexts/AdminContext";

export default function AdminAvailabilityPage() {
  const { role } = useAdmin();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={role === "operador" ? "Mi disponibilidad" : "Disponibilidad"}
        subtitle={
          role === "operador"
            ? "Calendario de disponibilidad de tus propiedades. Filtra por propiedad y fechas."
            : role === "agente"
            ? "Solo lectura. Las propiedades visibles dependen de tu agencia (operador que te invitó o alcance definido por Newayzi)."
            : "Mapa calendario y lista detallada. Filtra por operador, propiedad y fechas."
        }
      />
      <AvailabilityList />
    </div>
  );
}

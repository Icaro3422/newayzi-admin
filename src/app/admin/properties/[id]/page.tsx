"use client";

import { PropertyEditClient } from "@/components/admin/PropertyEditClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdmin } from "@/contexts/AdminContext";

export default function AdminPropertyDetailPage() {
  const { canEditProperty } = useAdmin();
  const isReadOnly = !canEditProperty;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isReadOnly ? "Ver propiedad" : "Editar propiedad"}
        subtitle={
          isReadOnly
            ? "Consulta el detalle de la propiedad. Solo lectura."
            : "Modifica nombre, descripción, amenidades y visibilidad de la propiedad."
        }
      />
      <PropertyEditClient />
    </div>
  );
}

"use client";

import { RoomTypeEditClient } from "@/components/admin/RoomTypeEditClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdmin } from "@/contexts/AdminContext";

export default function AdminRoomTypeDetailPage() {
  const { canEditProperty } = useAdmin();
  const readOnly = !canEditProperty;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={readOnly ? "Ver tipo de habitación" : "Tipo de habitación"}
        subtitle={
          readOnly
            ? "Consulta los datos y la galería de este tipo de habitación."
            : "Edita la información y las imágenes específicas de este tipo de habitación."
        }
      />
      <RoomTypeEditClient />
    </div>
  );
}

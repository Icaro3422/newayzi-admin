"use client";

import { useState } from "react";
import { ConnectionsList } from "@/components/admin/ConnectionsList";
import { ConnectionTypesInfo } from "@/components/admin/ConnectionTypesInfo";
import { ConnectionCreateButton } from "@/components/admin/ConnectionCreateButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminConnectionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Conexiones PMS"
        subtitle="Integra cualquier PMS: desde APIs genéricas (URL + usuario + contraseña) hasta sistemas predefinidos como Kunas, CloudBeds o Stays. Solo el super-admin puede crear y activar/desactivar. Cada operador puede sincronizar sus propias conexiones."
      >
        <ConnectionCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </AdminPageHeader>
      <ConnectionTypesInfo />
      <ConnectionsList refreshKey={refreshKey} />
    </div>
  );
}

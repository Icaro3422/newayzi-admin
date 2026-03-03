"use client";

import { useState } from "react";
import { ConnectionsList } from "@/components/admin/ConnectionsList";
import { ConnectionTypesInfo } from "@/components/admin/ConnectionTypesInfo";
import { ConnectionCreateButton } from "@/components/admin/ConnectionCreateButton";

export default function AdminConnectionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
          Conexiones PMS
        </h1>
        <ConnectionCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>
      <p className="text-sm text-semantic-text-muted">
        Integra cualquier PMS: desde APIs genéricas (URL + usuario + contraseña) hasta sistemas predefinidos como Kunas, CloudBeds o Stays. Solo el super-admin puede crear y activar/desactivar. Cada operador puede sincronizar sus propias conexiones.
      </p>
      <ConnectionTypesInfo />
      <ConnectionsList refreshKey={refreshKey} />
    </div>
  );
}

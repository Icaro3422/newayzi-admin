"use client";

import { useState } from "react";
import { ConnectionsList } from "@/components/admin/ConnectionsList";
import { ConnectionTypesInfo } from "@/components/admin/ConnectionTypesInfo";
import { ConnectionCreateButton } from "@/components/admin/ConnectionCreateButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdmin } from "@/contexts/AdminContext";
import { Icon } from "@iconify/react";

export default function AdminConnectionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { role } = useAdmin();
  const isOperador = role === "operador";
  const isSuperAdmin = role === "super_admin";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isOperador ? "Mis conexiones PMS" : "Conexiones PMS"}
        subtitle={
          isOperador
            ? "Conexiones PMS asociadas a tus propiedades. Puedes sincronizarlas manualmente cuando lo necesites."
            : "Gestiona las integraciones con PMS. Solo el super-admin puede crear y activar/desactivar conexiones."
        }
      >
        {/* Solo super_admin puede crear nuevas conexiones */}
        {isSuperAdmin && <ConnectionCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />}
      </AdminPageHeader>

      {isOperador && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
          <Icon icon="solar:sync-bold-duotone" className="text-amber-400 text-lg shrink-0" />
          <p className="text-amber-200 text-[0.8125rem]">
            Puedes ver el estado de tus conexiones y lanzar una sincronización manual desde el detalle de cada una.
          </p>
        </div>
      )}

      <ConnectionTypesInfo />
      <ConnectionsList refreshKey={refreshKey} />
    </div>
  );
}

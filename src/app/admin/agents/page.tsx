"use client";

import { useState } from "react";
import { AgenciesList } from "@/components/admin/AgenciesList";
import { AgencyCreateButton } from "@/components/admin/AgencyCreateButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminAgentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Agentes"
        subtitle="Agencias que venden disponibilidad de hoteles/operadores. Niveles por ventas y comisiones."
      >
        <AgencyCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </AdminPageHeader>
      <AgenciesList refreshKey={refreshKey} />
    </div>
  );
}

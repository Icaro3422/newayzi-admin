"use client";

import { useState } from "react";
import { AgenciesList } from "@/components/admin/AgenciesList";
import { AgencyCreateButton } from "@/components/admin/AgencyCreateButton";

export default function AdminAgentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-newayzi-jet">Agentes</h1>
          <p className="mt-1 text-sm text-semantic-text-muted">
            Agencias que venden disponibilidad de hoteles/operadores. Niveles por ventas y comisiones.
          </p>
        </div>
        <AgencyCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>
      <AgenciesList refreshKey={refreshKey} />
    </div>
  );
}

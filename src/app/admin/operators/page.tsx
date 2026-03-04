"use client";

import { useState } from "react";
import { OperatorsList } from "@/components/admin/OperatorsList";
import { OperatorCreateButton } from "@/components/admin/OperatorCreateButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminOperatorsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Operadores"
        subtitle="Solo el super-admin puede crear y editar operadores. Las conexiones PMS se asignan a un operador desde el detalle de la conexión."
      >
        <OperatorCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </AdminPageHeader>
      <OperatorsList refreshKey={refreshKey} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { OperatorsList } from "@/components/admin/OperatorsList";
import { OperatorCreateButton } from "@/components/admin/OperatorCreateButton";

export default function AdminOperatorsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
          Operadores
        </h1>
        <OperatorCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>
      <p className="text-sm text-semantic-text-muted">
        Solo el super-admin puede crear y editar operadores. Las conexiones PMS se asignan a un operador desde el detalle de la conexión.
      </p>
      <OperatorsList refreshKey={refreshKey} />
    </div>
  );
}

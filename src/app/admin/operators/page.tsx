"use client";

import { useState } from "react";
import { OperatorsList } from "@/components/admin/OperatorsList";
import { OperatorCreateButton } from "@/components/admin/OperatorCreateButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdmin } from "@/contexts/AdminContext";
import { isModuleReadOnly } from "@/lib/admin-api";
import { Icon } from "@iconify/react";

export default function AdminOperatorsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { role } = useAdmin();
  const readOnly = isModuleReadOnly(role, "operators");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Operadores"
        subtitle={
          readOnly
            ? "Puedes ver los operadores y sus acuerdos de Rewards. Para hacer cambios, contacta a un super-admin."
            : "Crea y edita operadores. Las conexiones PMS se asignan desde el detalle de la conexión."
        }
      >
        {!readOnly && <OperatorCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />}
      </AdminPageHeader>

      {readOnly && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3">
          <Icon icon="solar:eye-bold-duotone" className="text-blue-400 text-lg shrink-0" />
          <p className="text-blue-300 text-[0.8125rem]">
            Vista de solo lectura — tu rol <strong>Comercial</strong> permite consultar operadores pero no modificarlos.
          </p>
        </div>
      )}

      <OperatorsList refreshKey={refreshKey} />
    </div>
  );
}

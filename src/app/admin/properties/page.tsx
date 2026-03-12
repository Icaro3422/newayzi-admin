"use client";

import { PropertiesList } from "@/components/admin/PropertiesList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdmin } from "@/contexts/AdminContext";
import { isModuleReadOnly } from "@/lib/admin-api";
import { Icon } from "@iconify/react";

export default function AdminPropertiesPage() {
  const { role } = useAdmin();
  const readOnly = isModuleReadOnly(role, "properties");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={role === "operador" ? "Mis propiedades" : "Propiedades"}
        subtitle={
          role === "operador"
            ? "Propiedades asignadas a tu operador. Actívalas o publícalas según corresponda."
            : readOnly
            ? "Vista de solo lectura de todas las propiedades de la plataforma."
            : "Gestión de propiedades activas y publicadas. Filtra por estado, ciudad o conexión PMS."
        }
      />
      {readOnly && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3">
          <Icon icon="solar:eye-bold-duotone" className="text-blue-400 text-lg shrink-0" />
          <p className="text-blue-300 text-[0.8125rem]">
            Vista de solo lectura — puedes consultar las propiedades pero no modificarlas.
          </p>
        </div>
      )}
      <PropertiesList />
    </div>
  );
}

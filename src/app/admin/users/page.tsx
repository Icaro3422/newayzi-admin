"use client";

import { useState } from "react";
import { UsersList } from "@/components/admin/UsersList";
import { UserCreateButton } from "@/components/admin/UserCreateButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminUsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Usuarios y roles"
        subtitle="Asigna rol (super_admin, visualizador, comercial, operador) y operador a cada usuario. Solo el super-admin puede ver y editar esta sección."
      >
        <UserCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </AdminPageHeader>
      <UsersList key={refreshKey} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { UsersList } from "@/components/admin/UsersList";
import { UserCreateButton } from "@/components/admin/UserCreateButton";

export default function AdminUsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
            Usuarios y roles
          </h1>
          <p className="mt-1 text-sm text-semantic-text-muted">
            Asigna rol (super_admin, visualizador, comercial, operador) y operador a cada usuario. Solo el super-admin puede ver y editar esta sección.
          </p>
        </div>
        <UserCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>
      <UsersList key={refreshKey} />
    </div>
  );
}

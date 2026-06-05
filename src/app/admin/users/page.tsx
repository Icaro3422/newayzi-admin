"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { UsersList } from "@/components/admin/UsersList";
import { UserCreateButton } from "@/components/admin/UserCreateButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminUsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Usuarios y roles"
        subtitle="Gestiona cuentas admin (operadores, agentes, comercial). Para prepago corporativo y magic link de huéspedes, usa Créditos corporativos."
      >
        <UserCreateButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </AdminPageHeader>

      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 px-4 py-3 text-sm text-white/70">
        <strong className="text-violet-200">Prepago corporativo</strong> — acreditar puntos, crear huésped por email y
        reenviar enlaces →{" "}
        <Link href="/admin/corporate-credits" className="text-violet-300 underline hover:text-violet-200">
          Créditos corporativos
        </Link>
        . Aquí solo creas cuentas y asignas roles; los puntos iniciales del formulario son ajustes manuales, no prepago
        con referencia bancaria.
      </div>

      <UsersList key={refreshKey} />
    </div>
  );
}

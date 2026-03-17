"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, isModuleReadOnly, type Operator } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

export function OperatorsList({ refreshKey = 0 }: { refreshKey?: number }) {
  const { canAccess, role } = useAdmin();
  // comercial puede ver operadores pero no editar
  const canEdit = canAccess("operators") && !isModuleReadOnly(role, "operators");
  const [list, setList] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getOperators()
      .then((res) => setList(res?.results ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner
          size="lg"
          classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }}
        />
      </GlassCard>
    );
  }

  if (list.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 flex items-center justify-center mb-4">
          <Icon icon="solar:users-group-rounded-bold-duotone" className="text-[#9b74ff] text-2xl" />
        </div>
        <p className="font-sora font-bold text-white text-base">No hay operadores</p>
        <p className="mt-2 text-sm text-white/50">
          {canEdit ? "Crea el primer operador desde el botón superior." : "No hay operadores registrados aún."}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Nombre
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Contacto
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Conexiones
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Estado
              </th>
              {canAccess("operators") && (
                <th className="text-right py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                  {canEdit ? "Acciones" : "Detalle"}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {list.map((op) => (
              <tr
                key={op.id}
                className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-4 px-5">
                  <Link
                    href={`/admin/operators/${op.id}`}
                    className="font-sora font-semibold text-[#9b74ff] hover:text-[#b89eff] transition-colors"
                  >
                    {op.name}
                  </Link>
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">
                  {op.contact_email || op.contact_phone || "—"}
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">{op.connections_count ?? 0}</td>
                <td className="py-4 px-5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${
                      op.is_active
                        ? "bg-emerald-500/25 border border-emerald-400/30 text-emerald-300"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {op.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {canAccess("operators") && (
                  <td className="py-4 px-5 text-right">
                    <Button
                      as={Link}
                      href={`/admin/operators/${op.id}`}
                      size="sm"
                      className="rounded-xl bg-[#5e2cec]/25 border border-[#5e2cec]/40 text-[#b89eff] hover:bg-[#5e2cec]/35 font-semibold"
                    >
                      {canEdit ? "Editar" : "Ver"}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

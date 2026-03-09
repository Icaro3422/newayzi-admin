"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type Agency } from "@/lib/admin-api";
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

function formatCurrency(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function AgenciesList({ refreshKey = 0 }: { refreshKey?: number }) {
  const { canAccess } = useAdmin();
  const [list, setList] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getAgencies()
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
          <Icon icon="solar:bag-4-bold-duotone" className="text-[#9b74ff] text-2xl" />
        </div>
        <p className="font-sora font-bold text-white text-base">No hay agencias</p>
        <p className="mt-2 text-sm text-white/50">
          Usa &quot;Invitar agente&quot; para crear una nueva.
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
                Nivel
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Ventas
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Comisión
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Reservas
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Estado
              </th>
              <th className="text-right py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr
                key={a.id}
                className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-4 px-5">
                  <Link
                    href={`/admin/agents/${a.id}`}
                    className="font-sora font-semibold text-[#9b74ff] hover:text-[#b89eff] transition-colors"
                  >
                    {a.name}
                  </Link>
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">
                  {a.contact_email || a.contact_phone || "—"}
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">{a.level_name ?? "—"}</td>
                <td className="py-4 px-5 text-white/70 text-sm">{formatCurrency(a.total_sales)}</td>
                <td className="py-4 px-5 text-white/70 text-sm">
                  {formatCurrency(a.total_commission)}
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">{a.bookings_count}</td>
                <td className="py-4 px-5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${
                      a.is_active
                        ? "bg-emerald-500/25 border border-emerald-400/30 text-emerald-300"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {a.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="py-4 px-5 text-right">
                  <Button
                    as={Link}
                    href={`/admin/agents/${a.id}`}
                    size="sm"
                    className="rounded-xl bg-[#5e2cec]/25 border border-[#5e2cec]/40 text-[#b89eff] hover:bg-[#5e2cec]/35 font-semibold"
                  >
                    Ver detalle
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

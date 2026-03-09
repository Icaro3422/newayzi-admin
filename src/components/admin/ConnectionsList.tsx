"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type PMSConnectionListItem } from "@/lib/admin-api";

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

export function ConnectionsList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [list, setList] = useState<PMSConnectionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getConnections()
      .then((res) => setList(res?.results ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
      </GlassCard>
    );
  }

  if (list.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 flex items-center justify-center mb-4">
          <Icon icon="solar:link-circle-bold-duotone" className="text-[#9b74ff] text-2xl" />
        </div>
        <p className="font-sora font-bold text-white text-base">Sin conexiones</p>
        <p className="mt-2 text-sm text-white/50">
          Crea una nueva conexión PMS para comenzar.
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
                Tipo PMS
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Operador
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Sincronizadas / Pendientes / No disp.
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Estado
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Última sync
              </th>
              <th className="text-right py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr
                key={c.id}
                className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-4 px-5 font-sora font-semibold text-white/90">
                  {c.name || c.pms_type}
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">
                  {c.pms_type_display || c.pms_type}
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">
                  {c.operator_name ?? "—"}
                </td>
                <td className="py-4 px-5 text-sm text-white/60">
                  {c.counts ? (
                    <span>
                      Prop: {c.counts.properties_synced} sinc. / {c.counts.properties_pending} pend. / {c.counts.properties_disabled} no disp.
                      <br />
                      Rooms: {c.counts.room_types_synced} sinc. / {c.counts.room_types_pending} pend. / {c.counts.room_types_disabled} no disp.
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-4 px-5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${
                      c.is_active
                        ? "bg-emerald-500/25 border border-emerald-400/30 text-emerald-300"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {c.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">
                  {c.last_sync_at
                    ? new Date(c.last_sync_at).toLocaleString("es")
                    : "—"}
                </td>
                <td className="py-4 px-5 text-right">
                  <Link
                    href={`/admin/connections/${c.id}`}
                    className="font-sora font-semibold text-[#9b74ff] hover:text-[#b89eff] transition-colors"
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

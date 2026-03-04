"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminApi } from "@/lib/admin-api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const CARD_BASE =
  "border border-gray-200/60 bg-white/90 backdrop-blur-sm rounded-[28px] shadow-md hover:shadow-lg hover:border-newayzi-majorelle/20 transition-all duration-300";

export function AdminDashboardClient() {
  const { me, role } = useAdmin();
  const [stats, setStats] = useState<{
    properties: number;
    connections: number;
    operators: number;
    syncedUnits: number;
    pendingUnits: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [propsRes, connRes, opRes] = await Promise.all([
          adminApi.getProperties(),
          adminApi.getConnections(),
          adminApi.getOperators(),
        ]);
        if (cancelled) return;
        const properties = propsRes?.results?.length ?? 0;
        const connections = connRes?.results?.length ?? 0;
        const operators = opRes?.results?.length ?? 0;
        let syncedUnits = 0;
        let pendingUnits = 0;
        if (connRes?.results?.length) {
          for (const c of connRes.results) {
            const [synced, pending] = await Promise.all([
              adminApi.getSyncedUnits(c.id),
              adminApi.getPendingUnits(c.id),
            ]);
            if (synced) syncedUnits += synced.length;
            if (pending) pendingUnits += pending.length;
          }
        }
        if (!cancelled) {
          setStats({
            properties,
            connections,
            operators,
            syncedUnits,
            pendingUnits,
          });
        }
      } catch {
        if (!cancelled) setStats(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionSubtitle = me
    ? `Sesión: ${me.profile.full_name || me.profile.email} · Rol: ${role ?? "—"}`
    : undefined;

  return (
    <>
      <AdminPageHeader title="Dashboard" subtitle={sessionSubtitle} />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className={CARD_BASE}>
          <CardBody className="flex-row items-center gap-4 p-6">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-newayzi-han-purple to-newayzi-majorelle shadow-[0_2px_12px_rgba(94,44,236,0.3)]">
              <Icon icon="solar:buildings-2-outline" className="text-white" width={28} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Propiedades activas</p>
              <p className="font-sora text-2xl font-bold text-newayzi-jet mt-1">
                {stats?.properties ?? "—"}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className={CARD_BASE}>
          <CardBody className="flex-row items-center gap-4 p-6">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-newayzi-majorelle to-newayzi-dark-orchid shadow-[0_2px_12px_rgba(94,44,236,0.3)]">
              <Icon icon="solar:link-circle-outline" className="text-white" width={28} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conexiones PMS</p>
              <p className="font-sora text-2xl font-bold text-newayzi-jet mt-1">
                {stats?.connections ?? "—"}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className={CARD_BASE}>
          <CardBody className="flex-row items-center gap-4 p-6">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_2px_12px_rgba(16,185,129,0.35)]">
              <Icon icon="solar:check-circle-outline" className="text-white" width={28} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidades sincronizadas</p>
              <p className="font-sora text-2xl font-bold text-newayzi-jet mt-1">
                {stats?.syncedUnits ?? "—"}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className={CARD_BASE}>
          <CardBody className="flex-row items-center gap-4 p-6">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_2px_12px_rgba(245,158,11,0.35)]">
              <Icon icon="solar:clock-circle-outline" className="text-white" width={28} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidades pendientes</p>
              <p className="font-sora text-2xl font-bold text-newayzi-jet mt-1">
                {stats?.pendingUnits ?? "—"}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {role === "super_admin" && stats && (
        <Card className={CARD_BASE}>
          <CardBody className="flex flex-row items-center gap-4 p-6">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-newayzi-dark-orchid to-newayzi-majorelle shadow-[0_2px_12px_rgba(94,44,236,0.3)]">
              <Icon icon="solar:users-group-rounded-outline" className="text-white" width={28} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Operadores</p>
              <p className="font-sora text-2xl font-bold text-newayzi-jet mt-1">{stats.operators}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card className={CARD_BASE}>
        <CardBody className="p-6">
          <p className="font-sora text-lg font-bold text-newayzi-jet">
            Bienvenido al panel de administración de Newayzi
          </p>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed font-sora">
            Usa el menú lateral para navegar. Los ítems visibles dependen de tu rol.
          </p>
        </CardBody>
      </Card>
    </>
  );
}

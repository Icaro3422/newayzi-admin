"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminApi } from "@/lib/admin-api";

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

  return (
    <>
      {me && (
        <p className="text-sm text-semantic-text-muted">
          Sesión: {me.profile.full_name} · Rol: {role ?? "—"}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-semantic-surface-border">
          <CardBody className="flex-row items-center gap-3">
            <div className="rounded-lg bg-newayzi-han-purple/10 p-2">
              <Icon icon="solar:buildings-2-outline" className="text-newayzi-han-purple" width={24} />
            </div>
            <div>
              <p className="text-sm text-semantic-text-muted">Propiedades activas</p>
              <p className="font-sora text-xl font-semibold text-newayzi-jet">
                {stats?.properties ?? "—"}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card className="border border-semantic-surface-border">
          <CardBody className="flex-row items-center gap-3">
            <div className="rounded-lg bg-newayzi-majorelle/10 p-2">
              <Icon icon="solar:link-circle-outline" className="text-newayzi-majorelle" width={24} />
            </div>
            <div>
              <p className="text-sm text-semantic-text-muted">Conexiones PMS</p>
              <p className="font-sora text-xl font-semibold text-newayzi-jet">
                {stats?.connections ?? "—"}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card className="border border-semantic-surface-border">
          <CardBody className="flex-row items-center gap-3">
            <div className="rounded-lg bg-newayzi-dark-orchid/10 p-2">
              <Icon icon="solar:check-circle-outline" className="text-newayzi-dark-orchid" width={24} />
            </div>
            <div>
              <p className="text-sm text-semantic-text-muted">Unidades sincronizadas</p>
              <p className="font-sora text-xl font-semibold text-newayzi-jet">
                {stats?.syncedUnits ?? "—"}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card className="border border-semantic-surface-border">
          <CardBody className="flex-row items-center gap-3">
            <div className="rounded-lg bg-newayzi-international-blue/10 p-2">
              <Icon icon="solar:clock-circle-outline" className="text-newayzi-international-blue" width={24} />
            </div>
            <div>
              <p className="text-sm text-semantic-text-muted">Unidades pendientes</p>
              <p className="font-sora text-xl font-semibold text-newayzi-jet">
                {stats?.pendingUnits ?? "—"}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
      {role === "super_admin" && stats && (
        <Card className="border border-semantic-surface-border">
          <CardBody>
            <p className="text-sm text-semantic-text-muted">Operadores</p>
            <p className="font-sora text-lg font-semibold text-newayzi-jet">{stats.operators}</p>
          </CardBody>
        </Card>
      )}
      <Card className="border border-semantic-surface-border">
        <CardBody>
          <p className="font-sora font-medium text-newayzi-jet">
            Bienvenido al panel de administración de Newayzi.
          </p>
          <p className="mt-2 text-sm text-semantic-text-muted">
            Usa el menú lateral para navegar. Los ítems visibles dependen de tu rol.
          </p>
        </CardBody>
      </Card>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  Button,
  Switch,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import { adminApi, type PMSConnectionDetail, type UnitsSummary } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

type TabKey = "synced" | "pending" | "disabled" | "available";

export function ConnectionDetailClient() {
  const params = useParams();
  const id = parseInt(String(params?.id ?? "0"), 10);
  const { canEditConnections, canSyncConnection } = useAdmin();
  const [connection, setConnection] = useState<PMSConnectionDetail | null>(null);
  const [unitsSummary, setUnitsSummary] = useState<UnitsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [patching, setPatching] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("synced");
  const [viewType, setViewType] = useState<"properties" | "room_types">("room_types");

  useEffect(() => {
    if (Number.isNaN(id) || id <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      adminApi.getConnection(id),
      adminApi.getUnitsSummary(id),
    ]).then(([conn, summary]) => {
      if (cancelled) return;
      setConnection(conn ?? null);
      setUnitsSummary(summary ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSyncNow() {
    if (!canSyncConnection) return;
    setSyncing(true);
    try {
      await adminApi.syncConnectionNow(id);
      const [conn, summary] = await Promise.all([
        adminApi.getConnection(id),
        adminApi.getUnitsSummary(id),
      ]);
      setConnection(conn ?? null);
      setUnitsSummary(summary ?? null);
    } finally {
      setSyncing(false);
    }
  }

  async function toggleActive() {
    if (!connection || !canEditConnections) return;
    setPatching(true);
    try {
      const updated = await adminApi.patchConnection(id, {
        is_active: !connection.is_active,
      });
      setConnection(updated);
    } finally {
      setPatching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }
  if (!connection) {
    return (
      <Card className="border border-semantic-surface-border">
        <CardBody>
          <p className="text-semantic-text-muted">Conexión no encontrada.</p>
          <Button as={Link} href="/admin/connections" className="mt-2">
            Volver
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button as={Link} href="/admin/connections" variant="flat" startContent={<Icon icon="solar:arrow-left-outline" width={18} />}>
          Volver
        </Button>
      </div>
      <Card className="border border-semantic-surface-border">
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-semantic-text-muted">Nombre / Tipo</p>
              <p className="font-sora font-semibold text-newayzi-jet">
                {connection.name || connection.pms_type} · {connection.pms_type}
              </p>
            </div>
            {canEditConnections && (
              <Switch
                isSelected={connection.is_active}
                onValueChange={toggleActive}
                isDisabled={patching}
              >
                Conexión activa
              </Switch>
            )}
          </div>
          {connection.operator_name && (
            <p className="text-sm">
              Operador: <span className="font-medium">{connection.operator_name}</span>
            </p>
          )}
          <p className="text-sm text-semantic-text-muted">
            Última sincronización:{" "}
            {connection.last_sync_at
              ? new Date(connection.last_sync_at).toLocaleString("es")
              : "Nunca"}
          </p>
          {canSyncConnection && (
            <Button
              color="primary"
              onPress={handleSyncNow}
              isLoading={syncing}
              startContent={!syncing ? <Icon icon="solar:refresh-outline" width={18} /> : undefined}
            >
              Sincronizar ahora
            </Button>
          )}
        </CardBody>
      </Card>

      <Card className="border border-semantic-surface-border">
        <CardBody>
          <div className="flex flex-wrap gap-2 border-b border-semantic-surface-border mb-4">
            {(["synced", "pending", "disabled", "available"] as TabKey[]).map((tab) => {
              const counts = unitsSummary?.counts;
              const label =
                tab === "synced"
                  ? "Sincronizadas"
                  : tab === "pending"
                    ? "Pendientes"
                    : tab === "disabled"
                      ? "No disponibles"
                      : "Disponibles";
              const count =
                viewType === "room_types"
                  ? (counts?.[`room_types_${tab}`] ?? 0)
                  : (counts?.[`properties_${tab}`] ?? 0);
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-newayzi-han-purple text-newayzi-han-purple"
                      : "border-transparent text-semantic-text-muted"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setViewType("properties")}
              className={`text-sm px-3 py-1 rounded ${
                viewType === "properties"
                  ? "bg-newayzi-han-purple/10 text-newayzi-han-purple"
                  : "text-semantic-text-muted"
              }`}
            >
              Propiedades
            </button>
            <button
              type="button"
              onClick={() => setViewType("room_types")}
              className={`text-sm px-3 py-1 rounded ${
                viewType === "room_types"
                  ? "bg-newayzi-han-purple/10 text-newayzi-han-purple"
                  : "text-semantic-text-muted"
              }`}
            >
              Tipos de habitación
            </button>
          </div>
          {(() => {
            const data = unitsSummary
              ? viewType === "properties"
                ? unitsSummary.properties[activeTab]
                : unitsSummary.room_types[activeTab]
              : [];
            const isRoom = viewType === "room_types";
            return (
              <Table aria-label={activeTab} classNames={{ wrapper: "shadow-none" }}>
                <TableHeader>
                  {isRoom ? (
                    <>
                      <TableColumn>Propiedad local</TableColumn>
                      <TableColumn>Tipo habitación</TableColumn>
                      <TableColumn>ID PMS</TableColumn>
                    </>
                  ) : (
                    <>
                      <TableColumn>Propiedad local</TableColumn>
                      <TableColumn>ID PMS</TableColumn>
                    </>
                  )}
                  <TableColumn>Estado</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isRoom ? 4 : 3} className="text-center text-semantic-text-muted">
                        No hay {activeTab === "synced" ? "sincronizadas" : activeTab === "pending" ? "pendientes" : activeTab === "disabled" ? "no disponibles" : "disponibles"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((u, i) => (
                      <TableRow key={i}>
                        {isRoom ? (
                          <>
                            <TableCell>{u.local_property_name ?? u.local_property_id ?? "—"}</TableCell>
                            <TableCell>{u.local_room_name ?? u.local_room_type_id ?? "—"}</TableCell>
                            <TableCell>{u.pms_room_id ?? u.pms_property_id ?? "—"}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>{u.local_property_name ?? u.local_property_id ?? "—"}</TableCell>
                            <TableCell>{u.pms_property_id ?? "—"}</TableCell>
                          </>
                        )}
                        <TableCell>{u.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            );
          })()}
        </CardBody>
      </Card>
    </div>
  );
}

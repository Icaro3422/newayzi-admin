"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Switch, Input, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import { adminApi, type PMSConnectionDetail, type UnitsSummary } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

type TabKey = "synced" | "pending" | "disabled" | "available";

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; dot: string; text: string }> = {
  synced:    { label: "Sincronizada",   dot: "bg-emerald-400", text: "text-emerald-300" },
  pending:   { label: "Pendiente",      dot: "bg-amber-400",   text: "text-amber-300"  },
  disabled:  { label: "No disponible",  dot: "bg-red-400",     text: "text-red-300"    },
  available: { label: "Disponible",     dot: "bg-blue-400",    text: "text-blue-300"   },
};

const inputDark = "rounded-xl border border-white/[0.12] bg-white/[0.04]";

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
  const [editingConfig, setEditingConfig] = useState(false);
  const [configBaseUrl, setConfigBaseUrl] = useState("");
  const [configUsername, setConfigUsername] = useState("");
  const [configPassword, setConfigPassword] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (Number.isNaN(id) || id <= 0) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([adminApi.getConnection(id), adminApi.getUnitsSummary(id)]).then(
      ([conn, summary]) => {
        if (cancelled) return;
        setConnection(conn ?? null);
        setUnitsSummary(summary ?? null);
        setLoading(false);
      }
    );
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (connection?.pms_type === "generic" && connection?.config) {
      const cfg = connection.config as Record<string, string>;
      setConfigBaseUrl(cfg.base_url ?? cfg.url ?? "");
      setConfigUsername(cfg.username ?? cfg.user ?? "");
    }
  }, [connection?.id, connection?.config]);

  async function handleSyncNow() {
    if (!canSyncConnection) return;
    setSyncing(true);
    try {
      await adminApi.syncConnectionNow(id);
      const [conn, summary] = await Promise.all([adminApi.getConnection(id), adminApi.getUnitsSummary(id)]);
      setConnection(conn ?? null);
      setUnitsSummary(summary ?? null);
    } finally { setSyncing(false); }
  }

  async function toggleActive() {
    if (!connection || !canEditConnections) return;
    setPatching(true);
    try {
      const updated = await adminApi.patchConnection(id, { is_active: !connection.is_active });
      setConnection(updated);
    } finally { setPatching(false); }
  }

  async function saveConfig() {
    if (!connection || !canEditConnections || connection.pms_type !== "generic") return;
    setSavingConfig(true);
    try {
      const updated = await adminApi.patchConnection(id, {
        config: { base_url: configBaseUrl.trim(), username: configUsername.trim(), password: configPassword || undefined },
      });
      setConnection(updated);
      setEditingConfig(false);
      setConfigPassword("");
    } finally { setSavingConfig(false); }
  }

  if (loading) {
    return (
      <GlassCard className="p-12 flex justify-center">
        <Spinner size="lg" color="secondary" />
      </GlassCard>
    );
  }

  if (!connection) {
    return (
      <GlassCard className="p-10 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-red-500/20 border border-red-400/30 p-4">
          <Icon icon="solar:plug-circle-broken" width={40} className="text-red-300" />
        </div>
        <p className="text-white/70 font-medium">Conexión no encontrada.</p>
        <Button
          as={Link}
          href="/admin/connections"
          variant="flat"
          className="!text-white/80 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12]"
          startContent={<Icon icon="solar:arrow-left-outline" width={16} />}
        >
          Volver a conexiones
        </Button>
      </GlassCard>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "synced",    label: "Sincronizadas"  },
    { key: "pending",   label: "Pendientes"     },
    { key: "disabled",  label: "No disponibles" },
    { key: "available", label: "Disponibles"    },
  ];

  const counts = unitsSummary?.counts;
  const tabCount = (tab: TabKey) =>
    viewType === "room_types"
      ? (counts?.[`room_types_${tab}`] ?? 0)
      : (counts?.[`properties_${tab}`] ?? 0);

  const tableData = unitsSummary
    ? viewType === "properties"
      ? unitsSummary.properties[activeTab]
      : unitsSummary.room_types[activeTab]
    : [];

  const isRoom = viewType === "room_types";

  return (
    <div className="space-y-5">
      {/* Back button */}
      <Button
        as={Link}
        href="/admin/connections"
        variant="flat"
        size="sm"
        className="!text-white/60 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] rounded-xl"
        startContent={<Icon icon="solar:arrow-left-outline" width={16} />}
      >
        Conexiones PMS
      </Button>

      {/* Header card */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 p-3 shrink-0">
              <Icon icon="solar:server-bold-duotone" width={28} className="text-[#b89eff]" />
            </div>
            <div>
              <h2 className="font-sora font-bold text-white text-lg leading-tight">
                {connection.name || connection.pms_type}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[0.65rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                  {connection.pms_type}
                </span>
                {connection.operator_name && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-[0.65rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                      {connection.operator_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {canEditConnections && (
              <Switch
                isSelected={connection.is_active}
                onValueChange={toggleActive}
                isDisabled={patching}
                color="secondary"
                classNames={{
                  wrapper: "group-data-[selected=true]:bg-[#5e2cec]",
                  label: "text-white/70 text-sm",
                }}
              >
                Conexión activa
              </Switch>
            )}
            {canSyncConnection && (
              <Button
                className="btn-newayzi-primary"
                onPress={handleSyncNow}
                isLoading={syncing}
                size="sm"
                startContent={!syncing ? <Icon icon="solar:refresh-bold" width={16} /> : undefined}
              >
                Sincronizar ahora
              </Button>
            )}
          </div>
        </div>

        {/* Last sync */}
        <div className="mt-5 flex items-center gap-2 text-sm text-white/40">
          <Icon icon="solar:clock-circle-outline" width={15} />
          <span>
            Última sincronización:{" "}
            <span className="text-white/60 font-medium">
              {connection.last_sync_at
                ? new Date(connection.last_sync_at).toLocaleString("es")
                : "Nunca"}
            </span>
          </span>
        </div>

        {/* Generic API credentials */}
        {connection.pms_type === "generic" && canEditConnections && (
          <div className="mt-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="solar:key-bold-duotone" width={17} className="text-[#b89eff]" />
                <p className="text-sm font-semibold text-white/80">Credenciales de la API</p>
              </div>
              {!editingConfig ? (
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setEditingConfig(true)}
                  className="!text-white/70 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12]"
                >
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    className="!text-white/60 bg-white/[0.05] border border-white/[0.1]"
                    onPress={() => {
                      setEditingConfig(false);
                      const cfg = (connection.config ?? {}) as Record<string, string>;
                      setConfigBaseUrl(cfg.base_url ?? cfg.url ?? "");
                      setConfigUsername(cfg.username ?? cfg.user ?? "");
                      setConfigPassword("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="btn-newayzi-primary"
                    onPress={saveConfig}
                    isLoading={savingConfig}
                    isDisabled={!configBaseUrl.trim() || !configUsername.trim()}
                  >
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            {editingConfig ? (
              <div className="space-y-3">
                <Input
                  label="URL de la API"
                  value={configBaseUrl}
                  onValueChange={setConfigBaseUrl}
                  placeholder="https://api.ejemplo.com"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Usuario"
                  value={configUsername}
                  onValueChange={setConfigUsername}
                  placeholder="Usuario o API key"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={configPassword}
                  onValueChange={setConfigPassword}
                  placeholder="Dejar vacío para mantener la actual"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
              </div>
            ) : (
              <div className="text-sm text-white/40 space-y-1">
                <p>URL: <span className="text-white/70">{configBaseUrl || "—"}</span></p>
                <p>Usuario: <span className="text-white/70">{configUsername || "—"}</span></p>
                <p>Contraseña: <span className="text-white/50 tracking-widest">••••••••</span></p>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Units table card */}
      <GlassCard className="overflow-hidden">
        {/* Tabs */}
        <div className="px-6 pt-5">
          <div className="flex flex-wrap gap-1 border-b border-white/[0.07] pb-0">
            {TABS.map((tab) => {
              const count = tabCount(tab.key);
              const style = STATUS_STYLES[tab.key];
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all duration-200 -mb-px ${
                    isActive
                      ? "text-white border-b-2 border-[#7c4dff]"
                      : "text-white/40 hover:text-white/70 border-b-2 border-transparent"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? style.dot : "bg-white/25"}`}
                  />
                  {tab.label}
                  <span
                    className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[#5e2cec]/30 text-[#b89eff]"
                        : "bg-white/[0.07] text-white/40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-3">
          <span className="text-[0.6rem] uppercase tracking-[0.12em] text-white/30 font-semibold mr-1">
            Ver por
          </span>
          {(["properties", "room_types"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewType(v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewType === v
                  ? "bg-[#5e2cec]/25 text-[#b89eff] border border-[#5e2cec]/30"
                  : "text-white/40 hover:text-white/70 border border-transparent"
              }`}
            >
              {v === "properties" ? "Propiedades" : "Tipos de habitación"}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.03]">
                <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                  Propiedad local
                </th>
                {isRoom && (
                  <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                    Tipo habitación
                  </th>
                )}
                <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                  ID PMS
                </th>
                <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td
                    colSpan={isRoom ? 4 : 3}
                    className="py-12 text-center text-white/30 text-sm"
                  >
                    No hay unidades en esta categoría
                  </td>
                </tr>
              ) : (
                tableData.map((u, i) => {
                  const st = STATUS_STYLES[u.status] ?? STATUS_STYLES.pending;
                  return (
                    <tr
                      key={i}
                      className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-6 py-3 text-white/80 font-medium">
                        {u.local_property_name ?? u.local_property_id ?? "—"}
                      </td>
                      {isRoom && (
                        <td className="px-6 py-3 text-white/70">
                          {u.local_room_name ?? u.local_room_type_id ?? "—"}
                        </td>
                      )}
                      <td className="px-6 py-3 font-mono text-[0.78rem] text-white/50">
                        {isRoom
                          ? (u.pms_room_id ?? u.pms_property_id ?? "—")
                          : (u.pms_property_id ?? "—")}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {tableData.length > 0 && (
          <div className="px-6 py-3 border-t border-white/[0.06] text-[0.65rem] text-white/30 uppercase tracking-widest">
            {tableData.length} {isRoom ? "tipos de habitación" : "propiedades"}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

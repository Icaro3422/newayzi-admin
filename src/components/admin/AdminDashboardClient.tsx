"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useAdmin } from "@/contexts/AdminContext";
import { adminApi, ROLE_META } from "@/lib/admin-api";
import type {
  AdminDashboardStats,
  Agency,
  OperatorRewardsData,
  PMSConnectionListItem,
  PropertyListItem,
} from "@/lib/admin-api";
import { rewardsAgreementsApi } from "@/lib/admin-api";
import {
  PARTNER_TIERS,
  tierKeyFromRewardsLabel,
  tierIndex,
  type PartnerTierKey,
} from "@/lib/operator-partner-program";
import { RewardPoolStatus } from "./RewardPoolStatus";

const OperatorInfrastructureCharts = dynamic(
  () => import("./OperatorInfrastructureCharts").then((m) => m.OperatorInfrastructureCharts),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[248px] rounded-2xl bg-white/[0.04] animate-pulse" />
          <div className="h-[248px] rounded-2xl bg-white/[0.04] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[280px] rounded-2xl bg-white/[0.04] animate-pulse" />
          <div className="h-[280px] rounded-2xl bg-white/[0.04] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4">
          <div className="h-[240px] rounded-2xl bg-white/[0.04] animate-pulse" />
          <div className="h-[240px] rounded-2xl bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    ),
  }
);

/* ─── Primitivos de UI (estilo imagen) ───────────────── */
function GlassCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function AccentCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] p-6 relative overflow-hidden ${className}`}
      style={{
        background: "radial-gradient(ellipse 90% 80% at 60% 55%, #5e2cec 0%, #3d21c4 45%, #2a178a 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 85% 10%, rgba(180,140,255,0.22) 0%, transparent 65%)" }}
      />
      <div className="absolute inset-0 rounded-[28px] border border-white/[0.18] pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StatChip({ label, value, icon, loading }: { label: string; value?: number | null; icon: string; loading: boolean }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.12em] font-semibold whitespace-nowrap">{label}</p>
      <div className="flex items-center gap-1.5">
        <Icon icon={icon} className="text-[#7c4cff] text-sm shrink-0" />
        <p className="font-sora font-black text-white text-2xl leading-none">
          {loading || value == null ? (
            <span className="inline-block w-10 h-6 rounded-md bg-white/10 animate-pulse" />
          ) : (
            value.toLocaleString()
          )}
        </p>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label, count }: { href: string; icon: string; label: string; count?: number | null }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.07] transition-all duration-200 group"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#5e2cec]/20 flex items-center justify-center shrink-0">
          <Icon icon={icon} className="text-[#9b74ff] text-base" />
        </div>
        <p className="text-white/80 text-[0.8125rem] font-medium group-hover:text-white transition-colors">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        {count != null && <span className="font-sora font-bold text-white/60 text-sm">{count}</span>}
        <Icon icon="solar:arrow-right-bold" className="text-white/25 text-sm group-hover:text-white/60 transition-colors" />
      </div>
    </Link>
  );
}

function relativeTime(iso: string | null) {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  return `Hace ${Math.floor(hrs / 24)} días`;
}

/* ─── Dashboard ──────────────────────────────────────── */
export function AdminDashboardClient() {
  const { me, role, canAccess } = useAdmin();
  const [connections, setConnections] = useState<PMSConnectionListItem[]>([]);
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [operators, setOperators] = useState<{ results: { id: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [operatorRewards, setOperatorRewards] = useState<OperatorRewardsData | null>(null);
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [propsRes, connRes, opRes, agenciesRes, statsRes] = await Promise.all([
          canAccess("properties") ? adminApi.getProperties() : Promise.resolve(null),
          canAccess("connections") ? adminApi.getConnections() : Promise.resolve(null),
          canAccess("operators") ? adminApi.getOperators() : Promise.resolve(null),
          canAccess("agents") ? adminApi.getAgencies() : Promise.resolve(null),
          (canAccess("properties") || canAccess("connections")) ? adminApi.getDashboardStats() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (propsRes?.results) setProperties(propsRes.results);
        if (connRes?.results) setConnections(connRes.results);
        if (opRes?.results) setOperators({ results: opRes.results });
        if (agenciesRes?.results) setAgencies(agenciesRes.results);
        if (statsRes) setDashboardStats(statsRes);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [canAccess, role]);

  // Cargar acuerdo comercial del operador
  useEffect(() => {
    if (role !== "operador" || !me?.operator_id) return;
    let cancelled = false;
    rewardsAgreementsApi.getForOperator(me.operator_id)
      .then((data) => { if (!cancelled) setOperatorRewards(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [role, me?.operator_id]);

  const totalSynced = connections.reduce(
    (s, c) => s + (c.counts?.room_types_synced ?? c.counts?.properties_synced ?? 0),
    0
  );
  const totalPending = connections.reduce(
    (s, c) => s + (c.counts?.room_types_pending ?? c.counts?.properties_pending ?? 0),
    0
  );
  const activeProps = properties.filter((p) => p.is_active).length;
  const publishedProps = properties.filter((p) => p.is_published).length;
  const operatorsCount = operators?.results?.length ?? 0;

  const loyalty = me?.loyalty;
  const displayName = me?.profile?.full_name || me?.profile?.email || "Admin";
  const roleMeta = role ? ROLE_META[role] : null;

  // ── Vista simplificada para AGENTE ──────────────────────────────────────
  if (role === "agente") {
    return (
      <div className="space-y-4 lg:space-y-5">
        <GlassCard className="flex flex-row items-center gap-4 py-4 px-5" style={{ borderLeft: `4px solid ${roleMeta?.color}50` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${roleMeta?.color}20` }}>
            <Icon icon={roleMeta?.icon ?? "solar:bag-4-bold-duotone"} className="text-xl" style={{ color: roleMeta?.color }} />
          </div>
          <div className="min-w-0">
            <p className="font-sora font-bold text-white text-[0.9375rem] leading-tight">
              Hola, {displayName}
            </p>
            <p className="mt-1 text-[0.8125rem] text-white/60">
              {roleMeta?.description} — Accedé a la disponibilidad desde el menú lateral.
            </p>
            {me?.agency?.inventory_hint && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[#5e2cec]/30 bg-[#5e2cec]/12 px-3.5 py-2.5">
                <Icon
                  icon="solar:buildings-2-bold-duotone"
                  className="text-[#b89eff] shrink-0 mt-0.5"
                  width={18}
                />
                <p className="text-[0.8125rem] text-white/75 leading-relaxed">{me.agency.inventory_hint}</p>
              </div>
            )}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <QuickLink href="/admin/availability" icon="solar:calendar-bold-duotone" label="Disponibilidad" />
          <QuickLink href="/admin/profile" icon="solar:user-circle-bold-duotone" label="Mi perfil" />
        </div>

        {/* Loyalty personal */}
        {loyalty && (
          <AccentCard className="flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/50 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Newayzi Rewards</p>
                <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">Nivel {loyalty.level}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Icon icon="solar:crown-bold-duotone" className="text-yellow-300 text-base" />
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.10] border border-white/[0.15] px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white/55 text-[0.65rem] uppercase tracking-wide">Puntos</p>
                <p className="font-sora font-black text-white text-3xl leading-none mt-0.5">{loyalty.points.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-white/55 text-[0.65rem] uppercase tracking-wide">Reservas</p>
                <p className="font-sora font-black text-white text-3xl leading-none mt-0.5">{loyalty.completedBookings}</p>
              </div>
            </div>
          </AccentCard>
        )}
      </div>
    );
  }

  // ── Vista para VISUALIZADOR ─────────────────────────────────────────────
  if (role === "visualizador") {
    return (
      <div className="space-y-4 lg:space-y-5">
        <GlassCard className="flex flex-row items-center gap-4 py-4 px-5" style={{ borderLeft: `4px solid ${roleMeta?.color}50` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${roleMeta?.color}20` }}>
            <Icon icon={roleMeta?.icon ?? "solar:eye-bold-duotone"} className="text-xl" style={{ color: roleMeta?.color }} />
          </div>
          <div className="min-w-0">
            <p className="font-sora font-bold text-white text-[0.9375rem] leading-tight">Hola, {displayName}</p>
            <p className="mt-1 text-[0.8125rem] text-white/60">{roleMeta?.description}</p>
          </div>
        </GlassCard>

        {/* Stats read-only */}
        <GlassCard>
          <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold mb-4">Vista general de la plataforma</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Propiedades", value: properties.length, icon: "solar:buildings-2-bold-duotone" },
              { label: "Activas", value: activeProps, icon: "solar:check-circle-bold-duotone" },
              { label: "Publicadas", value: publishedProps, icon: "solar:eye-bold-duotone" },
              { label: "Disponibilidad", value: null, icon: "solar:calendar-bold-duotone" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.1em] font-semibold truncate">{s.label}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Icon icon={s.icon} className="text-[#7c4cff] text-base shrink-0" />
                  <p className="font-sora font-black text-white text-2xl leading-none">
                    {loading ? <span className="inline-block w-8 h-5 rounded bg-white/10 animate-pulse" /> : (s.value ?? "—")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <QuickLink href="/admin/properties" icon="solar:buildings-2-bold-duotone" label="Ver propiedades" count={properties.length} />
          <QuickLink href="/admin/availability" icon="solar:calendar-bold-duotone" label="Disponibilidad" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* ── Bienvenida (arriba del todo) ── */}
      <GlassCard
        className="flex flex-row items-center gap-4 py-4 px-5"
        style={{ borderLeft: `4px solid ${roleMeta?.color ?? "#5e2cec"}50` }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${roleMeta?.color ?? "#5e2cec"}20` }}
        >
          <Icon icon={roleMeta?.icon ?? "solar:home-2-bold-duotone"} className="text-xl" style={{ color: roleMeta?.color ?? "#9b74ff" }} />
        </div>
        <div className="min-w-0">
          <p className="font-sora font-bold text-white text-[0.9375rem] leading-tight">
            {role === "operador" ? `Hola, ${displayName} — tu panel de gestión` : `Bienvenido al panel de administración de Newayzi`}
          </p>
          <p className="mt-1 text-[0.8125rem] text-white/60 leading-relaxed">
            {roleMeta?.description ?? "Usa el menú lateral para navegar. Los ítems visibles dependen de tu rol."}
          </p>
        </div>
      </GlassCard>

      {/* ── Header island ── */}
      <GlassCard className="flex flex-col gap-6 py-6 px-6 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-white/40 text-[0.65rem] uppercase tracking-[0.18em] font-semibold mb-1.5">
              {role === "operador" ? "Panel del operador" : "Panel de administración"}
            </p>
            <h1 className="font-sora font-black text-white text-2xl sm:text-3xl leading-tight tracking-tight">
              {displayName}
            </h1>
            {roleMeta && (
              <span
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full"
                style={{ background: `${roleMeta.color}18`, border: `1px solid ${roleMeta.color}35` }}
              >
                <Icon icon={roleMeta.icon} width={12} style={{ color: roleMeta.color }} />
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: roleMeta.color }}>
                  {roleMeta.label}
                </span>
              </span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── Reward Pool (solo super_admin) ── */}
      {role === "super_admin" && <RewardPoolStatus />}

      {/* ── Analíticas a ancho completo; Partner/Rewards + accesos en fila inferior ── */}
      <div className="space-y-4 lg:space-y-5">
        {/* Fila 1: Infraestructura / gráficas — 100% ancho */}
        <GlassCard className="flex w-full flex-col p-6 gap-6">
          <div className="flex items-start justify-between gap-4 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Infraestructura</p>
              <p className="font-sora font-bold text-white text-base leading-snug mt-1.5 break-words">
                Propiedades y conexiones
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
              <Icon icon="solar:graph-up-bold-duotone" className="text-[#9b74ff] text-base" />
            </div>
          </div>

          {/* Gráficas (Apache ECharts) — resumen, cartera y por conexión */}
          <div className="min-w-0">
            {loading ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="h-[248px] rounded-2xl bg-white/[0.04] animate-pulse" />
                  <div className="h-[248px] rounded-2xl bg-white/[0.04] animate-pulse" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="h-[280px] rounded-2xl bg-white/[0.04] animate-pulse" />
                  <div className="h-[280px] rounded-2xl bg-white/[0.04] animate-pulse" />
                </div>
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4">
                  <div className="h-[240px] rounded-2xl bg-white/[0.04] animate-pulse" />
                  <div className="h-[240px] rounded-2xl bg-white/[0.04] animate-pulse" />
                </div>
              </div>
            ) : (
              <OperatorInfrastructureCharts
                properties={properties}
                activeProps={activeProps}
                publishedProps={publishedProps}
                connections={connections}
                totalSynced={totalSynced}
                totalPending={totalPending}
                agenciesCount={agencies.length}
                showAgenciesBar={canAccess("agents")}
                operatorsCount={operatorsCount}
                showOperatorsBar={canAccess("operators")}
                averagePriceSynced={dashboardStats?.average_price_synced ?? null}
                currency={dashboardStats?.currency ?? "COP"}
                showPriceChart={
                  dashboardStats != null &&
                  dashboardStats.average_price_synced != null &&
                  (role === "super_admin"
                    ? (dashboardStats.properties_count ?? 0) > 0
                    : canAccess("connections") && totalSynced > 0)
                }
                superAdminPriceSection={
                  role === "super_admin"
                    ? {
                        loading,
                        details: dashboardStats?.price_details ?? null,
                        currency: dashboardStats?.currency ?? "COP",
                        globalAverage: dashboardStats?.average_price_synced ?? null,
                      }
                    : null
                }
              />
            )}
          </div>

          {/* Separador visual */}
          <div className="border-t border-white/[0.08] pt-5" />

          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <p className="text-white/40 text-[0.65rem] uppercase tracking-[0.12em] font-semibold mb-3">
              Estado de conexiones PMS
            </p>
            {connections.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 px-6 min-h-[90px]">
                <p className="text-white/40 text-[0.875rem] text-center leading-relaxed">
                  Sin conexiones PMS configuradas
                </p>
              </div>
            ) : (
              connections.slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  href="/admin/connections"
                  className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3.5 py-2.5 hover:bg-white/[0.08] transition-all gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.is_active ? "bg-emerald-400" : "bg-amber-400"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-white/80 text-[0.75rem] font-medium truncate">{c.name}</p>
                      <p className="text-white/35 text-[0.6rem]">{c.pms_type_display || c.pms_type}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white/50 text-[0.6rem]">{relativeTime(c.last_sync_at)}</p>
                    {c.counts && (
                      <p className="text-[0.58rem] text-emerald-400">{c.counts.room_types_synced} sync</p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </GlassCard>

        {/* Fila 2: Programa de Socios / Rewards + Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        {/* Card: Programa de Socios (operador), Newayzi Rewards (agente), o nada (comercial/super_admin) */}
        {role === "operador" ? (() => {
          const ag = operatorRewards?.activeAgreement ?? null;
          const stats = operatorRewards?.stats;

          const activeTierKey: PartnerTierKey | null = ag ? tierKeyFromRewardsLabel(ag.rewardsLabel) : null;
          const activeTier = activeTierKey ? PARTNER_TIERS.find((t) => t.key === activeTierKey) ?? null : null;
          const idxActive = tierIndex(activeTierKey);

          const nextTier =
            activeTierKey && activeTierKey !== "elite_partner"
              ? PARTNER_TIERS[tierIndex(activeTierKey) + 1] ?? null
              : null;

          return (
            <AccentCard className="flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-white/50 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">
                      Programa de Socios
                    </p>
                    {ag ? (
                      <span className="text-[0.58rem] font-bold uppercase tracking-wide text-emerald-300 bg-emerald-500/20 border border-emerald-400/25 rounded-full px-2 py-0.5">
                        Acuerdo activo
                      </span>
                    ) : (
                      <span className="text-[0.58rem] font-bold uppercase tracking-wide text-amber-200/90 bg-amber-500/15 border border-amber-400/20 rounded-full px-2 py-0.5">
                        Sin acuerdo
                      </span>
                    )}
                  </div>
                  <p className="font-sora font-bold text-white text-lg leading-tight">
                    {ag ? ag.rewardsLabelDisplay : "Sin nivel activo"}
                  </p>
                  <p className="text-white/50 text-[0.72rem] mt-1 leading-snug">
                    {ag
                      ? activeTier
                        ? activeTier.benefits[0]
                        : "Tu propiedad participa en Newayzi Rewards con los beneficios del acuerdo firmado."
                      : "Activa un nivel para que tus huéspedes reciban cashback en sus reservas y ganes visibilidad en el marketplace."}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-lg"
                  style={{
                    background: activeTier
                      ? `linear-gradient(145deg, ${activeTier.accentBg}, rgba(255,255,255,0.08))`
                      : "rgba(255,255,255,0.12)",
                  }}
                >
                  <Icon
                    icon={activeTier?.icon ?? "mdi:handshake"}
                    className="text-[1.65rem]"
                    style={{ color: activeTier?.accent ?? "rgba(255,255,255,0.85)" }}
                  />
                </div>
              </div>

              {/* Línea de niveles (Partner — Premium — Elite) */}
              <div className="flex items-center w-full mb-5 px-0.5">
                {PARTNER_TIERS.map((tier, idx) => {
                  const isActive = tier.key === activeTierKey;
                  const isReached = idxActive >= 0 && idx <= idxActive;
                  const dim = !ag && !isReached;
                  const segmentFilled = ag && idxActive >= idx;
                  return (
                    <div key={tier.key} className="contents">
                      {idx > 0 && (
                        <div className="flex-1 h-1 min-w-[6px] self-start mt-[22px] rounded-full bg-white/10 overflow-hidden shrink">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500 transition-all duration-500"
                            style={{ width: segmentFilled ? "100%" : "0%" }}
                          />
                        </div>
                      )}
                      <div className="flex flex-col items-center w-[30%] max-w-[104px] min-w-[76px] shrink-0">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                            isActive ? "scale-105 shadow-lg" : ""
                          }`}
                          style={{
                            borderColor: isActive
                              ? tier.accent
                              : isReached
                                ? "rgba(167,139,250,0.55)"
                                : tier.ringInactive,
                            background: isActive
                              ? `linear-gradient(160deg, ${tier.accent}35, rgba(0,0,0,0.15))`
                              : isReached
                                ? "rgba(139,92,246,0.2)"
                                : "rgba(255,255,255,0.06)",
                            boxShadow: isActive ? `0 0 20px ${String(tier.accent)}40` : undefined,
                          }}
                        >
                          <Icon
                            icon={tier.icon}
                            width={26}
                            height={26}
                            style={{
                              color: isActive
                                ? tier.accent
                                : isReached
                                  ? "#e9d5ff"
                                  : dim
                                    ? "rgba(255,255,255,0.28)"
                                    : "rgba(255,255,255,0.45)",
                              opacity: dim ? 0.75 : 1,
                            }}
                          />
                        </div>
                        <p
                          className={`text-[0.62rem] font-bold mt-2 text-center leading-tight px-0.5 ${
                            isActive ? "" : "text-white/40"
                          }`}
                          style={isActive ? { color: tier.accent } : undefined}
                        >
                          {tier.shortName}
                        </p>
                        <p className="text-[0.52rem] text-white/35 text-center leading-tight mt-0.5 hidden sm:block px-0.5">
                          {tier.badge}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {ag ? (
                /* ── CON ACUERDO ACTIVO ── */
                <>
                  {nextTier && (
                    <div className="rounded-xl bg-white/[0.08] border border-white/[0.12] px-3.5 py-2.5 mb-3 flex items-start gap-2">
                      <Icon icon="mdi:stairs-up" className="text-violet-300 text-lg shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-white/75 text-[0.72rem] font-semibold">Próximo escalón</p>
                        <p className="text-white/50 text-[0.68rem] leading-snug mt-0.5">
                          <span className="text-white/80">{nextTier.name}</span> — {nextTier.benefits[0].toLowerCase()}{" "}
                          Habla con Newayzi para evaluar un upgrade cuando tu operación lo permita.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTierKey === "elite_partner" && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 px-3.5 py-2.5 mb-3 flex items-center gap-2">
                      <Icon icon="mdi:star-four-points" className="text-amber-300 text-lg shrink-0" />
                      <p className="text-amber-100/90 text-[0.72rem] leading-snug">
                        Estás en el nivel máximo del programa. Gracias por ser socio estratégico Newayzi.
                      </p>
                    </div>
                  )}

                  {/* Métricas principales */}
                  <div className="rounded-2xl bg-white/[0.10] border border-white/[0.15] px-4 py-3.5 mb-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-white/50 text-[0.6rem] uppercase tracking-wide">Cashback a huéspedes</p>
                        <p className="font-sora font-black text-white text-2xl leading-none mt-0.5">
                          {ag.cashbackContributionPct}
                        </p>
                        <p className="text-white/35 text-[0.6rem] mt-0.5">por reserva confirmada</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/50 text-[0.6rem] uppercase tracking-wide">Reservas recompensadas</p>
                        <p className="font-sora font-black text-white text-2xl leading-none mt-0.5">
                          {stats?.bookingsRewarded ?? 0}
                        </p>
                        <p className="text-white/35 text-[0.6rem] mt-0.5">con cashback emitido</p>
                      </div>
                    </div>
                  </div>

                  {/* Detalles del nivel */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-xl bg-white/[0.07] border border-white/[0.1] px-3 py-2.5">
                      <p className="text-white/45 text-[0.58rem] uppercase tracking-wide">Visibilidad</p>
                      <p className="font-semibold text-white text-[0.78rem] mt-0.5 leading-tight">
                        {ag.visibilityBoostDisplay}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.07] border border-white/[0.1] px-3 py-2.5">
                      <p className="text-white/45 text-[0.58rem] uppercase tracking-wide">Cashback emitido</p>
                      <p className="font-semibold text-white text-[0.78rem] mt-0.5">
                        ${(stats?.cashbackEmitted ?? 0).toLocaleString("es-CO")}
                      </p>
                    </div>
                  </div>

                  {/* Estado y vigencia */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <p className="text-white/45 text-[0.62rem]">
                        Vigente desde {new Date(ag.effectiveFrom).toLocaleDateString("es-CO")}
                        {ag.effectiveUntil
                          ? ` · hasta ${new Date(ag.effectiveUntil).toLocaleDateString("es-CO")}`
                          : " · sin vencimiento"}
                      </p>
                    </div>
                    {ag.autoRenew && (
                      <span className="text-[0.58rem] text-violet-300 bg-violet-500/15 rounded-full px-2 py-0.5 border border-violet-400/20 w-fit">
                        Auto-renueva
                      </span>
                    )}
                  </div>
                </>
              ) : (
                /* ── SIN ACUERDO ACTIVO ── */
                <>
                  <div className="rounded-xl bg-amber-500/[0.12] border border-amber-400/25 px-3.5 py-3 mb-3">
                    <div className="flex items-start gap-2.5">
                      <Icon icon="mdi:lightbulb-on-outline" className="text-amber-300 text-xl shrink-0 mt-0.5" />
                      <div>
                        <p className="text-white/90 text-[0.78rem] font-semibold leading-tight">¿Cómo activarlo?</p>
                        <p className="text-white/60 text-[0.72rem] leading-relaxed mt-1">
                          Escríbenos desde tu canal habitual con Newayzi. Firmarás un acuerdo de socio, configuramos tu
                          porcentaje de cashback y tus huéspedes empezarán a ver recompensas en el checkout.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-white/40 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
                    Comparativa de niveles
                  </p>
                  <div className="space-y-2.5">
                    {PARTNER_TIERS.map((tier) => (
                      <div
                        key={tier.key}
                        className="rounded-2xl px-3.5 py-3 border flex gap-3 items-start"
                        style={{
                          background: tier.accentBg,
                          borderColor: `${tier.accent}30`,
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                          style={{ background: "rgba(0,0,0,0.2)" }}
                        >
                          <Icon icon={tier.icon} width={28} height={28} style={{ color: tier.accent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 gap-y-1">
                            <p className="font-sora font-bold text-white text-[0.85rem] leading-none">{tier.name}</p>
                            <span
                              className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${tier.accent}28`, color: tier.accent }}
                            >
                              {tier.badge}
                            </span>
                          </div>
                          <ul className="mt-2 space-y-1">
                            {tier.benefits.map((line) => (
                              <li
                                key={line}
                                className="text-white/55 text-[0.68rem] leading-snug flex gap-1.5 items-start"
                              >
                                <Icon icon="mdi:check-circle-outline" className="text-emerald-400/90 text-sm shrink-0 mt-0.5" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </AccentCard>
          );
        })() : !["super_admin", "comercial", "visualizador"].includes(role ?? "") ? (
          <AccentCard className="flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/50 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Newayzi Rewards</p>
                <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
                  {loyalty ? `Nivel ${loyalty.level}` : "Programa de lealtad"}
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Icon icon="solar:crown-bold-duotone" className="text-yellow-300 text-base" />
              </div>
            </div>

            {loyalty ? (
              <>
                <div className="rounded-2xl bg-white/[0.10] border border-white/[0.15] px-4 py-4 mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white/55 text-[0.65rem] uppercase tracking-wide">Puntos acumulados</p>
                    <p className="font-sora font-black text-white text-3xl leading-none mt-0.5">
                      {loyalty.points.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/55 text-[0.65rem] uppercase tracking-wide">Reservas totales</p>
                    <p className="font-sora font-black text-white text-3xl leading-none mt-0.5">
                      {loyalty.completedBookings}
                    </p>
                  </div>
                </div>

                {loyalty.progressToNextLevel && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-white/65 text-[0.7rem]">Progreso al siguiente nivel</p>
                      <p className="text-white/65 text-[0.7rem]">
                        {loyalty.progressToNextLevel.current} / {loyalty.progressToNextLevel.required}{" "}
                        <span className="text-white/40">{loyalty.progressToNextLevel.type}</span>
                      </p>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#9b74ff] transition-all duration-700"
                        style={{
                          width: `${Math.min(
                            (loyalty.progressToNextLevel.current / loyalty.progressToNextLevel.required) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-white/[0.08] border border-white/[0.12] px-3.5 py-3">
                    <p className="text-white/50 text-[0.62rem] uppercase tracking-wide">Este mes</p>
                    <p className="font-sora font-bold text-white text-xl mt-0.5">{loyalty.monthlyBookings}</p>
                    <p className="text-white/50 text-[0.65rem]">reservas</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.08] border border-white/[0.12] px-3.5 py-3">
                    <p className="text-white/50 text-[0.62rem] uppercase tracking-wide">Total gastado</p>
                    <p className="font-sora font-bold text-white text-xl mt-0.5">
                      ${loyalty.totalSpent.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-[0.65rem]">acumulado</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-white/70 text-[0.82rem] leading-relaxed mb-4">
                  Cada reserva confirmada acumula puntos que se convierten en descuentos directos.
                </p>
                {[
                  { name: "Member", badge: "Nivel base", color: "30%", accent: "rgba(160,160,180,0.9)" },
                  { name: "Plus", badge: "Nivel medio", color: "60%", accent: "#9b74ff" },
                  { name: "Premium", badge: "Nivel máximo", color: "95%", accent: "#fbbf24" },
                ].map((lvl) => (
                  <div
                    key={lvl.name}
                    className="flex items-center gap-3 rounded-2xl px-4 py-2.5 bg-white/[0.08] border border-white/[0.1] mb-2"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: lvl.accent }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-sora font-bold text-white text-sm leading-none">{lvl.name}</p>
                      <p className="text-white/55 text-[0.7rem] mt-0.5">{lvl.badge}</p>
                    </div>
                    <div className="w-20 h-1.5 rounded-full overflow-hidden bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: lvl.color, background: lvl.accent }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </AccentCard>
        ) : null}

        {/* Card Accesos rápidos — filtrados por rol (ancho completo si no hay tarjeta central) */}
        <GlassCard
          className={`flex flex-col ${
            !(
              role === "operador" ||
              (role != null && !["super_admin", "comercial", "visualizador"].includes(role))
            )
              ? "md:col-span-2"
              : ""
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-5 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Accesos rápidos</p>
              <p className="font-sora font-bold text-white text-base leading-snug mt-1">
                {role === "operador" ? "Tu gestión" : "Módulos del panel"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
              <Icon icon="solar:widget-5-bold-duotone" className="text-[#9b74ff] text-base" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { href: "/admin/bookings",      icon: "solar:bookmark-bold-duotone",           label: ["operador", "agente"].includes(role ?? "") ? "Mis reservas" : "Reservas", count: undefined, show: canAccess("bookings") },
              { href: "/admin/reviews",       icon: "solar:stars-bold-duotone",              label: "Reseñas",         count: undefined,          show: canAccess("reviews") },
              { href: "/admin/analytics",     icon: "solar:chart-2-bold-duotone",            label: "Analytics",       count: undefined,          show: canAccess("analytics") },
              { href: "/admin/coupons",       icon: "solar:tag-price-bold-duotone",          label: "Cupones",         count: undefined,          show: canAccess("coupons") },
              { href: "/admin/properties",    icon: "solar:buildings-2-bold-duotone",        label: role === "operador" ? "Mis propiedades" : "Propiedades", count: properties.length, show: canAccess("properties") },
              { href: "/admin/connections",   icon: "solar:link-circle-bold-duotone",        label: role === "operador" ? "Mis conexiones" : "Conexiones PMS", count: connections.length, show: canAccess("connections") },
              { href: "/admin/availability",  icon: "solar:calendar-bold-duotone",           label: role === "operador" ? "Mi disponibilidad" : "Disponibilidad", count: undefined, show: canAccess("availability") },
              { href: "/admin/operators",     icon: "solar:users-group-rounded-bold-duotone",label: "Operadores",      count: operatorsCount,     show: canAccess("operators") },
              { href: "/admin/agents",        icon: "solar:bag-4-bold-duotone",              label: "Agencias",        count: agencies.length,    show: canAccess("agents") },
              { href: "/admin/communications",icon: "solar:letter-bold-duotone",             label: "Comunicaciones",  count: undefined,          show: canAccess("communications") },
              { href: "/admin/users",         icon: "solar:user-id-bold-duotone",            label: "Usuarios y roles",count: undefined,          show: canAccess("users") },
              { href: "/admin/payments",      icon: "solar:wallet-money-bold-duotone",       label: "Pagos",           count: undefined,          show: canAccess("payments") },
            ]
              .filter((l) => l.show)
              .map((l) => (
                <QuickLink key={l.href} href={l.href} icon={l.icon} label={l.label} count={l.count} />
              ))}
          </div>
        </GlassCard>
        </div>
      </div>
    </div>
  );
}

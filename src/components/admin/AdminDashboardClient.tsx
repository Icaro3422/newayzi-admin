"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useAdmin } from "@/contexts/AdminContext";
import { adminApi, ROLE_META } from "@/lib/admin-api";
import type { PMSConnectionListItem, PropertyListItem, Agency, OperatorRewardsData } from "@/lib/admin-api";
import { rewardsAgreementsApi } from "@/lib/admin-api";
import { RewardPoolStatus } from "./RewardPoolStatus";

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

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-5 h-20 rounded-full bg-white/[0.07] overflow-hidden flex flex-col justify-end">
      <div className="rounded-full transition-all duration-700" style={{ height: `${pct}%`, background: color }} />
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [propsRes, connRes, opRes, agenciesRes] = await Promise.all([
          canAccess("properties") ? adminApi.getProperties() : Promise.resolve(null),
          canAccess("connections") ? adminApi.getConnections() : Promise.resolve(null),
          canAccess("operators") ? adminApi.getOperators() : Promise.resolve(null),
          canAccess("agents") ? adminApi.getAgencies() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (propsRes?.results) setProperties(propsRes.results);
        if (connRes?.results) setConnections(connRes.results);
        if (opRes?.results) setOperators({ results: opRes.results });
        if (agenciesRes?.results) setAgencies(agenciesRes.results);
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
  const maxBar = Math.max(properties.length, connections.length, totalSynced, totalPending, 1);

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

        {/* Stats en grid — filtradas por rol */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 pt-4 border-t border-white/[0.08]">
          {[
            canAccess("properties") && { label: role === "operador" ? "Mis propiedades" : "Propiedades", value: properties.length, icon: "solar:buildings-2-bold-duotone" },
            canAccess("connections") && { label: role === "operador" ? "Mis conexiones" : "Conexiones", value: connections.length, icon: "solar:link-circle-bold-duotone" },
            canAccess("connections") && { label: "Sincronizadas", value: totalSynced, icon: "solar:check-circle-bold-duotone" },
            canAccess("connections") && totalPending > 0 && { label: "Pendientes", value: totalPending, icon: "solar:clock-circle-bold-duotone" },
            canAccess("operators") && { label: "Operadores", value: operatorsCount, icon: "solar:users-group-rounded-bold-duotone" },
            canAccess("agents") && { label: "Agencias", value: agencies.length, icon: "solar:bag-4-bold-duotone" },
          ]
            .filter(Boolean)
            .map((s: any) => (
              <div
                key={s.label}
                className="flex flex-col gap-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 min-w-0"
              >
                <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.1em] font-semibold truncate">{s.label}</p>
                <div className="flex items-center gap-2">
                  <Icon icon={s.icon} className="text-[#7c4cff] text-base shrink-0" />
                  <p className="font-sora font-black text-white text-xl sm:text-2xl leading-none">
                    {loading || s.value == null ? (
                      <span className="inline-block w-10 h-6 rounded-md bg-white/10 animate-pulse" />
                    ) : (
                      s.value.toLocaleString()
                    )}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </GlassCard>

      {/* ── Reward Pool (solo super_admin) ── */}
      {role === "super_admin" && <RewardPoolStatus />}

      {/* ── Fila 2: Infraestructura + Rewards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
        {/* Card Infraestructura (estilo imagen) */}
        <GlassCard className="flex flex-col p-6 gap-6">
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

          {/* Barras en grid 2x3 para evitar solapamiento */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-6 min-w-0">
            {loading ? (
              <div className="col-span-3 h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
            ) : (
              [
                { label: "Props.", val: properties.length, color: "linear-gradient(to top, #5e2cec, #9b74ff)" },
                { label: "Activas", val: activeProps, color: "linear-gradient(to top, #422df6, #7c6bff)" },
                { label: "Public.", val: publishedProps, color: "linear-gradient(to top, #10b981, #6ee7b7)" },
                { label: "Conex.", val: connections.length, color: "linear-gradient(to top, #8b5cf6, #c4b5fd)" },
                { label: "Sync.", val: totalSynced, color: "linear-gradient(to top, #06b6d4, #67e8f9)" },
                { label: "Pend.", val: totalPending, color: "linear-gradient(to top, #f59e0b, #fcd34d)" },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-2 min-w-0">
                  <div className="w-full flex justify-center">
                    <MiniBar value={b.val} max={maxBar} color={b.color} />
                  </div>
                  <p className="text-white/40 text-[0.65rem] text-center leading-tight truncate w-full">
                    {b.label}
                  </p>
                  <p className="font-sora font-bold text-white text-[0.875rem] leading-none">{b.val}</p>
                </div>
              ))
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

        {/* Card: Programa de Socios (operador), Newayzi Rewards (agente/visualizador con loyalty), o nada (comercial/super_admin) */}
        {role === "operador" ? (() => {
          const ag = operatorRewards?.activeAgreement ?? null;
          const stats = operatorRewards?.stats;

          // Tiers del programa de socios
          const TIERS = [
            {
              key: "partner",
              name: "Partner",
              badge: "Socio base",
              icon: "solar:medal-ribbons-star-bold-duotone",
              accent: "rgba(180,180,200,0.9)",
              accentBg: "rgba(160,160,180,0.12)",
              benefits: ["Cashback básico a huéspedes", "Visibilidad estándar en búsquedas"],
            },
            {
              key: "premium_partner",
              name: "Premium Partner",
              badge: "Socio preferente",
              icon: "solar:crown-bold-duotone",
              accent: "#9b74ff",
              accentBg: "rgba(155,116,255,0.15)",
              benefits: ["Mayor % cashback a huéspedes", "Visibilidad destacada", "Posicionamiento preferente"],
            },
            {
              key: "elite_partner",
              name: "Elite Partner",
              badge: "Socio estratégico",
              icon: "solar:star-bold-duotone",
              accent: "#fbbf24",
              accentBg: "rgba(251,191,36,0.12)",
              benefits: ["Máximo cashback a huéspedes", "Visibilidad premium", "Soporte dedicado Newayzi"],
            },
          ];

          // Detectar el tier activo por nombre
          const activeTierKey = ag
            ? TIERS.find(t =>
                ag.rewardsLabelDisplay?.toLowerCase().includes(t.name.toLowerCase().split(" ")[0])
              )?.key ?? null
            : null;
          const activeTier = TIERS.find(t => t.key === activeTierKey) ?? null;

          return (
            <AccentCard className="flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/50 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Programa de Socios</p>
                  <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
                    {ag ? ag.rewardsLabelDisplay : "Sin nivel activo"}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Icon
                    icon={activeTier?.icon ?? "solar:handshake-bold-duotone"}
                    className="text-base"
                    style={{ color: activeTier?.accent ?? "#fbbf24" }}
                  />
                </div>
              </div>

              {/* Barra de progresión de tiers */}
              <div className="flex items-center gap-1 mb-4">
                {TIERS.map((tier, idx) => {
                  const isActive = tier.key === activeTierKey;
                  const isPast = activeTierKey
                    ? TIERS.findIndex(t => t.key === activeTierKey) > idx
                    : false;
                  return (
                    <div key={tier.key} className="flex items-center flex-1 gap-1">
                      <div
                        className="flex-1 rounded-full transition-all duration-500"
                        style={{
                          height: isActive ? "6px" : "3px",
                          background: isActive
                            ? tier.accent
                            : isPast
                              ? "rgba(155,116,255,0.5)"
                              : "rgba(255,255,255,0.12)",
                        }}
                      />
                      <div
                        className="flex flex-col items-center shrink-0"
                        style={{ minWidth: 0 }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                          style={{
                            background: isActive ? tier.accent : isPast ? "rgba(155,116,255,0.4)" : "rgba(255,255,255,0.1)",
                            boxShadow: isActive ? `0 0 10px ${tier.accent}80` : "none",
                          }}
                        >
                          <Icon
                            icon={tier.icon}
                            className="text-[0.55rem]"
                            style={{ color: isActive ? "#fff" : isPast ? "#fff" : "rgba(255,255,255,0.3)" }}
                          />
                        </div>
                        <p
                          className="text-[0.52rem] font-semibold mt-0.5 whitespace-nowrap"
                          style={{ color: isActive ? tier.accent : "rgba(255,255,255,0.3)" }}
                        >
                          {tier.name.split(" ")[0]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {ag ? (
                /* ── CON ACUERDO ACTIVO ── */
                <>
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
                  <div className="flex items-center justify-between">
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
                      <span className="text-[0.58rem] text-violet-300 bg-violet-500/15 rounded-full px-2 py-0.5 border border-violet-400/20">
                        Auto-renueva
                      </span>
                    )}
                  </div>
                </>
              ) : (
                /* ── SIN ACUERDO ACTIVO ── */
                <>
                  <div className="rounded-xl bg-white/[0.07] border border-white/[0.1] px-3.5 py-3 mb-3 flex items-start gap-2.5">
                    <Icon icon="solar:info-circle-bold-duotone" className="text-amber-400 text-base shrink-0 mt-0.5" />
                    <p className="text-white/65 text-[0.75rem] leading-relaxed">
                      Aún no tienes un acuerdo de socio activo. Contacta al equipo Newayzi para activar tu nivel y ofrecer cashback a tus huéspedes.
                    </p>
                  </div>

                  {/* Beneficios por tier */}
                  <div className="space-y-2">
                    {TIERS.map((tier) => (
                      <div
                        key={tier.key}
                        className="rounded-xl px-3.5 py-2.5 border flex items-center gap-3"
                        style={{ background: tier.accentBg, borderColor: `${tier.accent}25` }}
                      >
                        <Icon icon={tier.icon} className="text-lg shrink-0" style={{ color: tier.accent }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-sora font-bold text-white text-[0.78rem] leading-none">{tier.name}</p>
                            <span className="text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${tier.accent}25`, color: tier.accent }}>
                              {tier.badge}
                            </span>
                          </div>
                          <p className="text-white/45 text-[0.65rem] mt-0.5 truncate">
                            {tier.benefits[0]}
                          </p>
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

        {/* Card Accesos rápidos — filtrados por rol */}
        <GlassCard className="flex flex-col">
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
  );
}

"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminApi } from "@/lib/admin-api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPIs {
  total_revenue: string;
  month_revenue: string;
  year_revenue: string;
  revenue_growth_pct: number;
  total_bookings: number;
  confirmed_bookings: number;
  month_bookings: number;
  month_confirmed: number;
  bookings_growth_pct: number;
  confirmed_growth_pct: number;
  cancelled_bookings: number;
  pending_bookings: number;
  expired_bookings: number;
  year_bookings: number;
  year_confirmed: number;
  avg_booking_value: string;
  avg_nights: number;
  avg_guests: number;
  conversion_rate: number;
}

interface TimeSeriesPoint { date: string; bookings: number; revenue: number }
interface TopProperty { property_id: number; name: string; bookings: number; revenue: number }
interface StatusDist { status: string; count: number }

interface PaymentGateway {
  gateway: string;
  label: string;
  total: number;
  approved: number;
  rejected: number;
  approval_rate: number;
  revenue: number;
}

interface LoyaltyLevelDist { level: string; label: string; count: number }

interface LoyaltyData {
  total_users: number;
  total_points_active: number;
  avg_points_per_user: number;
  total_cashback_issued: number;
  total_redeemed: number;
  total_bonus_issued: number;
  level_distribution: LoyaltyLevelDist[];
  pool: { total_contributed: number; total_issued: number; total_redeemed: number; current_balance: number };
}

interface UsersData {
  total_guest_profiles: number;
  new_guests_month: number;
  users_growth_pct: number;
  repeat_customers: number;
  total_profiles: number;
}

interface AnalyticsData {
  kpis: KPIs;
  time_series: TimeSeriesPoint[];
  top_properties: TopProperty[];
  status_distribution: StatusDist[];
  payment_gateways: PaymentGateway[];
  payment_summary: { total_transactions: number; total_approved: number; total_rejected: number; overall_approval_rate: number };
  loyalty: LoyaltyData;
  users: UsersData;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPts(n: number): string {
  return new Intl.NumberFormat("es-CO").format(Math.round(n));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GrowthBadge({ pct }: { pct: number }) {
  const positive = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        positive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
      }`}
    >
      <Icon icon={positive ? "solar:arrow-up-bold" : "solar:arrow-down-bold"} width={10} />
      {Math.abs(pct)}% vs mes anterior
    </span>
  );
}

function KPICard({
  label,
  value,
  icon,
  color,
  badge,
  sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  badge?: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}20` }}
        >
          <Icon icon={icon} style={{ color }} className="text-lg" />
        </div>
        <span className="text-xs text-white/50 leading-tight">{label}</span>
      </div>
      <p className="text-xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-white/40">{sub}</p>}
      {badge && <div>{badge}</div>}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Icon icon={icon} className="text-violet-400" width={18} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function BarChart({ data, days }: { data: TimeSeriesPoint[]; days: number }) {
  const maxBookings = Math.max(...data.map((d) => d.bookings), 1);
  const step = days <= 30 ? 1 : Math.ceil(days / 30);
  const visible = data.filter((_, i) => i % step === 0);

  return (
    <div className="mt-4">
      <div className="flex items-end gap-0.5 h-28">
        {visible.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center group relative">
            <div
              className="w-full bg-violet-500/50 hover:bg-violet-400/70 rounded-t transition-colors cursor-pointer"
              style={{
                height: `${(d.bookings / maxBookings) * 100}%`,
                minHeight: d.bookings > 0 ? 4 : 0,
              }}
            />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-xl pointer-events-none">
              <p className="font-bold">{d.date}</p>
              <p>{d.bookings} reservas</p>
              <p>{formatCurrency(d.revenue)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-white/30 mt-1">
        <span>{visible[0]?.date?.slice(5)}</span>
        <span>{visible[Math.floor(visible.length / 2)]?.date?.slice(5)}</span>
        <span>{visible[visible.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  confirmed:       "#34d399",
  cancelled:       "#f87171",
  pending_payment: "#fbbf24",
  expired:         "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed:       "Confirmadas",
  cancelled:       "Canceladas",
  pending_payment: "Pendiente pago",
  expired:         "Expiradas",
};

const LEVEL_COLORS: Record<string, string> = {
  member:  "#60a5fa",
  plus:    "#a78bfa",
  premium: "#f59e0b",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getAnalyticsDashboard(days)
      .then((d) => setData((d ?? null) as AnalyticsData | null))
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar analytics"))
      .finally(() => setLoading(false));
  }, [days]);

  const kpis = data?.kpis;
  const totalDist = data?.status_distribution?.reduce((acc, s) => acc + s.count, 0) || 1;
  const totalLevelUsers = data?.loyalty?.level_distribution?.reduce((a, l) => a + l.count, 0) || 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        subtitle="KPIs y métricas de la plataforma en tiempo real."
      />

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/60">Período:</span>
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              days === d
                ? "bg-violet-600 text-white"
                : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
            }`}
          >
            {d === 365 ? "1 año" : `${d}d`}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : kpis ? (
        <>
          {/* ── Ingresos ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
              Ingresos
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <KPICard
                label="Ingresos totales"
                value={formatCurrency(kpis.total_revenue)}
                icon="solar:dollar-bold-duotone"
                color="#34d399"
              />
              <KPICard
                label="Ingresos este mes"
                value={formatCurrency(kpis.month_revenue)}
                icon="solar:chart-2-bold-duotone"
                color="#a78bfa"
                badge={<GrowthBadge pct={kpis.revenue_growth_pct} />}
              />
              <KPICard
                label="Ingresos este año"
                value={formatCurrency(kpis.year_revenue)}
                icon="solar:calendar-mark-bold-duotone"
                color="#60a5fa"
              />
              <KPICard
                label="Valor medio reserva"
                value={formatCurrency(kpis.avg_booking_value)}
                icon="solar:tag-price-bold-duotone"
                color="#fb923c"
                sub={`Prom. ${kpis.avg_nights} noches · ${kpis.avg_guests} huéspedes`}
              />
            </div>
          </div>

          {/* ── Reservas ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
              Reservas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <KPICard
                label="Reservas totales"
                value={kpis.total_bookings}
                icon="solar:bookmark-bold-duotone"
                color="#60a5fa"
              />
              <KPICard
                label="Reservas este mes"
                value={kpis.month_bookings}
                icon="solar:calendar-bold-duotone"
                color="#fbbf24"
                badge={<GrowthBadge pct={kpis.bookings_growth_pct} />}
              />
              <KPICard
                label="Confirmadas"
                value={kpis.confirmed_bookings}
                icon="solar:check-circle-bold-duotone"
                color="#34d399"
                sub={`Este mes: ${kpis.month_confirmed}`}
                badge={kpis.confirmed_growth_pct !== 0 ? <GrowthBadge pct={kpis.confirmed_growth_pct} /> : undefined}
              />
              <KPICard
                label="Este año"
                value={kpis.year_confirmed}
                icon="solar:double-alt-arrow-up-bold-duotone"
                color="#a78bfa"
                sub={`${kpis.year_bookings} totales (incl. todos los estados)`}
              />
              <KPICard
                label="Canceladas"
                value={kpis.cancelled_bookings}
                icon="solar:close-circle-bold-duotone"
                color="#f87171"
              />
              <KPICard
                label="Pendientes de pago"
                value={kpis.pending_bookings}
                icon="solar:clock-circle-bold-duotone"
                color="#fbbf24"
              />
              <KPICard
                label="Expiradas"
                value={kpis.expired_bookings}
                icon="solar:danger-circle-bold-duotone"
                color="#6b7280"
              />
              <KPICard
                label="Tasa de conversión"
                value={`${kpis.conversion_rate}%`}
                icon="solar:graph-new-up-bold-duotone"
                color="#a78bfa"
              />
            </div>
          </div>

          {/* ── Time series chart ─────────────────────────────────────────── */}
          <SectionCard
            title={`Reservas por día (últimos ${days} días)`}
            icon="solar:chart-2-bold-duotone"
          >
            <p className="text-xs text-white/40 -mt-2 mb-1">
              Cada barra representa el número de reservas creadas en ese día
            </p>
            {data?.time_series && <BarChart data={data.time_series} days={days} />}
          </SectionCard>

          {/* ── Distribución + Top propiedades ───────────────────────────── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="Distribución por estado" icon="solar:pie-chart-2-bold-duotone">
              <div className="space-y-3">
                {data?.status_distribution?.map((s) => {
                  const pct = Math.round((s.count / totalDist) * 100);
                  return (
                    <div key={s.status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70">{STATUS_LABELS[s.status] || s.status}</span>
                        <span className="font-bold text-white">
                          {s.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: STATUS_COLORS[s.status] || "#6b7280",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Top propiedades" icon="solar:buildings-2-bold-duotone">
              <div className="space-y-2.5">
                {(data?.top_properties ?? []).slice(0, 8).map((p, i) => (
                  <div key={p.property_id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                      <p className="text-xs text-white/40">
                        {p.bookings} reservas · {formatCurrency(p.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
                {(data?.top_properties ?? []).length === 0 && (
                  <p className="text-sm text-white/40 text-center py-4">Sin datos aún</p>
                )}
              </div>
            </SectionCard>
          </div>

          {/* ── Pagos por pasarela ────────────────────────────────────────── */}
          {data?.payment_gateways && data.payment_gateways.length > 0 && (
            <SectionCard title="Pagos por pasarela" icon="solar:card-bold-duotone">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <p className="text-lg font-black text-white">{data.payment_summary.total_transactions}</p>
                  <p className="text-xs text-white/45 mt-0.5">Transacciones totales</p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                  <p className="text-lg font-black text-emerald-400">{data.payment_summary.total_approved}</p>
                  <p className="text-xs text-white/45 mt-0.5">Aprobadas</p>
                </div>
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                  <p className="text-lg font-black text-red-400">{data.payment_summary.total_rejected}</p>
                  <p className="text-xs text-white/45 mt-0.5">Rechazadas</p>
                </div>
                <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3 text-center">
                  <p className="text-lg font-black text-violet-300">{data.payment_summary.overall_approval_rate}%</p>
                  <p className="text-xs text-white/45 mt-0.5">Tasa de aprobación</p>
                </div>
              </div>
              <div className="space-y-2">
                {data.payment_gateways.map((g) => (
                  <div
                    key={g.gateway}
                    className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">{g.label}</p>
                      <p className="text-[11px] text-white/40">
                        {g.total} transacciones · {g.approved} aprobadas · {g.rejected} rechazadas
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs font-bold text-emerald-300">{g.approval_rate}%</p>
                      <p className="text-[11px] text-white/40">{formatCurrency(g.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Loyalty / Rewards ─────────────────────────────────────────── */}
          {data?.loyalty && (
            <div className="grid sm:grid-cols-2 gap-4">
              <SectionCard title="Newayzi Rewards" icon="solar:star-bold-duotone">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-lg font-black text-white">{data.loyalty.total_users}</p>
                    <p className="text-xs text-white/45 mt-0.5">Usuarios con wallet</p>
                  </div>
                  <div className="rounded-xl bg-[#5e2cec]/10 border border-[#5e2cec]/20 p-3">
                    <p className="text-lg font-black text-[#b89eff]">
                      {formatPts(data.loyalty.total_points_active)}
                    </p>
                    <p className="text-xs text-white/45 mt-0.5">Puntos activos</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <p className="text-base font-black text-emerald-300">
                      {formatPts(data.loyalty.total_cashback_issued)}
                    </p>
                    <p className="text-xs text-white/45 mt-0.5">Cashback emitido</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-base font-black text-amber-300">
                      {formatPts(data.loyalty.total_redeemed)}
                    </p>
                    <p className="text-xs text-white/45 mt-0.5">Puntos redimidos</p>
                  </div>
                </div>

                {/* Level distribution */}
                <p className="text-xs text-white/50 mb-2 font-medium">Distribución por nivel</p>
                <div className="space-y-2">
                  {data.loyalty.level_distribution.map((l) => {
                    const pct = Math.round((l.count / totalLevelUsers) * 100);
                    return (
                      <div key={l.level}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/70">{l.label}</span>
                          <span className="font-bold text-white">
                            {l.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: LEVEL_COLORS[l.level] || "#6b7280",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              {/* Pool de recompensas */}
              <SectionCard title="Pool de Recompensas" icon="solar:wallet-money-bold-duotone">
                <div className="space-y-3">
                  {[
                    {
                      label: "Total contribuido",
                      value: formatPts(data.loyalty.pool.total_contributed),
                      color: "#60a5fa",
                    },
                    {
                      label: "Total emitido a usuarios",
                      value: formatPts(data.loyalty.pool.total_issued),
                      color: "#a78bfa",
                    },
                    {
                      label: "Total redimido",
                      value: formatPts(data.loyalty.pool.total_redeemed),
                      color: "#34d399",
                    },
                    {
                      label: "Balance actual del pool",
                      value: formatPts(data.loyalty.pool.current_balance),
                      color: "#f59e0b",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-2.5">
                      <p className="text-xs text-white/70">{item.label}</p>
                      <p className="text-sm font-bold" style={{ color: item.color }}>
                        {item.value} pts
                      </p>
                    </div>
                  ))}
                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center">
                    <p className="text-xs text-white/45">Prom. de puntos por usuario</p>
                    <p className="text-base font-black text-white mt-0.5">
                      {formatPts(data.loyalty.avg_points_per_user)} pts
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── Usuarios / CRM ────────────────────────────────────────────── */}
          {data?.users && (
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                Usuarios
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Huéspedes registrados"
                  value={data.users.total_guest_profiles}
                  icon="solar:users-group-rounded-bold-duotone"
                  color="#60a5fa"
                />
                <KPICard
                  label="Nuevos este mes"
                  value={data.users.new_guests_month}
                  icon="solar:user-plus-bold-duotone"
                  color="#34d399"
                  badge={
                    data.users.users_growth_pct !== 0 ? (
                      <GrowthBadge pct={data.users.users_growth_pct} />
                    ) : undefined
                  }
                />
                <KPICard
                  label="Clientes recurrentes"
                  value={data.users.repeat_customers}
                  icon="solar:refresh-bold-duotone"
                  color="#a78bfa"
                  sub="Con más de 1 reserva confirmada"
                />
                <KPICard
                  label="Perfiles totales"
                  value={data.users.total_profiles}
                  icon="solar:user-id-bold-duotone"
                  color="#fbbf24"
                  sub="Incluye admin, agentes y huéspedes"
                />
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

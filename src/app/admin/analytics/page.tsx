"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface KPIs {
  total_revenue: string;
  month_revenue: string;
  revenue_growth_pct: number;
  total_bookings: number;
  confirmed_bookings: number;
  month_bookings: number;
  bookings_growth_pct: number;
  cancelled_bookings: number;
  pending_bookings: number;
  year_bookings: number;
  avg_booking_value: string;
  conversion_rate: number;
}

interface TimeSeriesPoint {
  date: string;
  bookings: number;
  revenue: number;
}

interface TopProperty {
  property_id: number;
  name: string;
  bookings: number;
  revenue: number;
}

interface StatusDist {
  status: string;
  count: number;
}

interface AnalyticsData {
  kpis: KPIs;
  time_series: TimeSeriesPoint[];
  top_properties: TopProperty[];
  status_distribution: StatusDist[];
}

function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "portal.newayzi.com") return "https://api.newayzi.com";
    if (h === "portal.staging.newayzi.com") return "https://api.staging.newayzi.com";
  }
  return "http://localhost:8000";
}

async function authFetch(path: string) {
  const base = getApiBase();
  let token: string | null = null;
  try {
    const { Clerk } = window as any;
    if (Clerk?.session?.getToken) {
      token = await Clerk.session.getToken({ template: "newayzi-backend" });
    }
  } catch {}
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { headers, credentials: "include" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

function GrowthBadge({ pct }: { pct: number }) {
  const positive = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${positive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
      <Icon icon={positive ? "solar:arrow-up-bold" : "solar:arrow-down-bold"} />
      {Math.abs(pct)}% vs mes anterior
    </span>
  );
}

// Simple bar chart using CSS
function BarChart({ data, days }: { data: TimeSeriesPoint[]; days: number }) {
  const maxBookings = Math.max(...data.map((d) => d.bookings), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const step = days <= 30 ? 1 : Math.ceil(days / 30);
  const visible = data.filter((_, i) => i % step === 0);

  return (
    <div className="mt-4">
      <div className="flex items-end gap-1 h-32">
        {visible.map((d, i) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full bg-violet-500/40 hover:bg-violet-400/60 rounded-t transition-colors cursor-pointer"
              style={{ height: `${(d.bookings / maxBookings) * 100}%`, minHeight: d.bookings > 0 ? 4 : 0 }}
              title={`${d.date}: ${d.bookings} reservas`}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-xl">
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

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    authFetch(`/api/admin/analytics/dashboard/?days=${days}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  const kpis = data?.kpis;
  const totalDist = data?.status_distribution?.reduce((acc, s) => acc + s.count, 0) || 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        subtitle="KPIs y métricas de la plataforma en tiempo real."
      />

      {/* Days selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/60">Período:</span>
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${days === d ? "bg-violet-600 text-white" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"}`}
          >
            {d === 365 ? "1 año" : `${d}d`}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : kpis ? (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: "Ingresos totales", value: formatCurrency(kpis.total_revenue), icon: "solar:dollar-bold-duotone", color: "#34d399" },
              { label: `Ingresos este mes`, value: formatCurrency(kpis.month_revenue), icon: "solar:chart-2-bold-duotone", color: "#a78bfa", badge: <GrowthBadge pct={kpis.revenue_growth_pct} /> },
              { label: "Reservas totales", value: kpis.total_bookings, icon: "solar:bookmark-bold-duotone", color: "#60a5fa" },
              { label: "Reservas este mes", value: kpis.month_bookings, icon: "solar:calendar-bold-duotone", color: "#fbbf24", badge: <GrowthBadge pct={kpis.bookings_growth_pct} /> },
              { label: "Confirmadas", value: kpis.confirmed_bookings, icon: "solar:check-circle-bold-duotone", color: "#34d399" },
              { label: "Canceladas", value: kpis.cancelled_bookings, icon: "solar:close-circle-bold-duotone", color: "#f87171" },
              { label: "Valor medio reserva", value: formatCurrency(kpis.avg_booking_value), icon: "solar:tag-price-bold-duotone", color: "#fb923c" },
              { label: "Tasa de conversión", value: `${kpis.conversion_rate}%`, icon: "solar:graph-new-up-bold-duotone", color: "#a78bfa" },
            ].map((k) => (
              <div key={k.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${k.color}20` }}>
                    <Icon icon={k.icon} style={{ color: k.color }} className="text-lg" />
                  </div>
                  <span className="text-xs text-white/50 leading-tight">{k.label}</span>
                </div>
                <p className="text-xl font-black text-white">{k.value}</p>
                {k.badge && <div className="mt-1.5">{k.badge}</div>}
              </div>
            ))}
          </div>

          {/* Time series chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Icon icon="solar:chart-2-bold-duotone" className="text-violet-400" />
              Reservas por día (últimos {days} días)
            </h3>
            <p className="text-xs text-white/40 mb-2">Cada barra representa el número de reservas creadas en ese día</p>
            {data?.time_series && <BarChart data={data.time_series} days={days} />}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Status distribution */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon icon="solar:pie-chart-2-bold-duotone" className="text-violet-400" />
                Distribución por estado
              </h3>
              <div className="space-y-3">
                {data?.status_distribution?.map((s) => {
                  const pct = Math.round(s.count / totalDist * 100);
                  return (
                    <div key={s.status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70">{STATUS_LABELS[s.status] || s.status}</span>
                        <span className="font-bold text-white">{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: STATUS_COLORS[s.status] || "#6b7280" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top properties */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon icon="solar:buildings-2-bold-duotone" className="text-violet-400" />
                Top propiedades
              </h3>
              <div className="space-y-2.5">
                {(data?.top_properties ?? []).slice(0, 8).map((p, i) => (
                  <div key={p.property_id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                      <p className="text-xs text-white/40">{p.bookings} reservas · {formatCurrency(p.revenue)}</p>
                    </div>
                  </div>
                ))}
                {(data?.top_properties ?? []).length === 0 && (
                  <p className="text-sm text-white/40 text-center py-4">Sin datos aún</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

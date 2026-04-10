"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Select, SelectItem, Switch } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type PaymentGatewayAnalytics, type PaymentGatewayAnalyticsAttempt } from "@/lib/admin-api";

const tooltipBase = {
  backgroundColor: "rgba(15, 15, 20, 0.94)",
  borderColor: "rgba(139, 92, 246, 0.35)",
  borderWidth: 1,
  textStyle: { color: "#e5e5e5", fontSize: 12 },
} as const;

const GATEWAY_OPTIONS = [
  { key: "all", label: "Todas las pasarelas (sin wallet/demo)" },
  { key: "mercadopago", label: "Mercado Pago" },
  { key: "epayco", label: "ePayco tarjeta" },
  { key: "epayco_pse", label: "ePayco PSE" },
  { key: "epayco_checkout", label: "ePayco Checkout" },
  { key: "wallet", label: "Solo Rewards (wallet)" },
  { key: "demo", label: "Demo" },
];

function pct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)} %`;
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    approved: "Aprobado",
    rejected: "Rechazado",
    error: "Error",
    pending: "Pendiente",
    cancelled: "Cancelado",
  };
  return m[s] || s;
}

function AttemptsTable({
  title,
  rows,
  emptyHint,
}: {
  title: string;
  rows: PaymentGatewayAnalyticsAttempt[];
  emptyHint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-2">
        <Icon icon="solar:list-bold-duotone" className="text-violet-400 text-lg" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-white/45 text-center">{emptyHint}</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#12101c] z-[1]">
              <tr className="text-white/40 uppercase tracking-wider">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Reserva</th>
                <th className="px-3 py-2 font-semibold">Pasarela</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 font-semibold">Código</th>
                <th className="px-3 py-2 font-semibold">Detalle MP</th>
                <th className="px-3 py-2 font-semibold">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.06] text-white/75 hover:bg-white/[0.04]">
                  <td className="px-3 py-2 whitespace-nowrap text-white/55">
                    {r.created ? new Date(r.created).toLocaleString("es-CO") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-violet-300 font-mono">{r.booking_reference}</span>
                    <div className="text-[10px] text-white/35 truncate max-w-[140px]" title={r.property_name}>
                      {r.property_name}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-white/60">{r.gateway}</td>
                  <td className="px-3 py-2">{statusLabel(r.status)}</td>
                  <td className="px-3 py-2 font-mono text-amber-200/90 max-w-[100px] truncate" title={r.gateway_response_code}>
                    {r.gateway_response_code || "—"}
                  </td>
                  <td className="px-3 py-2 max-w-[160px] truncate text-cyan-200/80" title={r.status_detail}>
                    {r.status_detail || "—"}
                  </td>
                  <td className="px-3 py-2 max-w-[220px] truncate text-white/50" title={r.gateway_response_message}>
                    {r.gateway_response_message || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function PaymentGatewayAnalyticsPanel() {
  const [days, setDays] = useState("30");
  const [gatewayKey, setGatewayKey] = useState("all");
  const [includeInternal, setIncludeInternal] = useState(false);
  const [data, setData] = useState<PaymentGatewayAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = parseInt(days, 10) || 30;
      const gw = gatewayKey === "all" ? undefined : gatewayKey;
      const res = await adminApi.getPaymentGatewayAnalytics({
        days: d,
        gateway: gw,
        includeInternal,
      });
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Error al cargar analítica");
    } finally {
      setLoading(false);
    }
  }, [days, gatewayKey, includeInternal]);

  useEffect(() => {
    void load();
  }, [load]);

  const donutOption = useMemo(() => {
    if (!data) return null;
    const { approved, rejected, error: err, pending, cancelled } = data.totals;
    const pieData = [
      { name: "Aprobados", value: approved, itemStyle: { color: "#34d399" } },
      { name: "Rechazados", value: rejected, itemStyle: { color: "#f87171" } },
      { name: "Error", value: err, itemStyle: { color: "#fb923c" } },
      { name: "Pendientes", value: pending, itemStyle: { color: "#60a5fa" } },
      { name: "Cancelados", value: cancelled, itemStyle: { color: "#94a3b8" } },
    ].filter((x) => x.value > 0);
    if (pieData.length === 0) {
      return {
        backgroundColor: "transparent",
        title: {
          text: "Sin intentos en el periodo",
          left: "center",
          top: "center",
          textStyle: { color: "rgba(255,255,255,0.35)", fontSize: 14 },
        },
      };
    }
    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "item" as const,
        formatter: "{b}: {c} ({d}%)",
      },
      legend: {
        bottom: 0,
        textStyle: { color: "rgba(255,255,255,0.45)", fontSize: 11 },
      },
      series: [
        {
          type: "pie" as const,
          radius: ["42%", "68%"],
          center: ["50%", "46%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: "#0c0720", borderWidth: 2 },
          label: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
          data: pieData,
        },
      ],
    };
  }, [data]);

  const lineOption = useMemo(() => {
    if (!data?.by_day?.length) return null;
    const dates = data.by_day.map((d) => d.date.slice(5));
    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "axis" as const,
      },
      legend: {
        data: ["Aprobados", "Rechazados", "Error"],
        textStyle: { color: "rgba(255,255,255,0.45)", fontSize: 11 },
        top: 0,
      },
      grid: { left: "3%", right: "3%", bottom: "8%", top: "18%", containLabel: true },
      xAxis: {
        type: "category" as const,
        data: dates,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, rotate: 35 },
      },
      yAxis: {
        type: "value" as const,
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10 },
      },
      series: [
        {
          name: "Aprobados",
          type: "line" as const,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: "#34d399" },
          areaStyle: { opacity: 0.12, color: "#34d399" },
          data: data.by_day.map((d) => d.approved),
        },
        {
          name: "Rechazados",
          type: "line" as const,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: "#f87171" },
          areaStyle: { opacity: 0.1, color: "#f87171" },
          data: data.by_day.map((d) => d.rejected),
        },
        {
          name: "Error",
          type: "line" as const,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: "#fb923c" },
          areaStyle: { opacity: 0.1, color: "#fb923c" },
          data: data.by_day.map((d) => d.error),
        },
      ],
    };
  }, [data]);

  const barFailuresOption = useMemo(() => {
    if (!data?.failure_by_code?.length) return null;
    const top = data.failure_by_code.slice(0, 12);
    const labels = top.map((x) => `${x.gateway}: ${x.code}`.slice(0, 42));
    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params];
          const row = items[0] as { dataIndex?: number; value?: number } | undefined;
          if (row?.dataIndex == null) return "";
          const f = top[row.dataIndex];
          const sample = f.sample_message ? `<div style="margin-top:6px;opacity:0.85;max-width:280px;white-space:normal">${f.sample_message}</div>` : "";
          return `<div style="font-weight:600">${f.gateway} · ${f.code}</div><div>Intentos: ${row.value}</div>${sample}`;
        },
      },
      grid: { left: "3%", right: "8%", bottom: "4%", top: "4%", containLabel: true },
      xAxis: {
        type: "value" as const,
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10 },
      },
      yAxis: {
        type: "category" as const,
        data: labels,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, width: 200, overflow: "truncate" },
      },
      series: [
        {
          type: "bar" as const,
          data: top.map((x) => x.count),
          itemStyle: {
            color: {
              type: "linear" as const,
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#a78bfa" },
                { offset: 1, color: "#6366f1" },
              ],
            },
          },
          barMaxWidth: 18,
        },
      ],
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4 flex-wrap">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            label="Periodo"
            selectedKeys={[days]}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0];
              if (v != null) setDays(String(v));
            }}
            className="w-40 max-w-full"
            classNames={{
              trigger: "bg-white/[0.06] border-white/[0.12]",
              label: "text-white/50",
              value: "text-white",
            }}
          >
            <SelectItem key="7">Últimos 7 días</SelectItem>
            <SelectItem key="30">Últimos 30 días</SelectItem>
            <SelectItem key="90">Últimos 90 días</SelectItem>
            <SelectItem key="180">Últimos 180 días</SelectItem>
          </Select>
          <Select
            label="Pasarela"
            selectedKeys={[gatewayKey]}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0];
              setGatewayKey(v != null ? String(v) : "all");
            }}
            className="min-w-[260px] max-w-full"
            classNames={{
              trigger: "bg-white/[0.06] border-white/[0.12]",
              label: "text-white/50",
              value: "text-white",
            }}
          >
            {GATEWAY_OPTIONS.map((o) => (
              <SelectItem key={o.key}>{o.label}</SelectItem>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch isSelected={includeInternal} onValueChange={setIncludeInternal} size="sm" />
          <span className="text-xs text-white/55">Incluir wallet / demo cuando no hay filtro de pasarela</span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-white/45 text-sm">
          <Icon icon="svg-spinners:ring-resize" className="text-xl" />
          Cargando analítica de pasarela…
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Intentos", value: data.totals.attempts, color: "text-white" },
              { label: "Aprobados", value: data.totals.approved, color: "text-emerald-400" },
              { label: "Rechazados", value: data.totals.rejected, color: "text-red-400" },
              { label: "Error", value: data.totals.error, color: "text-orange-400" },
              { label: "Pendientes", value: data.totals.pending, color: "text-sky-400" },
              { label: "Cancelados", value: data.totals.cancelled, color: "text-slate-400" },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-center"
              >
                <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300/90 mb-1">Tasa de éxito</p>
              <p className="text-3xl font-black text-white">{pct(data.rates.success_rate)}</p>
              <p className="text-[10px] text-white/40 mt-2 leading-relaxed">{data.rates.note}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300/90 mb-1">Tasa de fallo</p>
              <p className="text-3xl font-black text-white">{pct(data.rates.failure_rate)}</p>
              <p className="text-xs text-white/45 mt-2">Sobre cobros con resultado final (sin pendientes).</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300/90 mb-1">Monto aprobado (suma)</p>
              <p className="text-2xl font-black text-white font-mono truncate" title={data.approved_amount_total}>
                {data.approved_amount_total}
              </p>
              <p className="text-[10px] text-white/40 mt-2">Suma de transacciones aprobadas en el periodo (moneda mixta si aplica).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 min-h-[320px]">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Icon icon="solar:pie-chart-2-bold-duotone" className="text-violet-400" />
                Distribución por resultado
              </h3>
              {donutOption ? <ReactECharts option={donutOption} style={{ height: 280 }} /> : null}
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 min-h-[320px]">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Icon icon="solar:chart-bold-duotone" className="text-violet-400" />
                Evolución diaria
              </h3>
              {lineOption ? <ReactECharts option={lineOption} style={{ height: 280 }} /> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 min-h-[320px]">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Icon icon="solar:danger-triangle-bold-duotone" className="text-amber-400" />
              Top motivos de fallo (código de respuesta)
            </h3>
            {barFailuresOption ? (
              <ReactECharts option={barFailuresOption} style={{ height: Math.max(280, (data.failure_by_code.length || 1) * 28) }} />
            ) : (
              <p className="text-sm text-white/40 py-8 text-center">No hay fallos en el periodo seleccionado.</p>
            )}
          </div>

          {data.failure_by_status_detail.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Icon icon="solar:tag-price-bold-duotone" className="text-cyan-400" />
                Detalle Mercado Pago (status_detail)
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.failure_by_status_detail.map((x) => (
                  <div
                    key={`${x.gateway}-${x.status_detail}`}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-100/90"
                  >
                    <span className="font-mono text-cyan-300">{x.status_detail}</span>
                    <span className="text-white/40 mx-1">·</span>
                    <span className="font-bold">{x.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AttemptsTable
            title="Últimos fallos (detalle)"
            rows={data.recent_failures}
            emptyHint="No hay fallos recientes en este periodo."
          />

          <AttemptsTable
            title="Últimos 100 intentos (todos)"
            rows={data.recent_attempts}
            emptyHint="Sin datos de intentos en el periodo."
          />
        </>
      ) : null}
    </div>
  );
}

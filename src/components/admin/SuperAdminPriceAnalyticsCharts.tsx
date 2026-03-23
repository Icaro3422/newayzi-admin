"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactECharts from "echarts-for-react";
import type { AdminDashboardPriceDetails } from "@/lib/admin-api";

const tooltipBase = {
  backgroundColor: "rgba(15, 15, 20, 0.94)",
  borderColor: "rgba(139, 92, 246, 0.35)",
  borderWidth: 1,
  textStyle: { color: "#e5e5e5", fontSize: 12 },
} as const;

function fmtMoney(value: number, currency: string) {
  const sym = currency === "COP" ? "$" : `${currency} `;
  return `${sym}${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

function barGradient(top: string, bottom: string) {
  return {
    type: "linear" as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: top },
      { offset: 1, color: bottom },
    ],
  };
}

export function SuperAdminPriceAnalyticsCharts({
  loading,
  currency,
  globalAverage,
  details,
}: {
  loading: boolean;
  currency: string;
  globalAverage: number | null;
  details: AdminDashboardPriceDetails | null;
}) {
  const router = useRouter();

  const quartilesOption = useMemo(() => {
    if (!details) return null;
    const cats = ["Mín", "P25", "Mediana", "Media global", "P75", "Máx"];
    const vals = [
      details.min,
      details.p25,
      details.median,
      globalAverage ?? details.median,
      details.p75,
      details.max,
    ];
    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params];
          const row = items[0] as { axisValue?: string; value?: number } | undefined;
          if (row == null || row.value == null) return "";
          return `<div style="font-weight:600">${row.axisValue ?? ""}</div><div>${fmtMoney(Number(row.value), currency)}</div><div style="opacity:0.7;font-size:11px;margin-top:4px">Precio mín. noche (sync) por propiedad</div>`;
        },
      },
      grid: { left: "3%", right: "3%", bottom: "8%", top: "12%", containLabel: true },
      xAxis: {
        type: "category" as const,
        data: cats,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisTick: { show: false },
        axisLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10, interval: 0, rotate: 22 },
      },
      yAxis: {
        type: "value" as const,
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: {
          color: "rgba(255,255,255,0.35)",
          fontSize: 10,
          formatter: (v: number) => (v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}k` : String(v)),
        },
      },
      series: [
        {
          type: "bar" as const,
          barMaxWidth: 40,
          data: vals.map((v, i) => ({
            value: v,
            itemStyle: {
              color:
                i === 3
                  ? barGradient("#67e8f9", "#06b6d4")
                  : barGradient("#c4b5fd", "#7c3aed"),
            },
          })),
        },
      ],
    };
  }, [details, currency, globalAverage]);

  const histogramOption = useMemo(() => {
    if (!details?.histogram?.length) return null;
    const labels = details.histogram.map((h) => h.label);
    const counts = details.histogram.map((h) => h.count);
    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "axis" as const,
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params];
          const i = (items[0] as { dataIndex?: number })?.dataIndex ?? 0;
          const h = details.histogram[i];
          if (!h) return "";
          return `<div style="font-weight:600">Rango</div><div>${h.label}</div><div style="margin-top:6px">Propiedades: <strong>${h.count}</strong></div><div style="opacity:0.75;font-size:11px;margin-top:4px">${fmtMoney(h.min, currency)} – ${fmtMoney(h.max, currency)}</div>`;
        },
      },
      dataZoom: [{ type: "inside" as const, xAxisIndex: 0 }, { type: "slider" as const, xAxisIndex: 0, height: 18, bottom: 4 }],
      grid: { left: "3%", right: "3%", bottom: "22%", top: "14%", containLabel: true },
      xAxis: {
        type: "category" as const,
        data: labels,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisTick: { show: false },
        axisLabel: { color: "rgba(255,255,255,0.45)", fontSize: 9, interval: 0, rotate: 28 },
      },
      yAxis: {
        type: "value" as const,
        name: "Propiedades",
        nameTextStyle: { color: "rgba(255,255,255,0.35)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10 },
      },
      series: [
        {
          name: "Distribución",
          type: "bar" as const,
          barMaxWidth: 36,
          data: counts,
          itemStyle: {
            color: barGradient("#a78bfa", "#5b21b6"),
            borderRadius: [6, 6, 0, 0],
          },
        },
      ],
    };
  }, [details, currency]);

  const byOperatorOption = useMemo(() => {
    if (!details?.by_operator?.length) return null;
    const sorted = [...details.by_operator].sort((a, b) => b.average_price - a.average_price).slice(0, 18);
    const short = (s: string) => (s.length > 22 ? `${s.slice(0, 22)}…` : s);
    const names = sorted.map((o) => short(o.name));
    const data = sorted.map((o) => ({
      value: o.average_price,
      operatorId: o.operator_id,
      props: o.properties_count,
      fullName: o.name,
    }));
    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params];
          const i = (items[0] as { dataIndex?: number })?.dataIndex ?? 0;
          const d = data[i];
          if (!d) return "";
          return `<div style="font-weight:600">${d.fullName}</div><div>Promedio: <strong>${fmtMoney(d.value, currency)}</strong></div><div style="margin-top:4px">Propiedades: ${d.props}</div><div style="opacity:0.65;font-size:11px;margin-top:6px">Clic para abrir el operador</div>`;
        },
      },
      grid: { left: "4%", right: "8%", bottom: "4%", top: 8, containLabel: true },
      xAxis: {
        type: "value" as const,
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: {
          color: "rgba(255,255,255,0.35)",
          fontSize: 10,
          formatter: (v: number) => (v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}k` : String(v)),
        },
      },
      yAxis: {
        type: "category" as const,
        data: names,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10 },
      },
      series: [
        {
          name: "Precio medio / operador",
          type: "bar" as const,
          barMaxWidth: 18,
          data,
          itemStyle: {
            color: barGradient("#22d3ee", "#7c3aed"),
            borderRadius: [0, 6, 6, 0],
          },
        },
      ],
    };
  }, [details, currency]);

  const onOperatorClick = (params: unknown) => {
    const p = params as { componentType?: string; data?: { operatorId?: number } };
    if (p?.componentType === "series" && p?.data?.operatorId != null) {
      router.push(`/admin/operators/${p.data.operatorId}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 rounded-2xl border border-violet-500/20 bg-violet-950/[0.15] p-4 sm:p-5 animate-pulse">
        <div className="h-4 w-48 rounded bg-white/10" />
        <div className="h-[260px] rounded-xl bg-white/[0.06]" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="h-[300px] rounded-xl bg-white/[0.06]" />
          <div className="h-[300px] rounded-xl bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-8 text-center">
        <p className="text-white/50 text-[0.85rem]">
          No hay propiedades sincronizadas con precio para desglosar. Cuando existan tarifas base en PMS, verás
          distribución y detalle por operador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 rounded-2xl border border-violet-500/20 bg-violet-950/[0.15] p-4 sm:p-5">
      <div>
        <p className="text-violet-200/90 text-[0.62rem] uppercase tracking-[0.14em] font-semibold">Super admin</p>
        <p className="font-sora font-bold text-white text-base mt-1">Precios en alojamientos sincronizados</p>
        <p className="text-white/45 text-[0.72rem] mt-1 leading-relaxed">
          Precio mínimo por noche por propiedad (tarifa base en moneda de la propiedad). Media global:{" "}
          <span className="text-white/80 font-semibold">
            {globalAverage != null ? fmtMoney(globalAverage, currency) : "—"}
          </span>
          . En la gráfica por operador, <span className="text-violet-200">haz clic</span> para ver la ficha del operador.
        </p>
      </div>

      {quartilesOption ? (
        <div className="min-w-0">
          <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
            Resumen estadístico (por propiedad)
          </p>
          <ReactECharts option={quartilesOption} style={{ height: 260, width: "100%" }} opts={{ renderer: "svg" }} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {histogramOption ? (
          <div className="min-w-0">
            <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
              Distribución por rangos de precio
            </p>
            <p className="text-white/30 text-[0.65rem] mb-2">Usa el slider inferior para acercar rangos (detalle).</p>
            <ReactECharts option={histogramOption} style={{ height: 300, width: "100%" }} opts={{ renderer: "svg" }} />
          </div>
        ) : null}
        {byOperatorOption ? (
          <div className="min-w-0">
            <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
              Precio medio por operador (ordenado)
            </p>
            <p className="text-white/30 text-[0.65rem] mb-2">Clic en una barra para abrir el operador en el panel.</p>
            <ReactECharts
              option={byOperatorOption}
              style={{
                height: Math.min(420, 120 + Math.min(18, details.by_operator.length) * 22),
                width: "100%",
              }}
              opts={{ renderer: "svg" }}
              onEvents={{ click: onOperatorClick }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

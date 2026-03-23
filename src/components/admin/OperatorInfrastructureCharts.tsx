"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { AdminDashboardPriceDetails, PMSConnectionListItem, PropertyListItem } from "@/lib/admin-api";
import { SuperAdminPriceAnalyticsCharts } from "./SuperAdminPriceAnalyticsCharts";

const tooltipBase = {
  backgroundColor: "rgba(15, 15, 20, 0.94)",
  borderColor: "rgba(139, 92, 246, 0.35)",
  borderWidth: 1,
  textStyle: { color: "#e5e5e5", fontSize: 12 },
} as const;

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

function formatPrice(value: number, currency: string) {
  const sym = currency === "COP" ? "$" : `${currency} `;
  return `${sym}${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

/** Escala superior “redonda” para gauge de precio */
function gaugeMax(price: number) {
  if (!Number.isFinite(price) || price <= 0) return 1;
  const headroom = Math.max(price * 0.35, price * 0.05);
  const raw = price + headroom;
  const pow10 = 10 ** Math.floor(Math.log10(raw));
  return Math.ceil(raw / pow10) * pow10;
}

export function OperatorInfrastructureCharts({
  properties,
  activeProps,
  publishedProps,
  connections,
  totalSynced,
  totalPending,
  agenciesCount = 0,
  showAgenciesBar = false,
  operatorsCount = 0,
  showOperatorsBar = false,
  averagePriceSynced = null,
  currency = "COP",
  showPriceChart = false,
  superAdminPriceSection = null,
}: {
  properties: PropertyListItem[];
  activeProps: number;
  publishedProps: number;
  connections: PMSConnectionListItem[];
  totalSynced: number;
  totalPending: number;
  /** Conteo de agencias (solo se pinta barra si showAgenciesBar) */
  agenciesCount?: number;
  showAgenciesBar?: boolean;
  operatorsCount?: number;
  showOperatorsBar?: boolean;
  averagePriceSynced?: number | null;
  currency?: string;
  showPriceChart?: boolean;
  /** Solo super_admin: analíticas extendidas de precios (null = no mostrar bloque). */
  superAdminPriceSection?: {
    loading: boolean;
    details: AdminDashboardPriceDetails | null;
    currency: string;
    globalAverage: number | null;
  } | null;
}) {
  const barCategoriesAndData = useMemo(() => {
    const categories: string[] = [
      "Propiedades",
      "Activas",
      "Publicadas",
      "Conexiones",
      "Sync",
      "Pendientes",
    ];
    const data: { value: number; itemStyle: { color: ReturnType<typeof barGradient> } }[] = [
      { value: properties.length, itemStyle: { color: barGradient("#9b74ff", "#5e2cec") } },
      { value: activeProps, itemStyle: { color: barGradient("#7c6bff", "#422df6") } },
      { value: publishedProps, itemStyle: { color: barGradient("#6ee7b7", "#10b981") } },
      { value: connections.length, itemStyle: { color: barGradient("#c4b5fd", "#8b5cf6") } },
      { value: totalSynced, itemStyle: { color: barGradient("#67e8f9", "#06b6d4") } },
      { value: totalPending, itemStyle: { color: barGradient("#fcd34d", "#f59e0b") } },
    ];

    if (showAgenciesBar) {
      categories.push("Agencias");
      data.push({
        value: agenciesCount,
        itemStyle: { color: barGradient("#f0abfc", "#c026d3") },
      });
    }
    if (showOperatorsBar) {
      categories.push("Operadores");
      data.push({
        value: operatorsCount,
        itemStyle: { color: barGradient("#93c5fd", "#2563eb") },
      });
    }

    return { categories, data, barCount: categories.length };
  }, [
    properties.length,
    connections.length,
    activeProps,
    publishedProps,
    totalSynced,
    totalPending,
    agenciesCount,
    showAgenciesBar,
    operatorsCount,
    showOperatorsBar,
  ]);

  const barOption = useMemo(() => {
    const { categories, data, barCount } = barCategoriesAndData;
    const rotate = barCount > 6 ? 32 : barCount > 5 ? 22 : 0;
    const bottomPct = barCount > 6 ? "18%" : barCount > 5 ? "14%" : "4%";
    const barMaxW = barCount > 7 ? 28 : barCount > 6 ? 30 : 36;

    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
      },
      grid: { left: "2%", right: "2%", bottom: bottomPct, top: "10%", containLabel: true },
      xAxis: {
        type: "category" as const,
        data: categories,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(255,255,255,0.5)",
          fontSize: barCount > 6 ? 9 : 10,
          interval: 0,
          rotate,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: "value" as const,
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10 },
      },
      series: [
        {
          type: "bar" as const,
          barMaxWidth: barMaxW,
          data,
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: "rgba(94, 44, 236, 0.45)",
            },
          },
        },
      ],
    };
  }, [barCategoriesAndData]);

  const barChartHeight = barCategoriesAndData.barCount > 6 ? 248 : 220;

  /** Perfil entre categorías del resumen (snapshot actual; no es serie histórica en el tiempo). */
  const lineAreaOption = useMemo(() => {
    const { categories, data, barCount } = barCategoriesAndData;
    const values = data.map((d) => d.value);
    const rotate = barCount > 6 ? 32 : barCount > 5 ? 22 : 0;
    const bottomPct = barCount > 6 ? "18%" : barCount > 5 ? "14%" : "8%";

    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "axis" as const,
        axisPointer: { type: "line" as const, lineStyle: { color: "rgba(155,116,255,0.4)", width: 1 } },
      },
      grid: { left: "2%", right: "2%", bottom: bottomPct, top: "12%", containLabel: true },
      xAxis: {
        type: "category" as const,
        data: categories,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(255,255,255,0.5)",
          fontSize: barCount > 6 ? 9 : 10,
          interval: 0,
          rotate,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: "value" as const,
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10 },
      },
      series: [
        {
          type: "line" as const,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2.5, color: "#a78bfa" },
          itemStyle: { color: "#e9d5ff", borderColor: "#5e2cec", borderWidth: 2 },
          areaStyle: {
            color: {
              type: "linear" as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(167, 139, 250, 0.42)" },
                { offset: 0.55, color: "rgba(94, 44, 236, 0.12)" },
                { offset: 1, color: "rgba(94, 44, 236, 0.02)" },
              ],
            },
          },
          data: values,
        },
      ],
    };
  }, [barCategoriesAndData]);

  const funnelOption = useMemo(() => {
    const total = properties.length;
    const act = activeProps;
    const pub = publishedProps;
    const empty = total === 0 && act === 0 && pub === 0;

    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "item" as const,
        formatter: (p: { name?: string; value?: number; percent?: number }) =>
          empty
            ? `<div style="font-weight:600">${p.name}</div><div style="opacity:0.75;font-size:11px;margin-top:4px">Añade propiedades para ver el embudo</div>`
            : `<div style="font-weight:600">${p.name}</div><div style="margin-top:4px">${Number(p.value).toLocaleString("es-CO")} <span style="opacity:0.7">(${p.percent}%)</span></div>`,
      },
      series: [
        {
          type: "funnel" as const,
          left: "6%",
          top: 16,
          bottom: 12,
          width: "88%",
          min: 0,
          max: empty ? 100 : Math.max(total, 1),
          sort: "descending" as const,
          gap: 6,
          label: {
            show: true,
            position: "inside" as const,
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            textBorderColor: "rgba(0,0,0,0.35)",
            textBorderWidth: 1,
          },
          itemStyle: {
            borderColor: "rgba(15,15,20,0.85)",
            borderWidth: 2,
            borderRadius: 8,
          },
          data: empty
            ? [{ value: 1, name: "Sin propiedades", itemStyle: { color: "rgba(255,255,255,0.15)" } }]
            : [
                { value: total, name: "Inventario", itemStyle: { color: "#7c3aed" } },
                { value: act, name: "Activas", itemStyle: { color: "#6366f1" } },
                { value: pub, name: "Publicadas", itemStyle: { color: "#059669" } },
              ],
        },
      ],
    };
  }, [properties.length, activeProps, publishedProps]);

  const radarOption = useMemo(() => {
    const { categories, data } = barCategoriesAndData;
    const rawValues = data.map((d) => d.value);
    const maxVal = Math.max(...rawValues, 1);
    const normalized = rawValues.map((v) => Math.round((v / maxVal) * 100));

    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "item" as const,
        formatter: (params: { name?: string; data?: { value?: number[] } }) => {
          const vals = params.data?.value ?? normalized;
          const lines = categories.map((c, i) => `${c}: <strong>${rawValues[i]}</strong> <span style="opacity:0.65">(${vals[i]}% del máximo local)</span>`);
          return `<div style="font-weight:600;margin-bottom:6px">${params.name ?? "Balance"}</div>${lines.join("<br/>")}`;
        },
      },
      radar: {
        indicator: categories.map((name) => ({ name, max: 100 })),
        radius: "66%",
        center: ["50%", "54%"],
        splitNumber: 4,
        axisName: {
          color: "rgba(255,255,255,0.5)",
          fontSize: 10,
          lineHeight: 14,
        },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        splitArea: {
          show: true,
          areaStyle: {
            color: ["rgba(255,255,255,0.03)", "rgba(139,92,246,0.06)"],
          },
        },
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
      },
      series: [
        {
          type: "radar" as const,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: { width: 2, color: "#c4b5fd" },
          areaStyle: { color: "rgba(139, 92, 246, 0.22)" },
          itemStyle: { color: "#a78bfa", borderColor: "#5e2cec", borderWidth: 1 },
          data: [{ value: normalized, name: "Balance de KPIs" }],
        },
      ],
    };
  }, [barCategoriesAndData]);

  const priceGaugeOption = useMemo(() => {
    if (!showPriceChart || averagePriceSynced == null || !Number.isFinite(averagePriceSynced)) {
      return null;
    }
    const max = gaugeMax(averagePriceSynced);
    const formatted = formatPrice(averagePriceSynced, currency);

    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        formatter: () => `<div style="font-weight:600">${formatted}</div><div style="opacity:0.75;font-size:11px;margin-top:4px">Precio promedio (unidades sincronizadas)</div>`,
      },
      series: [
        {
          type: "gauge" as const,
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max,
          splitNumber: 4,
          radius: "88%",
          center: ["50%", "58%"],
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.35, "rgba(94, 44, 236, 0.35)"],
                [0.65, "rgba(155, 116, 255, 0.55)"],
                [1, "rgba(34, 211, 238, 0.5)"],
              ],
            },
          },
          pointer: {
            icon: "path://M12.8,0.7l12,40.1H0.7L12.8,0.7z",
            length: "58%",
            width: 10,
            offsetCenter: [0, -4],
            itemStyle: { color: "#e9d5ff" },
          },
          axisTick: { distance: -18, length: 6, lineStyle: { color: "rgba(255,255,255,0.25)", width: 1 } },
          splitLine: { distance: -20, length: 12, lineStyle: { color: "rgba(255,255,255,0.2)", width: 1 } },
          axisLabel: {
            color: "rgba(255,255,255,0.4)",
            fontSize: 9,
            distance: -32,
            formatter: (v: number) => {
              if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
              if (v >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
              return String(v);
            },
          },
          title: { show: false },
          detail: {
            valueAnimation: true,
            width: "70%",
            lineHeight: 22,
            borderRadius: 8,
            offsetCenter: [0, "38%"],
            fontSize: 17,
            fontWeight: 700,
            fontFamily: "Sora, system-ui, sans-serif",
            color: "#f5f5f5",
            formatter: () => formatted,
          },
          data: [{ value: averagePriceSynced, name: "Precio prom." }],
        },
      ],
    };
  }, [showPriceChart, averagePriceSynced, currency]);

  const inactive = Math.max(0, properties.length - activeProps);
  const activeNotPublished = Math.max(0, activeProps - publishedProps);

  const donutOption = useMemo(() => {
    const data = [
      { value: publishedProps, name: "Publicadas", itemStyle: { color: "#10b981" } },
      { value: activeNotPublished, name: "Activas sin publicar", itemStyle: { color: "#9b74ff" } },
      { value: inactive, name: "Inactivas", itemStyle: { color: "rgba(148, 163, 184, 0.85)" } },
    ];
    const hasVolume = data.some((d) => d.value > 0);
    const totalLabel = String(properties.length);

    const centerRich = {
      n: {
        fontSize: 20,
        fontWeight: 700 as const,
        fill: "#f5f5f5",
        color: "#f5f5f5",
        fontFamily: "Sora, system-ui, sans-serif",
        align: "center" as const,
        lineHeight: 24,
      },
      s: {
        fontSize: 11,
        fill: "rgba(255,255,255,0.55)",
        color: "rgba(255,255,255,0.55)",
        fontFamily: "Sora, system-ui, sans-serif",
        align: "center" as const,
        lineHeight: 18,
        padding: [4, 0, 0, 0],
      },
    };

    return {
      backgroundColor: "transparent",
      // Con varias porciones el centro del agujero no puede usar label.center (serían N etiquetas): graphic.
      // Con una sola porción, label.position "center" del pie coincide con el centro geométrico del donut.
      graphic: hasVolume
        ? [
            {
              type: "text" as const,
              left: "center",
              top: "46%",
              z: 100,
              style: {
                text: `{n|${totalLabel}}\n{s|propiedades}`,
                textAlign: "center" as const,
                textVerticalAlign: "middle" as const,
                fill: "#f5f5f5",
                rich: centerRich,
              },
            },
          ]
        : [],
      tooltip: {
        ...tooltipBase,
        trigger: "item" as const,
        formatter: "{b}: {c} ({d}%)",
      },
      legend: {
        bottom: 0,
        left: "center",
        textStyle: { color: "rgba(255,255,255,0.55)", fontSize: 10 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: "pie" as const,
          radius: ["44%", "68%"],
          center: ["50%", "46%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: "rgba(15,15,20,0.9)", borderWidth: 2 },
          label: hasVolume
            ? {
                show: true,
                position: "outside" as const,
                color: "rgba(255,255,255,0.75)",
                fontSize: 10,
                formatter: "{b}\n{c}",
              }
            : {
                show: true,
                position: "center" as const,
                formatter: `{n|${totalLabel}}\n{s|propiedades}`,
                rich: centerRich,
              },
          labelLine: {
            show: hasVolume,
            lineStyle: { color: "rgba(255,255,255,0.25)" },
          },
          emphasis: {
            label: hasVolume
              ? { show: true }
              : {
                  show: true,
                  position: "center" as const,
                  formatter: `{n|${totalLabel}}\n{s|propiedades}`,
                  rich: centerRich,
                },
          },
          data: hasVolume
            ? data.filter((d) => d.value > 0)
            : [{ value: 1, name: "Sin propiedades", itemStyle: { color: "rgba(255,255,255,0.12)" } }],
        },
      ],
    };
  }, [properties.length, publishedProps, activeNotPublished, inactive]);

  const stackedConnectionsOption = useMemo(() => {
    const rows = [...connections]
      .map((c) => {
        const synced = c.counts?.room_types_synced ?? c.counts?.properties_synced ?? 0;
        const pending = c.counts?.room_types_pending ?? c.counts?.properties_pending ?? 0;
        const label = c.name.length > 16 ? `${c.name.slice(0, 16)}…` : c.name;
        return { label, synced, pending, total: synced + pending };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const names = rows.map((r) => r.label);
    const syncedVals = rows.map((r) => r.synced);
    const pendingVals = rows.map((r) => r.pending);

    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipBase,
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
      },
      legend: {
        data: ["Sincronizadas", "Pendientes"],
        top: 0,
        right: 0,
        textStyle: { color: "rgba(255,255,255,0.55)", fontSize: 10 },
      },
      grid: { left: "2%", right: "4%", bottom: "2%", top: 32, containLabel: true },
      xAxis: {
        type: "value" as const,
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10 },
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
          name: "Sincronizadas",
          type: "bar" as const,
          stack: "units",
          barMaxWidth: 22,
          data: syncedVals,
          itemStyle: {
            color: barGradient("#22d3ee", "#0891b2"),
          },
        },
        {
          name: "Pendientes",
          type: "bar" as const,
          stack: "units",
          barMaxWidth: 22,
          data: pendingVals,
          itemStyle: {
            color: barGradient("#fbbf24", "#d97706"),
          },
        },
      ],
    };
  }, [connections]);

  const hasConnectionCounts = connections.some((c) => c.counts != null);
  const stackedHeight = Math.min(320, 48 + connections.length * 34);

  return (
    <div className="space-y-6 min-w-0">
      {/* Curvas de línea/área: perfil entre métricas del snapshot; no son histórico temporal. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="min-w-0">
          <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
            Resumen operativo
          </p>
          <ReactECharts
            option={barOption}
            style={{ height: barChartHeight, width: "100%" }}
            opts={{ renderer: "svg" }}
            className="min-w-0"
          />
        </div>
        <div className="min-w-0">
          <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
            Perfil de métricas
          </p>
          <ReactECharts
            option={lineAreaOption}
            style={{ height: barChartHeight, width: "100%" }}
            opts={{ renderer: "svg" }}
            className="min-w-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="min-w-0">
          <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
            Embudo de publicación
          </p>
          <ReactECharts
            option={funnelOption}
            style={{ height: 280, width: "100%" }}
            opts={{ renderer: "svg" }}
            className="min-w-0"
          />
        </div>
        <div className="min-w-0">
          <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
            Balance de KPIs (relativo)
          </p>
          <ReactECharts
            option={radarOption}
            style={{ height: 300, width: "100%" }}
            opts={{ renderer: "svg" }}
            className="min-w-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4 items-start">
        <div className="min-w-0">
          <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
            Cartera de propiedades
          </p>
          <ReactECharts
            option={donutOption}
            style={{ height: 240, width: "100%" }}
            opts={{ renderer: "svg" }}
            className="min-w-0"
          />
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 min-w-0">
          <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
            Cola de sincronización
          </p>
          <div className="flex items-end gap-3 pt-1">
            <div className="flex-1">
              <p className="text-white/35 text-[0.65rem] mb-1">Sincronizadas</p>
              <p className="font-sora font-bold text-cyan-300 text-2xl tabular-nums leading-none">{totalSynced}</p>
            </div>
            <div className="w-px h-10 bg-white/10 shrink-0" />
            <div className="flex-1">
              <p className="text-white/35 text-[0.65rem] mb-1">Pendientes</p>
              <p className="font-sora font-bold text-amber-300 text-2xl tabular-nums leading-none">{totalPending}</p>
            </div>
          </div>
          <p className="text-white/30 text-[0.6rem] mt-3 leading-relaxed">
            Unidades (habitaciones / tipos) reportadas por tus conexiones PMS. El desglose por conexión está abajo.
          </p>
        </div>
      </div>

      {priceGaugeOption ? (
        <div className="min-w-0">
          <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
            Precio promedio (sync)
          </p>
          <ReactECharts
            option={priceGaugeOption}
            style={{ height: 200, width: "100%" }}
            opts={{ renderer: "svg" }}
            className="min-w-0 max-w-md mx-auto lg:mx-0"
          />
        </div>
      ) : null}

      {superAdminPriceSection ? (
        <SuperAdminPriceAnalyticsCharts
          loading={superAdminPriceSection.loading}
          currency={superAdminPriceSection.currency}
          globalAverage={superAdminPriceSection.globalAverage}
          details={superAdminPriceSection.details}
        />
      ) : null}

      {connections.length > 0 && hasConnectionCounts ? (
        <div className="min-w-0">
          <p className="text-white/45 text-[0.62rem] uppercase tracking-[0.12em] font-semibold mb-2">
            Unidades por conexión
          </p>
          <ReactECharts
            option={stackedConnectionsOption}
            style={{ height: stackedHeight, width: "100%" }}
            opts={{ renderer: "svg" }}
            className="min-w-0"
          />
        </div>
      ) : null}
    </div>
  );
}

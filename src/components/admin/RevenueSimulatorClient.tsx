"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { Icon } from "@iconify/react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";
import { AdminPageHeader } from "./AdminPageHeader";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OperatorRow {
  id: number;
  name: string;
  isActive: boolean;
  properties: number;  // editable
  occupancy: number;   // % 0-100, editable
  adr: number;         // avg daily rate, editable
  enabled: boolean;    // include in totals
}

interface GlobalParams {
  commissionRate: number;
  period: "monthly" | "annual";
  currency: "USD" | "COP";
  defaultAdr: number;
  defaultOccupancy: number;
}

interface RowMetrics {
  nights: number;
  gmv: number;
  commission: number;
  netOperator: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PARAMS: GlobalParams = {
  commissionRate: 12,
  period: "monthly",
  currency: "USD",
  defaultAdr: 150,
  defaultOccupancy: 65,
};

const GLASS =
  "rounded-[24px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl";

const INPUT_CLS =
  "bg-white/[0.07] border border-white/[0.12] rounded-xl px-2 py-1.5 text-white text-sm text-right focus:outline-none focus:border-[#b89a5e]/60 focus:bg-white/[0.1] transition-colors";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function computeMetrics(
  row: OperatorRow,
  commissionRate: number,
  period: "monthly" | "annual"
): RowMetrics {
  const days = period === "annual" ? 365 : 30;
  const nights = Math.round(row.properties * days * (row.occupancy / 100));
  const gmv = nights * row.adr;
  const commission = gmv * (commissionRate / 100);
  return { nights, gmv, commission, netOperator: gmv - commission };
}

function fmtCur(v: number, cur: string): string {
  if (v >= 1_000_000)
    return cur === "COP"
      ? `$${(v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}M`
      : `$${(v / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000 && cur !== "COP")
    return `$${(v / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
  return cur === "COP"
    ? `$${Math.round(v).toLocaleString("es-CO")}`
    : `$${Math.round(v).toLocaleString("en-US")}`;
}

function fmtCurFull(v: number, cur: string): string {
  return cur === "COP"
    ? `$${Math.round(v).toLocaleString("es-CO")}`
    : `$${Math.round(v).toLocaleString("en-US")}`;
}

function fmtNum(v: number): string {
  return Math.round(v).toLocaleString("es-CO");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
  valueClass = "text-white/90",
  highlight = false,
}: {
  icon: string;
  label: string;
  value: string;
  valueClass?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`${GLASS} p-4 flex flex-col gap-2 ${
        highlight ? "border-[#b89a5e]/35 bg-[#b89a5e]/[0.09]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          icon={icon}
          className={`text-lg shrink-0 ${highlight ? "text-[#a78bfa]" : "text-white/35"}`}
        />
        <span className="text-xs text-white/45 font-sora leading-snug">{label}</span>
      </div>
      <div className={`font-sora font-black text-xl tracking-tight leading-none ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function PeriodToggle({
  value,
  onChange,
}: {
  value: "monthly" | "annual";
  onChange: (v: "monthly" | "annual") => void;
}) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-white/[0.12]">
      {(["monthly", "annual"] as const).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex-1 py-1.5 px-3 text-sm transition-all whitespace-nowrap ${
            value === p
              ? "bg-[#b89a5e] text-white font-semibold"
              : "bg-white/[0.04] text-white/50 hover:text-white/80"
          }`}
        >
          {p === "monthly" ? "Mensual" : "Anual"}
        </button>
      ))}
    </div>
  );
}

function CurrencyToggle({
  value,
  onChange,
}: {
  value: "USD" | "COP";
  onChange: (v: "USD" | "COP") => void;
}) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-white/[0.12]">
      {(["USD", "COP"] as const).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`flex-1 py-1.5 px-3 text-sm transition-all ${
            value === c
              ? "bg-[#b89a5e] text-white font-semibold"
              : "bg-white/[0.04] text-white/50 hover:text-white/80"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RevenueSimulatorClient() {
  const { role } = useAdmin();

  const [rows, setRows] = useState<OperatorRow[]>([]);
  const [params, setParams] = useState<GlobalParams>(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedGlobal, setAppliedGlobal] = useState(false);

  // ----- Data fetch -----
  useEffect(() => {
    if (role !== "super_admin") return;
    setLoading(true);
    Promise.all([adminApi.getOperators(), adminApi.getProperties()])
      .then(([opsRes, propsRes]) => {
        const ops = opsRes?.results ?? [];
        const props = propsRes?.results ?? [];

        // Count active properties per operator name
        const countByName: Record<string, number> = {};
        for (const p of props) {
          if (p.operator_name) {
            countByName[p.operator_name] = (countByName[p.operator_name] ?? 0) + 1;
          }
        }

        setRows(
          ops.map((op) => ({
            id: op.id,
            name: op.name,
            isActive: op.is_active,
            properties: countByName[op.name] ?? 0,
            occupancy: DEFAULT_PARAMS.defaultOccupancy,
            adr: DEFAULT_PARAMS.defaultAdr,
            enabled: op.is_active,
          }))
        );
      })
      .catch(() => setError("No se pudo cargar la lista de operadores."))
      .finally(() => setLoading(false));
  }, [role]);

  // ----- Row updates -----
  const updateRow = useCallback(
    (id: number, field: keyof OperatorRow, value: number | boolean) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    },
    []
  );

  function applyGlobals() {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        adr: params.defaultAdr,
        occupancy: params.defaultOccupancy,
      }))
    );
    setAppliedGlobal(true);
    setTimeout(() => setAppliedGlobal(false), 1500);
  }

  function resetAll() {
    setParams(DEFAULT_PARAMS);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        adr: DEFAULT_PARAMS.defaultAdr,
        occupancy: DEFAULT_PARAMS.defaultOccupancy,
        enabled: r.isActive,
      }))
    );
  }

  // ----- Computed metrics -----
  const metrics = useMemo<RowMetrics[]>(
    () => rows.map((r) => computeMetrics(r, params.commissionRate, params.period)),
    [rows, params.commissionRate, params.period]
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r, i) => {
        if (!r.enabled) return acc;
        const m = metrics[i];
        return {
          properties: acc.properties + r.properties,
          nights: acc.nights + m.nights,
          gmv: acc.gmv + m.gmv,
          commission: acc.commission + m.commission,
          netOperator: acc.netOperator + m.netOperator,
        };
      },
      { properties: 0, nights: 0, gmv: 0, commission: 0, netOperator: 0 }
    );
  }, [rows, metrics]);

  // ----- ECharts option -----
  const chartOpt = useMemo(() => {
    const cur = params.currency;
    const chartData = rows
      .map((r, i) => ({ name: r.name, commission: metrics[i].commission, enabled: r.enabled }))
      .filter((d) => d.enabled && d.commission > 0)
      .sort((a, b) => a.commission - b.commission); // ascending → highest at top

    return {
      backgroundColor: "transparent",
      tooltip: {
        backgroundColor: "rgba(10,10,20,0.95)",
        borderColor: "rgba(184, 154, 94,0.45)",
        borderWidth: 1,
        textStyle: { color: "#e5e5e5", fontSize: 12 },
        trigger: "axis",
        axisPointer: { type: "shadow" as const },
        formatter: (p: unknown) => {
          const arr = Array.isArray(p) ? p : [p];
          const it = arr[0] as { name?: string; value?: number } | undefined;
          if (!it?.name) return "";
          return `<div style="font-weight:700;margin-bottom:4px">${it.name}</div><div style="color:#a78bfa">Comisión: ${fmtCurFull(it.value ?? 0, cur)}</div>`;
        },
      },
      grid: { left: "2%", right: "14%", bottom: "4%", top: "4%", containLabel: true },
      xAxis: {
        type: "value" as const,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisLabel: {
          color: "rgba(255,255,255,0.38)",
          fontSize: 10,
          formatter: (v: number) =>
            v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`,
        },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      },
      yAxis: {
        type: "category" as const,
        data: chartData.map((d) => d.name),
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(255,255,255,0.65)",
          fontSize: 11,
          formatter: (v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v),
        },
      },
      series: [
        {
          type: "bar" as const,
          data: chartData.map((d) => d.commission),
          barMaxWidth: 28,
          itemStyle: {
            color: {
              type: "linear" as const,
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#9a7d4a" },
                { offset: 1, color: "#9430cf" },
              ],
            },
            borderRadius: [0, 8, 8, 0],
          },
          label: {
            show: true,
            position: "right" as const,
            color: "rgba(255,255,255,0.6)",
            fontSize: 10,
            formatter: ({ value }: { value: number }) => fmtCur(value, cur),
          },
        },
      ],
    };
  }, [rows, metrics, params.currency]);

  const periodLabel = params.period === "annual" ? "anuales" : "mensuales";
  const enabledChartRows = rows.filter((r, i) => r.enabled && metrics[i].commission > 0);
  const chartHeight = Math.max(220, enabledChartRows.length * 40);

  // ----- Access guard -----
  if (role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-64 text-white/40 text-sm">
        <Icon icon="solar:lock-bold-duotone" className="text-2xl mr-3" />
        Sin acceso a esta sección.
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <AdminPageHeader
        title="Simulador de Ingresos"
        subtitle={`Proyecta cuánto factura Almara con el ${params.commissionRate}% de comisión según el portafolio actual de operadores.`}
      >
        <button
          onClick={resetAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.07] border border-white/[0.1] text-white/60 text-sm hover:bg-white/[0.12] hover:text-white/90 transition-all"
        >
          <Icon icon="solar:refresh-bold-duotone" className="text-base" />
          Restaurar defaults
        </button>
      </AdminPageHeader>

      {/* Global Parameters Card */}
      <div className={`${GLASS} p-6`}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#b89a5e]/20 flex items-center justify-center shrink-0">
            <Icon icon="solar:settings-bold-duotone" className="text-[#a78bfa] text-lg" />
          </div>
          <div>
            <h2 className="font-sora font-bold text-white/90 text-base leading-none">
              Parámetros globales
            </h2>
            <p className="text-xs text-white/38 mt-0.5">
              Se aplica a todos los operadores como valor base
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 items-end">
          {/* Commission rate */}
          <div className="lg:col-span-2">
            <label className="text-xs text-white/50 mb-2 block font-sora font-medium">
              Comisión Almara
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={30}
                step={0.5}
                value={params.commissionRate}
                onChange={(e) =>
                  setParams((p) => ({ ...p, commissionRate: Number(e.target.value) }))
                }
                className="flex-1 accent-[#b89a5e] cursor-pointer"
              />
              <div className="flex items-center bg-white/[0.07] border border-white/[0.12] rounded-xl px-3 py-1.5 gap-1 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={30}
                  step={0.5}
                  value={params.commissionRate}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      commissionRate: Math.min(30, Math.max(1, Number(e.target.value))),
                    }))
                  }
                  className="w-10 bg-transparent text-white text-sm text-right focus:outline-none"
                />
                <span className="text-white/50 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="text-xs text-white/50 mb-2 block font-sora font-medium">
              Período
            </label>
            <PeriodToggle
              value={params.period}
              onChange={(v) => setParams((p) => ({ ...p, period: v }))}
            />
          </div>

          {/* Currency */}
          <div>
            <label className="text-xs text-white/50 mb-2 block font-sora font-medium">
              Moneda
            </label>
            <CurrencyToggle
              value={params.currency}
              onChange={(v) => setParams((p) => ({ ...p, currency: v }))}
            />
          </div>

          {/* Default ADR */}
          <div>
            <label className="text-xs text-white/50 mb-2 block font-sora font-medium">
              ADR global{" "}
              <span className="text-white/28 font-normal">({params.currency}/noche)</span>
            </label>
            <input
              type="number"
              min={1}
              value={params.defaultAdr}
              onChange={(e) =>
                setParams((p) => ({ ...p, defaultAdr: Math.max(1, Number(e.target.value)) }))
              }
              className={`${INPUT_CLS} w-full`}
            />
          </div>

          {/* Default Occupancy */}
          <div>
            <label className="text-xs text-white/50 mb-2 block font-sora font-medium">
              Ocupación global
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={params.defaultOccupancy}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    defaultOccupancy: Math.min(100, Math.max(0, Number(e.target.value))),
                  }))
                }
                className={`${INPUT_CLS} flex-1`}
              />
              <span className="text-white/40 text-sm shrink-0">%</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center gap-3">
          <button
            onClick={applyGlobals}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all ${
              appliedGlobal
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : "bg-[#b89a5e]/15 border-[#b89a5e]/30 text-[#a78bfa] hover:bg-[#b89a5e]/25"
            }`}
          >
            <Icon
              icon={appliedGlobal ? "solar:check-circle-bold-duotone" : "solar:arrow-down-bold-duotone"}
              className="text-base"
            />
            {appliedGlobal ? "¡Aplicado!" : "Aplicar ADR y ocupación global a todos"}
          </button>
          <span className="text-xs text-white/30">
            Sobreescribe los valores individuales de cada operador
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon="solar:buildings-2-bold-duotone"
          label="Propiedades activas"
          value={fmtNum(totals.properties)}
        />
        <SummaryCard
          icon="solar:moon-bold-duotone"
          label={`Noches ${periodLabel}`}
          value={fmtNum(totals.nights)}
        />
        <SummaryCard
          icon="solar:dollar-minimalistic-bold-duotone"
          label={`GMV ${params.period === "annual" ? "anual" : "mensual"}`}
          value={fmtCur(totals.gmv, params.currency)}
        />
        <SummaryCard
          icon="solar:chart-bold-duotone"
          label={`Comisión Almara (${params.commissionRate}%)`}
          value={fmtCur(totals.commission, params.currency)}
          valueClass="text-[#a78bfa]"
          highlight
        />
        <SummaryCard
          icon="solar:hand-money-bold-duotone"
          label="Neto operadores"
          value={fmtCur(totals.netOperator, params.currency)}
          valueClass="text-emerald-400"
        />
      </div>

      {/* Operators Table */}
      <div className={`${GLASS} p-6`}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#b89a5e]/20 flex items-center justify-center shrink-0">
            <Icon icon="solar:users-group-rounded-bold-duotone" className="text-[#a78bfa] text-lg" />
          </div>
          <div>
            <h2 className="font-sora font-bold text-white/90 text-base leading-none">
              Desglose por operador
            </h2>
            <p className="text-xs text-white/38 mt-0.5">
              Edita propiedades, ocupación o ADR por operador para escenarios personalizados
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-36 text-white/40 text-sm gap-3">
            <Icon icon="svg-spinners:ring-resize" className="text-[#b89a5e] text-xl" />
            Cargando operadores y propiedades…
          </div>
        ) : error ? (
          <div className="text-center text-red-400/80 text-sm py-10">
            <Icon icon="solar:danger-triangle-bold-duotone" className="text-2xl mb-2" />
            <br />
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="pb-3 px-2 w-8" />
                  <th className="text-left text-xs text-white/40 font-sora font-semibold pb-3 px-2">
                    Operador
                  </th>
                  <th className="text-right text-xs text-white/40 font-sora font-semibold pb-3 px-2 w-24">
                    Props.
                  </th>
                  <th className="text-right text-xs text-white/40 font-sora font-semibold pb-3 px-2 w-28">
                    Ocupación
                  </th>
                  <th className="text-right text-xs text-white/40 font-sora font-semibold pb-3 px-2 w-32">
                    ADR ({params.currency})
                  </th>
                  <th className="text-right text-xs text-white/40 font-sora font-semibold pb-3 px-2 w-24">
                    Noches
                  </th>
                  <th className="text-right text-xs text-white/40 font-sora font-semibold pb-3 px-2 w-28">
                    Facturación
                  </th>
                  <th className="text-right text-xs text-white/40 font-sora font-semibold pb-3 px-2 w-28">
                    Comisión
                  </th>
                  <th className="text-right text-xs text-white/40 font-sora font-semibold pb-3 px-2 w-28">
                    Neto Op.
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const m = metrics[i];
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-white/[0.04] transition-colors ${
                        !row.enabled ? "opacity-35" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Checkbox toggle */}
                      <td className="py-2 px-2">
                        <button
                          onClick={() => updateRow(row.id, "enabled", !row.enabled)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            row.enabled
                              ? "bg-[#b89a5e] border-[#b89a5e]"
                              : "bg-transparent border-white/20 hover:border-white/40"
                          }`}
                        >
                          {row.enabled && (
                            <Icon icon="solar:check-read-bold" className="text-white text-[10px]" />
                          )}
                        </button>
                      </td>

                      {/* Operator name */}
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              row.isActive ? "bg-emerald-400" : "bg-white/20"
                            }`}
                          />
                          <span className="text-white/85 font-medium truncate max-w-[180px]">
                            {row.name}
                          </span>
                          {!row.isActive && (
                            <span className="text-[10px] text-white/30 bg-white/[0.06] rounded-md px-1.5 py-0.5 shrink-0">
                              inactivo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Properties - editable */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          value={row.properties}
                          onChange={(e) =>
                            updateRow(row.id, "properties", Math.max(0, Number(e.target.value)))
                          }
                          className={`${INPUT_CLS} w-20`}
                        />
                      </td>

                      {/* Occupancy - editable */}
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={row.occupancy}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "occupancy",
                                Math.min(100, Math.max(0, Number(e.target.value)))
                              )
                            }
                            className={`${INPUT_CLS} w-16`}
                          />
                          <span className="text-white/35 text-xs shrink-0">%</span>
                        </div>
                      </td>

                      {/* ADR - editable */}
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-white/35 text-xs shrink-0">$</span>
                          <input
                            type="number"
                            min={0}
                            value={row.adr}
                            onChange={(e) =>
                              updateRow(row.id, "adr", Math.max(0, Number(e.target.value)))
                            }
                            className={`${INPUT_CLS} w-24`}
                          />
                        </div>
                      </td>

                      {/* Computed — read only */}
                      <td className="py-2 px-2 text-right tabular-nums text-white/60">
                        {fmtNum(m.nights)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-white/75">
                        {fmtCur(m.gmv, params.currency)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        <span className="text-[#a78bfa] font-semibold">
                          {fmtCur(m.commission, params.currency)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-emerald-400">
                        {fmtCur(m.netOperator, params.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/[0.1]">
                  <td />
                  <td className="pt-3 px-2">
                    <span className="text-xs font-sora font-bold text-white/50 tracking-wide uppercase">
                      Totales
                    </span>
                  </td>
                  <td className="pt-3 px-2 text-right text-white/55 text-xs tabular-nums">
                    {fmtNum(totals.properties)}
                  </td>
                  <td />
                  <td />
                  <td className="pt-3 px-2 text-right text-white/65 tabular-nums">
                    {fmtNum(totals.nights)}
                  </td>
                  <td className="pt-3 px-2 text-right font-semibold text-white/85 tabular-nums">
                    {fmtCur(totals.gmv, params.currency)}
                  </td>
                  <td className="pt-3 px-2 text-right">
                    <span className="text-[#a78bfa] font-black text-lg tabular-nums leading-none">
                      {fmtCur(totals.commission, params.currency)}
                    </span>
                  </td>
                  <td className="pt-3 px-2 text-right text-emerald-400 font-semibold tabular-nums">
                    {fmtCur(totals.netOperator, params.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Commission Distribution Chart */}
      {!loading && enabledChartRows.length > 0 && (
        <div className={`${GLASS} p-6`}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#b89a5e]/20 flex items-center justify-center shrink-0">
              <Icon icon="solar:chart-2-bold-duotone" className="text-[#a78bfa] text-lg" />
            </div>
            <div>
              <h2 className="font-sora font-bold text-white/90 text-base leading-none">
                Distribución de comisión
              </h2>
              <p className="text-xs text-white/38 mt-0.5">
                Comisión {periodLabel} por operador · ordenado de mayor a menor
              </p>
            </div>
          </div>
          <ReactECharts
            option={chartOpt}
            style={{ height: chartHeight, width: "100%" }}
            opts={{ renderer: "svg" }}
          />
        </div>
      )}

      {/* Projection breakdown */}
      {!loading && totals.commission > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: params.period === "annual" ? "Promedio mensual" : "Proyección anual",
              value:
                params.period === "annual"
                  ? fmtCur(totals.commission / 12, params.currency)
                  : fmtCur(totals.commission * 12, params.currency),
              icon: "solar:calendar-bold-duotone",
              sub:
                params.period === "annual"
                  ? "Comisión promedio por mes"
                  : "Si se mantiene la ocupación todo el año",
            },
            {
              label: "Por propiedad activa",
              value:
                totals.properties > 0
                  ? fmtCur(totals.commission / totals.properties, params.currency)
                  : "—",
              icon: "solar:home-bold-duotone",
              sub: `Comisión ${periodLabel} promedio`,
            },
            {
              label: "Tasa de retención",
              value: `${params.commissionRate}%`,
              icon: "solar:pie-chart-bold-duotone",
              sub: `Almara retiene ${params.commissionRate}% del GMV`,
            },
          ].map((card) => (
            <div key={card.label} className={`${GLASS} p-5 flex gap-4 items-start`}>
              <div className="w-10 h-10 rounded-xl bg-[#b89a5e]/15 flex items-center justify-center shrink-0">
                <Icon icon={card.icon} className="text-[#a78bfa] text-xl" />
              </div>
              <div>
                <div className="font-sora font-black text-2xl text-white/90 tracking-tight">
                  {card.value}
                </div>
                <div className="text-xs font-sora font-semibold text-white/55 mt-0.5">
                  {card.label}
                </div>
                <div className="text-xs text-white/30 mt-0.5">{card.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className={`${GLASS} p-4 flex items-start gap-3`}>
        <Icon
          icon="solar:info-circle-bold-duotone"
          className="text-[#a78bfa] text-xl shrink-0 mt-0.5"
        />
        <p className="text-xs text-white/40 leading-relaxed">
          <strong className="text-white/60">Nota:</strong> Los valores son proyecciones basadas en
          parámetros configurables. La facturación real depende de la ocupación efectiva, las
          tarifas reales por propiedad, cancelaciones y otros factores operativos. El conteo de
          propiedades se obtiene del inventario actual en la plataforma y puede editarse para
          simular escenarios futuros de crecimiento.
        </p>
      </div>
    </div>
  );
}

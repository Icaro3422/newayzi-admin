"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { adminApi, type RewardPoolSummary, type RewardPoolMovement } from "@/lib/admin-api";

const KIND_LABELS: Record<RewardPoolMovement["kind"], string> = {
  contribution: "Aporte reserva",
  cashback_issued: "Cashback emitido",
  redemption: "Redención",
  breakage: "Breakage",
  adjustment: "Ajuste",
};

const KIND_ICONS: Record<RewardPoolMovement["kind"], string> = {
  contribution: "solar:arrow-down-bold-duotone",
  cashback_issued: "solar:gift-bold-duotone",
  redemption: "solar:wallet-money-bold-duotone",
  breakage: "solar:fire-bold-duotone",
  adjustment: "solar:settings-bold-duotone",
};

const KIND_COLORS: Record<RewardPoolMovement["kind"], string> = {
  contribution: "text-emerald-400",
  cashback_issued: "text-violet-400",
  redemption: "text-amber-400",
  breakage: "text-rose-400",
  adjustment: "text-sky-400",
};

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString("es-CO")}`;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function PoolStat({
  label,
  value,
  icon,
  color,
  loading,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-3 min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon icon={icon} className={`text-sm shrink-0 ${color}`} />
        <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.1em] font-semibold truncate">{label}</p>
      </div>
      {loading ? (
        <div className="h-5 w-20 rounded-md bg-white/10 animate-pulse" />
      ) : (
        <p className="font-sora font-black text-white text-lg leading-none">{fmt(value)}</p>
      )}
    </div>
  );
}

export function RewardPoolStatus() {
  const [pool, setPool] = useState<RewardPoolSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.getPoolSummary().then((data) => {
      if (!cancelled) {
        setPool(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const rewardRatio = pool && pool.totalContributed > 0
    ? ((pool.totalIssued / pool.totalContributed) * 100).toFixed(1)
    : "0.0";

  const redemptionRate = pool && pool.totalIssued > 0
    ? ((pool.totalRedeemed / pool.totalIssued) * 100).toFixed(1)
    : "0.0";

  return (
    <div
      className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 flex flex-col gap-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">
            Newayzi Rewards
          </p>
          <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
            Reward Pool — Fondo central
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Icon icon="solar:safe-2-bold-duotone" className="text-emerald-400 text-base" />
        </div>
      </div>

      {/* Balance destacado */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-emerald-300/70 text-[0.65rem] uppercase tracking-wide font-semibold">
            Saldo disponible
          </p>
          {loading ? (
            <div className="h-8 w-32 rounded-md bg-white/10 animate-pulse mt-1" />
          ) : (
            <p className="font-sora font-black text-emerald-300 text-3xl leading-none mt-0.5">
              {pool ? fmt(pool.currentBalance) : "$0"}
            </p>
          )}
          <p className="text-emerald-400/60 text-[0.65rem] mt-1">COP en el fondo</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-[0.65rem] uppercase tracking-wide font-semibold">Pasivo vivo</p>
          {loading ? (
            <div className="h-6 w-20 rounded-md bg-white/10 animate-pulse mt-1 ml-auto" />
          ) : (
            <p className="font-sora font-bold text-amber-300 text-xl leading-none mt-0.5">
              {pool ? fmt(pool.liability) : "$0"}
            </p>
          )}
          <p className="text-white/35 text-[0.65rem] mt-1">pts por canjear</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <PoolStat
          label="Total aportado"
          value={pool?.totalContributed ?? 0}
          icon="solar:arrow-down-bold-duotone"
          color="text-sky-400"
          loading={loading}
        />
        <PoolStat
          label="Cashback emitido"
          value={pool?.totalIssued ?? 0}
          icon="solar:gift-bold-duotone"
          color="text-violet-400"
          loading={loading}
        />
        <PoolStat
          label="Canjeado"
          value={pool?.totalRedeemed ?? 0}
          icon="solar:wallet-money-bold-duotone"
          color="text-amber-400"
          loading={loading}
        />
        <PoolStat
          label="Breakage"
          value={pool?.totalBreakage ?? 0}
          icon="solar:fire-bold-duotone"
          color="text-rose-400"
          loading={loading}
        />
      </div>

      {/* Métricas de salud */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-3 flex gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[0.6rem] uppercase tracking-wider font-semibold">Reward ratio</p>
          <p className="font-sora font-bold text-white text-lg leading-none mt-0.5">{rewardRatio}%</p>
          <p className="text-white/30 text-[0.6rem] mt-0.5">emitido / aportado</p>
          <p className="text-white/25 text-[0.58rem]">Meta sana: 50–80%</p>
        </div>
        <div className="w-px bg-white/[0.08]" />
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[0.6rem] uppercase tracking-wider font-semibold">Redemption rate</p>
          <p className="font-sora font-bold text-white text-lg leading-none mt-0.5">{redemptionRate}%</p>
          <p className="text-white/30 text-[0.6rem] mt-0.5">canjeado / emitido</p>
          <p className="text-white/25 text-[0.58rem]">Meta esperada: 60–80%</p>
        </div>
        <div className="w-px bg-white/[0.08]" />
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[0.6rem] uppercase tracking-wider font-semibold">Usuarios</p>
          <p className="font-sora font-bold text-white text-lg leading-none mt-0.5">
            {loading ? "–" : (pool?.totalUsersWithPoints ?? 0).toLocaleString()}
          </p>
          <p className="text-white/30 text-[0.6rem] mt-0.5">con puntos activos</p>
        </div>
      </div>

      {/* Últimos movimientos */}
      <div>
        <p className="text-white/40 text-[0.65rem] uppercase tracking-[0.12em] font-semibold mb-2">
          Últimos movimientos del pool
        </p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : !pool?.recentMovements?.length ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 py-8">
            <p className="text-white/30 text-[0.8rem]">Sin movimientos aún</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {pool.recentMovements.slice(0, 8).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2"
              >
                <Icon
                  icon={KIND_ICONS[m.kind] ?? "solar:info-circle-bold-duotone"}
                  className={`text-sm shrink-0 ${KIND_COLORS[m.kind] ?? "text-white/40"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white/75 text-[0.72rem] font-medium leading-none">
                    {KIND_LABELS[m.kind] ?? m.kind}
                  </p>
                  {m.notes && (
                    <p className="text-white/30 text-[0.6rem] leading-snug truncate mt-0.5">{m.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-sora font-bold text-[0.78rem] leading-none ${
                      m.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {m.amount >= 0 ? "+" : ""}{fmt(m.amount)}
                  </p>
                  <p className="text-white/30 text-[0.58rem] mt-0.5">{relativeTime(m.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

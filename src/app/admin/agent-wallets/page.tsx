"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Icon } from "@iconify/react";
import {
  agentWallets,
  type AgentWallet,
  type WalletMovementReason,
  type LoyaltyLevelValue,
  LEVEL_OPTIONS,
  WALLET_REASON_OPTIONS,
} from "@/lib/admin-api";

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-violet-500/20 text-violet-300",
  agente:      "bg-blue-500/20 text-blue-300",
  comercial:   "bg-emerald-500/20 text-emerald-300",
  operador:    "bg-amber-500/20 text-amber-300",
  visualizador:"bg-white/10 text-white/60",
};
const LEVEL_COLORS: Record<string, string> = {
  member:  "text-slate-300",
  plus:    "text-blue-300",
  premium: "text-amber-300",
};
const LEVEL_ICONS: Record<string, string> = {
  member:  "solar:medal-ribbons-star-bold-duotone",
  plus:    "solar:medal-ribbon-bold-duotone",
  premium: "solar:crown-bold-duotone",
};

function fmt(n: number) { return new Intl.NumberFormat("es-CO").format(n); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

interface AdjustModal {
  wallet: AgentWallet;
  amount: string;
  reason: WalletMovementReason;
  note: string;
  level: LoyaltyLevelValue;
  loading: boolean;
  error: string | null;
}

export default function AgentWalletsPage() {
  const { getToken } = useAuth();
  const [wallets, setWallets] = useState<AgentWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adjustModal, setAdjustModal] = useState<AdjustModal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await agentWallets.list(token);
      setWallets(data);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const filtered = wallets.filter((w) =>
    `${w.agent_name} ${w.agent_email} ${w.agent_role}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdjust() {
    if (!adjustModal) return;
    const amount = adjustModal.amount ? parseFloat(adjustModal.amount) : undefined;
    if (amount !== undefined && isNaN(amount)) {
      setAdjustModal((m) => m && ({ ...m, error: "Monto inválido." }));
      return;
    }
    setAdjustModal((m) => m && ({ ...m, loading: true, error: null }));
    try {
      const token = await getToken();
      if (!token) throw new Error("Sin autenticación.");
      await agentWallets.adjust(adjustModal.wallet.profile_id, token, {
        amount,
        reason: adjustModal.reason,
        note: adjustModal.note,
        level: adjustModal.level !== adjustModal.wallet.level ? adjustModal.level : undefined,
      });
      setAdjustModal(null);
      load();
    } catch (e: unknown) {
      setAdjustModal((m) => m && ({ ...m, loading: false, error: e instanceof Error ? e.message : "Error." }));
    }
  }

  const totalPoints = wallets.reduce((s, w) => s + w.points, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Billeteras Newayzi Rewards</h1>
          <p className="text-white/50 text-sm mt-1">
            Los puntos del equipo interno son los mismos puntos del programa Newayzi Rewards.
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs uppercase tracking-wider">Total en circulación</p>
          <p className="text-2xl font-bold text-violet-300">{fmt(totalPoints)} pts</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Icon icon="solar:magnifer-bold-duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o rol…"
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-white/40">
          <Icon icon="solar:spinner-bold-duotone" className="animate-spin text-3xl mr-3" />
          Cargando billeteras…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <Icon icon="solar:wallet-bold-duotone" className="text-4xl mx-auto mb-3" />
          <p>{search ? "Sin resultados." : "No hay agentes con billetera activa."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <div key={w.profile_id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
                {/* Avatar / nivel */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center">
                    <Icon icon="solar:user-bold-duotone" className="text-violet-300 text-xl" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1a1a2e] flex items-center justify-center">
                    <Icon icon={LEVEL_ICONS[w.level] ?? "solar:medal-ribbon-bold-duotone"} className={`text-xs ${LEVEL_COLORS[w.level] ?? "text-white"}`} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{w.agent_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[w.agent_role] ?? "bg-white/10 text-white/50"}`}>{w.agent_role}</span>
                    <span className={`text-xs font-semibold ${LEVEL_COLORS[w.level] ?? "text-white"}`}>{w.level_label}</span>
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">{w.agent_email}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-white">{fmt(w.points)}<span className="text-violet-400 text-sm ml-1">pts</span></p>
                  <p className="text-white/30 text-xs">{w.movements.length} movimientos</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setAdjustModal({ wallet: w, amount: "", reason: "bonus", note: "", level: w.level, loading: false, error: null })}
                    title="Dar bono de puntos"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 text-xs font-semibold transition-colors"
                  >
                    <Icon icon="solar:gift-bold-duotone" /> Bono
                  </button>
                  <button
                    onClick={() => setAdjustModal({ wallet: w, amount: "", reason: "adjustment", note: "", level: w.level, loading: false, error: null })}
                    title="Ajuste manual / cambiar nivel"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/20 hover:bg-violet-500/25 text-xs font-semibold transition-colors"
                  >
                    <Icon icon="solar:settings-bold-duotone" /> Ajustar
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === w.profile_id ? null : w.profile_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 text-xs font-semibold transition-colors"
                  >
                    <Icon icon={expandedId === w.profile_id ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} />
                    Historial
                  </button>
                </div>
              </div>

              {expandedId === w.profile_id && (
                <div className="border-t border-white/10">
                  {w.movements.length === 0 ? (
                    <p className="px-6 py-4 text-white/30 text-sm">Sin movimientos.</p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {w.movements.map((m) => {
                        const isCredit = m.amount > 0;
                        return (
                          <div key={m.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                            <span className={`font-bold w-28 text-right flex-shrink-0 ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                              {isCredit ? "+" : ""}{fmt(m.amount)} pts
                            </span>
                            <span className="text-white/60 flex-1">{m.reason_label}{m.note ? ` — ${m.note}` : ""}</span>
                            <span className="text-white/30 text-xs flex-shrink-0">{fmtDate(m.created_at)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a2e] border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  {adjustModal.reason === "bonus"
                    ? <><Icon icon="solar:gift-bold-duotone" className="text-emerald-400" /> Dar bono de puntos</>
                    : <><Icon icon="solar:settings-bold-duotone" className="text-violet-400" /> Ajustar billetera Rewards</>}
                </h3>
                <p className="text-white/50 text-xs mt-0.5">{adjustModal.wallet.agent_name}</p>
              </div>
              <button onClick={() => setAdjustModal(null)} className="text-white/40 hover:text-white">
                <Icon icon="solar:close-circle-bold" className="text-xl" />
              </button>
            </div>

            {/* Saldo y nivel actual */}
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-5 flex items-center justify-between">
              <div>
                <span className="text-white/60 text-xs">Saldo actual</span>
                <p className="font-bold text-violet-300 text-lg">{fmt(adjustModal.wallet.points)} pts</p>
              </div>
              <div className="text-right">
                <span className="text-white/60 text-xs">Nivel actual</span>
                <p className={`font-bold text-sm ${LEVEL_COLORS[adjustModal.wallet.level]}`}>{adjustModal.wallet.level_label}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Nivel */}
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">Cambiar nivel Rewards</label>
                <select
                  value={adjustModal.level}
                  onChange={(e) => setAdjustModal((m) => m && ({ ...m, level: e.target.value as LoyaltyLevelValue }))}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  {LEVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#1a1a2e]">{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">
                  Puntos a agregar o descontar <span className="font-normal text-white/30">(dejar vacío si solo cambia nivel)</span>
                </label>
                <input
                  type="number"
                  value={adjustModal.amount}
                  onChange={(e) => setAdjustModal((m) => m && ({ ...m, amount: e.target.value }))}
                  placeholder="Ej: 500 o -200"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">Razón</label>
                <select
                  value={adjustModal.reason}
                  onChange={(e) => setAdjustModal((m) => m && ({ ...m, reason: e.target.value as WalletMovementReason }))}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  {WALLET_REASON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#1a1a2e]">{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">Nota para el agente (opcional)</label>
                <input
                  type="text"
                  value={adjustModal.note}
                  onChange={(e) => setAdjustModal((m) => m && ({ ...m, note: e.target.value }))}
                  placeholder="Ej: Bono por cierre Q1 2026"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {adjustModal.error && (
                <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-3 py-2">{adjustModal.error}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setAdjustModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white text-sm font-semibold transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjustModal.loading || (!adjustModal.amount && adjustModal.level === adjustModal.wallet.level)}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  adjustModal.reason === "bonus"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-violet-600 hover:bg-violet-500"
                }`}
              >
                {adjustModal.loading && <Icon icon="solar:spinner-bold-duotone" className="animate-spin" />}
                {adjustModal.reason === "bonus" ? "Entregar bono" : "Confirmar ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

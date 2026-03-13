"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Icon } from "@iconify/react";
import { agentWallets, type AgentWallet } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

const LEVEL_ICONS: Record<string, string> = {
  member: "solar:medal-ribbons-star-bold-duotone",
  plus:   "solar:medal-ribbon-bold-duotone",
  premium:"solar:crown-bold-duotone",
};
const LEVEL_COLORS: Record<string, string> = {
  member:  "text-slate-300",
  plus:    "text-blue-300",
  premium: "text-amber-300",
};
const REASON_ICONS: Record<string, string> = {
  cashback:           "solar:wallet-money-bold-duotone",
  redemption:         "solar:card-bold-duotone",
  adjustment:         "solar:settings-bold-duotone",
  booking_commission: "solar:bookmark-bold-duotone",
  bonus:              "solar:gift-bold-duotone",
  correction:         "solar:pen-bold-duotone",
};

function fmt(n: number) { return new Intl.NumberFormat("es-CO").format(n); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtCOP(n: number) { return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n); }

export default function AgentWalletPage() {
  const { getToken } = useAuth();
  const { me } = useAdmin();
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sin autenticación.");
      const data = await agentWallets.getOwn(token);
      setWallet(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar billetera.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white/40">
      <Icon icon="solar:spinner-bold-duotone" className="text-4xl animate-spin mr-3" />
      Cargando tu billetera…
    </div>
  );

  if (error || !wallet?.exists) return (
    <div className="max-w-lg mx-auto mt-16 text-center">
      <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
        <Icon icon="solar:wallet-bold-duotone" className="text-3xl text-yellow-400" />
      </div>
      <h2 className="text-lg font-bold text-white mb-2">Billetera no disponible</h2>
      <p className="text-white/50 text-sm">{error ?? "Tu billetera de Newayzi Rewards aún no ha sido activada. Contacta a tu administrador."}</p>
    </div>
  );

  const totalCredits = wallet.movements.filter(m => m.amount > 0).reduce((s, m) => s + m.amount, 0);
  const totalDebits  = wallet.movements.filter(m => m.amount < 0).reduce((s, m) => s + Math.abs(m.amount), 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi Billetera Newayzi Rewards</h1>
        <p className="text-white/50 text-sm mt-1">
          Puntos acumulados como {me?.role ?? "agente"} · Los mismos puntos que usan los huéspedes.
        </p>
      </div>

      {/* Balance + nivel */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/30 p-6 flex flex-wrap items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
          <Icon icon="solar:wallet-bold-duotone" className="text-3xl text-violet-300" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Saldo actual</p>
          <p className="text-4xl font-bold text-white mt-1">
            {fmt(wallet.points)}<span className="text-violet-300 text-xl ml-2">pts</span>
          </p>
          {wallet.updated_at && (
            <p className="text-white/30 text-xs mt-1">Actualizado {fmtDate(wallet.updated_at)}</p>
          )}
        </div>

        {/* Nivel */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
          <Icon icon={LEVEL_ICONS[wallet.level] ?? "solar:medal-ribbon-bold-duotone"} className={`text-3xl ${LEVEL_COLORS[wallet.level] ?? "text-white"}`} />
          <span className={`text-sm font-bold ${LEVEL_COLORS[wallet.level] ?? "text-white"}`}>{wallet.level_label}</span>
          <span className="text-white/30 text-xs">Nivel Rewards</span>
        </div>

        {/* Stats */}
        <div className="flex gap-5 text-center flex-shrink-0">
          <div>
            <p className="text-xl font-bold text-emerald-400">{fmt(totalCredits)}</p>
            <p className="text-white/40 text-xs mt-0.5">Créditos</p>
          </div>
          <div>
            <p className="text-xl font-bold text-red-400">{fmt(totalDebits)}</p>
            <p className="text-white/40 text-xs mt-0.5">Débitos</p>
          </div>
          <div>
            <p className="text-xl font-bold text-white/70">{wallet.completed_bookings}</p>
            <p className="text-white/40 text-xs mt-0.5">Reservas</p>
          </div>
          {wallet.total_spent > 0 && (
            <div>
              <p className="text-xl font-bold text-white/70">{fmtCOP(wallet.total_spent)}</p>
              <p className="text-white/40 text-xs mt-0.5">Gastado</p>
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-2xl bg-white/5 border border-white/10">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-bold text-white">Historial de movimientos</h2>
          <p className="text-white/40 text-xs mt-0.5">Cashback de reservas, bonos, ajustes y redenciones · últimos 50</p>
        </div>

        {wallet.movements.length === 0 ? (
          <div className="px-6 py-12 text-center text-white/40">
            <Icon icon="solar:history-bold-duotone" className="text-3xl mx-auto mb-2" />
            <p>Sin movimientos aún.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {wallet.movements.map((m) => {
              const isCredit = m.amount > 0;
              return (
                <div key={m.id} className="px-6 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                    <Icon icon={REASON_ICONS[m.reason] ?? "solar:transfer-horizontal-bold-duotone"} className={`text-xl ${isCredit ? "text-emerald-400" : "text-red-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{m.reason_label}</p>
                    {m.note && <p className="text-xs text-white/50 truncate mt-0.5">{m.note}</p>}
                    <p className="text-xs text-white/30 mt-0.5">{fmtDate(m.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-base ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                      {isCredit ? "+" : ""}{fmt(m.amount)} pts
                    </p>
                    {m.expires_at && !m.is_expired && (
                      <p className="text-amber-400/60 text-xs mt-0.5">Vence {fmtDate(m.expires_at)}</p>
                    )}
                    {m.is_expired && <p className="text-red-400/60 text-xs mt-0.5">Expirado</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

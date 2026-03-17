"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Icon } from "@iconify/react";
import { agentWallets, rewardsAgreementsApi, type AgentWallet, type OperatorRewardsData } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

/* ── Helpers ─────────────────────────────────────── */
function fmt(n: number) { return new Intl.NumberFormat("es-CO").format(n); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}
function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

/* ── Iconografía para billetera de agente ─────────── */
const LEVEL_ICONS: Record<string, string> = {
  member:  "solar:medal-ribbons-star-bold-duotone",
  plus:    "solar:medal-ribbon-bold-duotone",
  premium: "solar:crown-bold-duotone",
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

/* ── Vista para AGENTE / COMERCIAL / VISUALIZADOR ── */
function AgentWalletView() {
  const { getToken } = useAuth();
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
      <p className="text-white/50 text-sm">{error ?? "Tu billetera de Newayzi Rewards aún no ha sido activada."}</p>
    </div>
  );

  const totalCredits = wallet.movements.filter(m => m.amount > 0).reduce((s, m) => s + m.amount, 0);
  const totalDebits  = wallet.movements.filter(m => m.amount < 0).reduce((s, m) => s + Math.abs(m.amount), 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi Billetera Newayzi Rewards</h1>
        <p className="text-white/50 text-sm mt-1">
          Puntos acumulados · Se convierten en descuentos y cashback en futuras reservas.
        </p>
      </div>

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
        <div className="flex flex-col items-center gap-1 flex-shrink-0 bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
          <Icon icon={LEVEL_ICONS[wallet.level] ?? "solar:medal-ribbon-bold-duotone"} className={`text-3xl ${LEVEL_COLORS[wallet.level] ?? "text-white"}`} />
          <span className={`text-sm font-bold ${LEVEL_COLORS[wallet.level] ?? "text-white"}`}>{wallet.level_label}</span>
          <span className="text-white/30 text-xs">Nivel Rewards</span>
        </div>
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

/* ── Vista para OPERADOR ──────────────────────────── */
function OperatorRewardsView({ operatorId }: { operatorId: number }) {
  const [data, setData] = useState<OperatorRewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    rewardsAgreementsApi.getForOperator(operatorId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar información."))
      .finally(() => setLoading(false));
  }, [operatorId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white/40">
      <Icon icon="solar:spinner-bold-duotone" className="text-4xl animate-spin mr-3" />
      Cargando tu participación en Rewards…
    </div>
  );

  if (error) return (
    <div className="max-w-lg mx-auto mt-16 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <Icon icon="solar:danger-bold-duotone" className="text-3xl text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-white mb-2">Error al cargar</h2>
      <p className="text-white/50 text-sm">{error}</p>
    </div>
  );

  const agreement = data?.activeAgreement ?? null;
  const stats = data?.stats;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi Participación en Newayzi Rewards</h1>
        <p className="text-white/50 text-sm mt-1">
          Como operador, contribuyes al fondo de cashback para que tus huéspedes acumulen puntos.
          A cambio, ganas mayor visibilidad y mejores condiciones en la plataforma.
        </p>
      </div>

      {/* Acuerdo activo */}
      {agreement ? (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-600/15 border border-emerald-500/30 p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <Icon icon="solar:handshake-bold-duotone" className="text-2xl text-emerald-400" />
              </div>
              <div>
                <p className="text-white/50 text-[0.65rem] uppercase tracking-widest font-semibold">Acuerdo activo</p>
                <p className="font-sora font-bold text-white text-lg leading-tight">
                  {agreement.rewardsLabelDisplay}
                </p>
              </div>
            </div>
            <span className="text-[0.68rem] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              {agreement.statusDisplay}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3">
              <p className="text-white/45 text-[0.62rem] uppercase tracking-wide">Cashback que ofreces</p>
              <p className="font-sora font-black text-white text-2xl mt-0.5">
                {agreement.cashbackContributionPct}
              </p>
              <p className="text-white/40 text-[0.65rem] mt-0.5">del valor de cada reserva</p>
            </div>
            <div className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3">
              <p className="text-white/45 text-[0.62rem] uppercase tracking-wide">Visibilidad</p>
              <p className="font-sora font-bold text-white text-sm mt-1 leading-tight">
                {agreement.visibilityBoostDisplay}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3">
              <p className="text-white/45 text-[0.62rem] uppercase tracking-wide">Vigencia</p>
              <p className="font-sora font-bold text-white text-sm mt-1 leading-tight">
                Desde {fmtDateShort(agreement.effectiveFrom)}
              </p>
              {agreement.effectiveUntil ? (
                <p className="text-white/40 text-[0.65rem]">
                  Hasta {fmtDateShort(agreement.effectiveUntil)}
                </p>
              ) : (
                <p className="text-white/40 text-[0.65rem]">Sin fecha de vencimiento</p>
              )}
            </div>
          </div>

          {agreement.termsNotes && (
            <div className="mt-3 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3">
              <p className="text-white/50 text-[0.72rem]">{agreement.termsNotes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6 text-center">
          <Icon icon="solar:file-text-bold-duotone" className="text-3xl text-amber-400 mx-auto mb-2" />
          <p className="font-bold text-white mb-1">Sin acuerdo activo</p>
          <p className="text-white/55 text-sm">
            Aún no tienes un acuerdo comercial con Newayzi. Contacta al equipo para configurar tu participación en el programa Rewards.
          </p>
        </div>
      )}

      {/* Estadísticas de participación */}
      {stats && (
        <div>
          <h2 className="font-sora font-bold text-white mb-3">Estadísticas de participación</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/[0.045] border border-white/[0.09] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Icon icon="solar:wallet-money-bold-duotone" className="text-violet-400 text-lg" />
                </div>
                <p className="text-white/55 text-[0.72rem] uppercase tracking-wide font-semibold">
                  Aportado al pool
                </p>
              </div>
              <p className="font-sora font-black text-white text-2xl">
                {fmtCOP(stats.poolContributions)}
              </p>
              <p className="text-white/35 text-[0.65rem] mt-0.5">contribuido al fondo Newayzi</p>
            </div>

            <div className="rounded-2xl bg-white/[0.045] border border-white/[0.09] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Icon icon="solar:card-recive-bold-duotone" className="text-emerald-400 text-lg" />
                </div>
                <p className="text-white/55 text-[0.72rem] uppercase tracking-wide font-semibold">
                  Cashback emitido
                </p>
              </div>
              <p className="font-sora font-black text-white text-2xl">
                {fmtCOP(stats.cashbackEmitted)}
              </p>
              <p className="text-white/35 text-[0.65rem] mt-0.5">recibido por tus huéspedes</p>
            </div>

            <div className="rounded-2xl bg-white/[0.045] border border-white/[0.09] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Icon icon="solar:bookmark-bold-duotone" className="text-amber-400 text-lg" />
                </div>
                <p className="text-white/55 text-[0.72rem] uppercase tracking-wide font-semibold">
                  Reservas recompensadas
                </p>
              </div>
              <p className="font-sora font-black text-white text-2xl">
                {fmt(stats.bookingsRewarded)}
              </p>
              <p className="text-white/35 text-[0.65rem] mt-0.5">reservas con cashback a huéspedes</p>
            </div>
          </div>
        </div>
      )}

      {/* Historial de acuerdos */}
      {data && data.agreements.length > 1 && (
        <div>
          <h2 className="font-sora font-bold text-white mb-3">Historial de acuerdos</h2>
          <div className="rounded-2xl bg-white/[0.045] border border-white/[0.09] divide-y divide-white/[0.06]">
            {data.agreements.map((ag) => (
              <div key={ag.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-white/85 text-sm">{ag.rewardsLabelDisplay}</p>
                  <p className="text-white/45 text-[0.68rem]">
                    Desde {fmtDateShort(ag.effectiveFrom)}
                    {ag.effectiveUntil ? ` · Hasta ${fmtDateShort(ag.effectiveUntil)}` : ""}
                    {" · "}{ag.cashbackContributionPct} cashback
                  </p>
                </div>
                <span className={`shrink-0 text-[0.65rem] font-semibold px-2.5 py-0.5 rounded-full border ${
                  ag.isActiveToday
                    ? "bg-emerald-500/15 border-emerald-400/25 text-emerald-300"
                    : "bg-white/[0.06] border-white/[0.1] text-white/40"
                }`}>
                  {ag.statusDisplay}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Página principal: detecta rol ───────────────── */
export default function WalletPage() {
  const { me, role } = useAdmin();

  if (role === "operador") {
    if (!me?.operator_id) return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
          <Icon icon="solar:wallet-bold-duotone" className="text-3xl text-yellow-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Operador no asociado</h2>
        <p className="text-white/50 text-sm">No se encontró un operador vinculado a tu cuenta.</p>
      </div>
    );
    return <OperatorRewardsView operatorId={me.operator_id} />;
  }

  return <AgentWalletView />;
}

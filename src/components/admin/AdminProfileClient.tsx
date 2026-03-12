"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useAdmin } from "@/contexts/AdminContext";
import type { AdminRole, AdminLoyalty } from "@/lib/admin-api";

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super admin",
  visualizador: "Visualizador",
  comercial: "Comercial",
  operador: "Operador",
  agente: "Agente",
};

const LOYALTY_LEVEL_LABELS: Record<string, string> = {
  member: "Member",
  plus: "Plus",
  premium: "Premium",
};

/* ─── Primitivos (línea visual del dashboard) ─────────── */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

function AccentCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] p-6 relative overflow-hidden ${className}`}
      style={{
        background: "radial-gradient(ellipse 90% 80% at 60% 55%, #5e2cec 0%, #3d21c4 45%, #2a178a 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 85% 10%, rgba(180,140,255,0.22) 0%, transparent 65%)" }}
      />
      <div className="absolute inset-0 rounded-[28px] border border-white/[0.18] pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function LoyaltyBadge({ level }: { level: string }) {
  const config =
    level === "premium"
      ? { bg: "bg-amber-500/25", border: "border-amber-400/40", icon: "solar:crown-bold-duotone", text: "text-amber-200" }
      : level === "plus"
        ? { bg: "bg-[#5e2cec]/25", border: "border-[#5e2cec]/40", icon: "solar:star-bold-duotone", text: "text-[#b89eff]" }
        : { bg: "bg-white/15", border: "border-white/25", icon: "solar:user-id-bold-duotone", text: "text-white/90" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${config.bg} border ${config.border} px-3 py-1.5`}>
      <Icon icon={config.icon} className={`${config.text} text-sm`} width={14} />
      <span className={`text-[0.75rem] font-semibold uppercase tracking-wider ${config.text}`}>
        {LOYALTY_LEVEL_LABELS[level] ?? level}
      </span>
    </span>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] border border-white/[0.08] px-4 py-3.5">
      <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.12em] font-semibold mb-1">
        {label}
      </p>
      <p className="font-sora font-semibold text-white text-[0.9375rem] leading-tight">
        {value}
      </p>
    </div>
  );
}

interface OperatorRewardsSummary {
  participates: boolean;
  activeAgreement: {
    cashbackContributionPct: string;
    visibilityBoostDisplay: string;
    rewardsLabelDisplay: string;
    effectiveFrom: string;
    effectiveUntil: string | null;
    termsNotes: string;
    signedByNewayzi: string;
    autoRenew: boolean;
  } | null;
  stats: { poolContributions: number; cashbackEmitted: number; bookingsRewarded: number };
  programBenefits: { icon: string; title: string; description: string }[];
}

function useOperatorRewards(operatorId: number | null) {
  const [data, setData] = useState<OperatorRewardsSummary | null>(null);
  const load = useCallback(async () => {
    if (!operatorId) return;
    try {
      const API_BASE =
        typeof window !== "undefined"
          ? window.location.origin.includes("portal.newayzi.com")
            ? "https://api.newayzi.com"
            : window.location.origin.includes("portal.staging")
            ? "https://api.staging.newayzi.com"
            : "http://localhost:8000"
          : "";
      const res = await fetch(`${API_BASE}/api/operator/rewards-agreement/`, {
        credentials: "include",
      });
      if (res.ok) setData(await res.json());
    } catch {
      // silencioso
    }
  }, [operatorId]);
  useEffect(() => { load(); }, [load]);
  return data;
}

export function AdminProfileClient() {
  const { me, role } = useAdmin();

  if (!me) return null;

  const { profile, operator_name, loyalty, operator_id } = me;
  const displayName = profile.full_name || `${profile.first_name} ${profile.last_name}`.trim() || profile.email;
  const operatorRewards = useOperatorRewards(role === "operador" ? (operator_id ?? null) : null);

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* ── Header island (avatar + nombre + rol) ── */}
      <GlassCard className="flex flex-col sm:flex-row sm:items-center gap-6 py-6">
        <div className="flex items-center gap-5">
          {profile.image_url ? (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/[0.12]">
              <img
                src={profile.image_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#5e2cec]/25 border border-[#5e2cec]/30">
              <Icon icon="solar:user-id-bold-duotone" className="text-[#9b74ff]" width={40} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-sora text-2xl font-black text-white leading-tight tracking-tight">
              {displayName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#5e2cec]/20 border border-[#5e2cec]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9b74ff]" />
                <span className="text-[#b89eff] text-[0.65rem] font-semibold uppercase tracking-wider">
                  {ROLE_LABELS[role ?? "super_admin"]}
                </span>
              </span>
              {loyalty && <LoyaltyBadge level={loyalty.level} />}
            </div>
            <p className="mt-2 text-sm text-white/50">{profile.email}</p>
            {profile.phone && (
              <p className="text-sm text-white/50">{profile.phone}</p>
            )}
            {role === "operador" && operator_name && (
              <p className="mt-2 text-[0.8125rem] text-white/60">
                Operador: <span className="font-medium text-white/80">{operator_name}</span>
              </p>
            )}
            {role === "agente" && (
              <p className="mt-2 text-[0.8125rem] text-white/50">
                Cuenta de agencia. Acceso a dashboard y disponibilidad.
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── Información personal ── */}
      <GlassCard>
        <div className="flex items-start justify-between gap-4 mb-5 min-w-0">
          <div>
            <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Información personal</p>
            <p className="font-sora font-bold text-white text-base leading-tight mt-1">
              Datos de tu cuenta
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
            <Icon icon="solar:user-circle-bold-duotone" className="text-[#9b74ff] text-base" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Nombre completo", value: displayName },
            { label: "Correo", value: profile.email },
            ...(profile.phone ? [{ label: "Teléfono", value: profile.phone }] : []),
            { label: "Rol en el admin", value: ROLE_LABELS[role ?? "super_admin"] },
            ...(profile.created
              ? [
                  {
                    label: "Miembro desde",
                    value: new Date(profile.created).toLocaleDateString("es", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  },
                ]
              : []),
          ].map((item) => (
            <InfoField key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </GlassCard>

      {/* ── Newayzi Rewards ── */}
      {loyalty ? (
        <AccentCard>
          <div className="flex items-start justify-between gap-4 mb-5 min-w-0">
            <div>
              <p className="text-white/50 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Newayzi Rewards</p>
              <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
                Nivel {loyalty.level}
              </p>
            </div>
            <LoyaltyBadge level={loyalty.level} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[
              { label: "Puntos", value: Math.round(loyalty.points), icon: "solar:stars-bold-duotone" },
              { label: "Reservas", value: loyalty.completedBookings, icon: "solar:calendar-bold-duotone" },
              { label: "Mensuales", value: loyalty.monthlyBookings, icon: "solar:calendar-bold-duotone" },
              { label: "Total gastado", value: `$${loyalty.totalSpent.toLocaleString()}`, icon: "solar:wallet-money-bold-duotone" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/[0.10] border border-white/[0.15] px-4 py-4"
              >
                <Icon icon={item.icon} className="text-yellow-300/90 text-lg mb-1.5" />
                <p className="text-white/55 text-[0.62rem] uppercase tracking-wide">{item.label}</p>
                <p className="font-sora font-black text-white text-xl sm:text-2xl leading-none mt-1">
                  {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                </p>
              </div>
            ))}
          </div>

          {loyalty.progressToNextLevel && loyalty.progressToNextLevel.required > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-white/65 text-[0.75rem]">Progreso al siguiente nivel</p>
                <p className="text-white/65 text-[0.75rem]">
                  {loyalty.progressToNextLevel.current} / {loyalty.progressToNextLevel.required}{" "}
                  <span className="text-white/40">{loyalty.progressToNextLevel.type}</span>
                </p>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-white/10">
                <div
                  className="h-full rounded-full bg-[#9b74ff] transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      (loyalty.progressToNextLevel.current / loyalty.progressToNextLevel.required) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </AccentCard>
      ) : (
        <GlassCard className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 flex items-center justify-center mb-4">
            <Icon icon="solar:gift-bold-duotone" className="text-[#9b74ff] text-2xl" />
          </div>
          <p className="font-sora font-bold text-white text-base">Sin programa de loyalty</p>
          <p className="mt-2 text-sm text-white/50 max-w-md leading-relaxed">
            Este perfil no tiene datos de Newayzi Rewards. Los perfiles de staff pueden no tener loyalty si no han realizado reservas como huéspedes.
          </p>
        </GlassCard>
      )}

      {/* ── Acuerdo Rewards del operador ── */}
      {role === "operador" && (
        <GlassCard>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Programa Newayzi Rewards</p>
              <p className="font-sora font-bold text-white text-base leading-tight mt-1">
                Tu acuerdo de participación
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <Icon icon="solar:gift-bold-duotone" className="text-purple-300 text-base" />
            </div>
          </div>

          {!operatorRewards && (
            <div className="flex justify-center py-6">
              <Icon icon="solar:loading-line-duotone" className="text-white/30 text-2xl animate-spin" />
            </div>
          )}

          {operatorRewards && !operatorRewards.participates && (
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-5 py-6 text-center">
              <Icon icon="solar:hand-shake-bold-duotone" className="text-white/30 text-3xl mb-3" />
              <p className="text-white/60 text-sm font-medium">Tu hotel aún no tiene un acuerdo Rewards activo.</p>
              <p className="text-white/35 text-xs mt-1">Contacta al equipo comercial de Newayzi para conocer los beneficios del programa.</p>
            </div>
          )}

          {operatorRewards?.participates && operatorRewards.activeAgreement && (
            <div className="space-y-4">
              {/* Condiciones principales */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/[0.07] border border-white/[0.10] px-4 py-4 text-center">
                  <p className="text-2xl font-black text-purple-300">{operatorRewards.activeAgreement.cashbackContributionPct}</p>
                  <p className="text-[10px] text-white/40 font-medium mt-1">Aporte al cashback</p>
                </div>
                <div className="rounded-2xl bg-white/[0.07] border border-white/[0.10] px-4 py-4 text-center">
                  <p className="text-sm font-bold text-white/80">{operatorRewards.activeAgreement.visibilityBoostDisplay}</p>
                  <p className="text-[10px] text-white/40 font-medium mt-1">Boost de visibilidad</p>
                </div>
                <div className="rounded-2xl bg-white/[0.07] border border-white/[0.10] px-4 py-4 text-center">
                  <p className="text-sm font-bold text-purple-300">{operatorRewards.activeAgreement.rewardsLabelDisplay}</p>
                  <p className="text-[10px] text-white/40 font-medium mt-1">Tu etiqueta</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Aportado al pool", value: `$${Math.round(operatorRewards.stats.poolContributions).toLocaleString("es-CO")}` },
                  { label: "Cashback generado", value: `$${Math.round(operatorRewards.stats.cashbackEmitted).toLocaleString("es-CO")}` },
                  { label: "Reservas premiadas", value: String(operatorRewards.stats.bookingsRewarded) },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-3 text-center">
                    <p className="text-base font-black text-white/90">{s.value}</p>
                    <p className="text-[10px] text-white/35 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Vigencia */}
              <div className="flex flex-wrap gap-4 text-xs text-white/40 border-t border-white/[0.07] pt-3">
                <span>
                  Vigente desde{" "}
                  <span className="text-white/60 font-semibold">
                    {new Date(operatorRewards.activeAgreement.effectiveFrom).toLocaleDateString("es-CO")}
                  </span>
                </span>
                {operatorRewards.activeAgreement.effectiveUntil ? (
                  <span>
                    hasta{" "}
                    <span className="text-white/60 font-semibold">
                      {new Date(operatorRewards.activeAgreement.effectiveUntil).toLocaleDateString("es-CO")}
                    </span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold">Sin fecha de vencimiento</span>
                )}
                {operatorRewards.activeAgreement.autoRenew && (
                  <span className="text-blue-400 font-semibold">Auto-renovación activa</span>
                )}
                {operatorRewards.activeAgreement.signedByNewayzi && (
                  <span>Firmado por Newayzi: <span className="text-white/60">{operatorRewards.activeAgreement.signedByNewayzi}</span></span>
                )}
              </div>

              {/* Beneficios del programa */}
              {operatorRewards.programBenefits.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Beneficios activos</p>
                  <div className="space-y-2">
                    {operatorRewards.programBenefits.map((b, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                        <i className={`icon-[${b.icon}] text-purple-400 text-lg shrink-0 mt-0.5`} />
                        <div>
                          <p className="text-sm font-semibold text-white/80">{b.title}</p>
                          <p className="text-xs text-white/40 mt-0.5">{b.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {operatorRewards.activeAgreement.termsNotes && (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-3 text-xs text-white/45">
                  <span className="font-semibold text-white/60">Condiciones pactadas: </span>
                  {operatorRewards.activeAgreement.termsNotes}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

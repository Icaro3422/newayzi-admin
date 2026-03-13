"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Input, Button, addToast } from "@heroui/react";
import { useAdmin } from "@/contexts/AdminContext";
import { rewardsAgreementsApi } from "@/lib/admin-api";
import { resolveClerkError } from "@/lib/clerk-errors";
import type { AdminRole, AdminLoyalty, OperatorRewardsData } from "@/lib/admin-api";

const inputDark = "rounded-xl border border-white/[0.12] bg-white/[0.04]";
const MAX_IMAGE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

function useOperatorRewards(operatorId: number | null) {
  const [data, setData] = useState<OperatorRewardsData | null>(null);
  const load = useCallback(async () => {
    if (!operatorId) return;
    try {
      const res = await rewardsAgreementsApi.getForOperator(operatorId);
      setData(res);
    } catch {
      // silencioso
    }
  }, [operatorId]);
  useEffect(() => { load(); }, [load]);
  return data;
}

export function AdminProfileClient() {
  const { me, role, refetchMe } = useAdmin();
  const { user, isLoaded: clerkLoaded } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!me) return null;

  const { profile, operator_name, loyalty, operator_id } = me;
  const isOperator = (role?.toLowerCase?.() ?? "") === "operador";
  const operatorRewards = useOperatorRewards(isOperator ? (operator_id ?? null) : null);

  // Sincronizar nombre desde Clerk o me
  useEffect(() => {
    const fn = user?.firstName ?? profile.first_name ?? "";
    const ln = user?.lastName ?? profile.last_name ?? "";
    setFirstName(fn);
    setLastName(ln);
  }, [user?.firstName, user?.lastName, profile.first_name, profile.last_name]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) {
      addToast({
        title: "Sesión en carga",
        description: "Espera un momento e intenta de nuevo. Si el problema persiste, cierra sesión y vuelve a entrar.",
        color: "warning",
      });
      return;
    }
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn) {
      addToast({
        title: "Campo requerido",
        description: "El nombre es obligatorio.",
        color: "warning",
      });
      return;
    }
    setSaving(true);
    setSuccess(false);
    try {
      await user.update({
        firstName: fn.slice(0, 255),
        lastName: ln.slice(0, 255),
      });
      await refetchMe();
      setSuccess(true);
      addToast({
        title: "Perfil actualizado",
        description: "Tus datos se guardaron correctamente.",
        color: "success",
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      addToast({
        title: "Error al guardar",
        description: resolveClerkError(e),
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  }, [user, firstName, lastName, refetchMe]);

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) {
        if (!user) {
          addToast({
            title: "Sesión en carga",
            description: "Espera un momento e intenta de nuevo.",
            color: "warning",
          });
        }
        return;
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        addToast({
          title: "Formato no permitido",
          description: "Usa una imagen JPG, PNG, WebP o GIF.",
          color: "warning",
        });
        e.target.value = "";
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        addToast({
          title: "Imagen demasiado grande",
          description: `La imagen debe pesar menos de ${MAX_IMAGE_SIZE_MB} MB.`,
          color: "warning",
        });
        e.target.value = "";
        return;
      }

      setUploading(true);
      try {
        await user.setProfileImage({ file });
        await refetchMe();
        addToast({
          title: "Foto actualizada",
          description: "Tu foto de perfil se actualizó correctamente.",
          color: "success",
        });
      } catch (err) {
        addToast({
          title: "Error al subir foto",
          description: resolveClerkError(err),
          color: "danger",
        });
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [user, refetchMe]
  );

  const imageUrl = user?.imageUrl ?? profile.image_url ?? null;

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* ── Tarjeta única: Perfil editable + datos de cuenta ── */}
      <GlassCard>
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
          {/* Columna izquierda: avatar + edición */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-6 shrink-0">
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !user}
                className="relative group rounded-2xl overflow-hidden border border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-[#9b74ff]/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {imageUrl ? (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0">
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-[#5e2cec]/25 border border-[#5e2cec]/30">
                    <Icon icon="solar:user-id-bold-duotone" className="text-[#9b74ff]" width={36} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Icon icon="solar:spinner-bold-duotone" className="text-white text-xl animate-spin" />
                  ) : (
                    <Icon icon="solar:camera-bold-duotone" className="text-white text-xl" />
                  )}
                </div>
              </button>
              <span className="text-[0.65rem] text-white/40">Clic para cambiar</span>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-sora text-xl sm:text-2xl font-black text-white leading-tight mb-3">
                Mi perfil
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <Input
                  label="Nombre"
                  value={firstName}
                  onValueChange={setFirstName}
                  placeholder="Tu nombre"
                  size="sm"
                  classNames={{
                    inputWrapper: inputDark,
                    input: "!text-white/95 placeholder:!text-white/38",
                    label: "!text-white/60",
                  }}
                />
                <Input
                  label="Apellido"
                  value={lastName}
                  onValueChange={setLastName}
                  placeholder="Tu apellido"
                  size="sm"
                  classNames={{
                    inputWrapper: inputDark,
                    input: "!text-white/95 placeholder:!text-white/38",
                    label: "!text-white/60",
                  }}
                />
              </div>
              {!clerkLoaded && (
                <p className="text-white/50 text-xs flex items-center gap-2 mb-3">
                  <Icon icon="solar:loading-line-duotone" className="animate-spin" />
                  Cargando sesión…
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="btn-newayzi-primary"
                  onPress={handleSaveProfile}
                  isLoading={saving}
                  isDisabled={!firstName.trim() || !user}
                  startContent={!saving && <Icon icon="solar:check-circle-bold-duotone" width={16} />}
                >
                  {success ? "Guardado" : "Guardar"}
                </Button>
                {success && (
                  <span className="text-emerald-400 text-[0.75rem] font-medium flex items-center gap-1">
                    <Icon icon="solar:check-circle-bold-duotone" width={14} />
                    Guardado
                  </span>
                )}
                <Link
                  href="/admin/account"
                  className="text-[0.75rem] font-medium text-[#9b74ff] hover:text-[#b89eff] transition-colors flex items-center gap-1.5 ml-2"
                >
                  <Icon icon="solar:settings-bold-duotone" width={14} />
                  Correo y contraseña
                </Link>
              </div>
            </div>
          </div>

          {/* Columna derecha: datos de cuenta (compactos) */}
          <div className="lg:border-l lg:border-white/[0.08] lg:pl-8 lg:min-w-[200px]">
            <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.12em] font-semibold mb-3">Datos de cuenta</p>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-white/45 text-[0.7rem] uppercase tracking-wide">Correo</dt>
                <dd className="text-white/90 font-medium mt-0.5">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-white/45 text-[0.7rem] uppercase tracking-wide">Rol</dt>
                <dd className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5e2cec]/20 border border-[#5e2cec]/30">
                    <span className="w-1 h-1 rounded-full bg-[#9b74ff]" />
                    <span className="text-[#b89eff] text-[0.7rem] font-semibold uppercase">
                      {ROLE_LABELS[role ?? "super_admin"]}
                    </span>
                  </span>
                  {!isOperator && loyalty && <LoyaltyBadge level={loyalty.level} />}
                </dd>
              </div>
              {isOperator && operator_name && (
                <div>
                  <dt className="text-white/45 text-[0.7rem] uppercase tracking-wide">Operador</dt>
                  <dd className="text-white/80 font-medium mt-0.5">{operator_name}</dd>
                </div>
              )}
              {profile.phone && (
                <div>
                  <dt className="text-white/45 text-[0.7rem] uppercase tracking-wide">Teléfono</dt>
                  <dd className="text-white/90 font-medium mt-0.5">{profile.phone}</dd>
                </div>
              )}
              {profile.created && (
                <div>
                  <dt className="text-white/45 text-[0.7rem] uppercase tracking-wide">Miembro desde</dt>
                  <dd className="text-white/80 mt-0.5">
                    {new Date(profile.created).toLocaleDateString("es", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              )}
              {role === "agente" && (
                <p className="text-white/50 text-xs italic mt-1">Cuenta de agencia. Acceso a dashboard y disponibilidad.</p>
              )}
            </dl>
          </div>
        </div>
      </GlassCard>

      {/* ── OPERADOR: Programa de Socios (rewards de operadores, no de huéspedes) ── */}
      {isOperator && (
        <AccentCard>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-white/50 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Programa de Socios</p>
              <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
                {operatorRewards?.activeAgreement
                  ? operatorRewards.activeAgreement.rewardsLabelDisplay
                  : "Tu participación en Newayzi"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Icon icon="solar:handshake-bold-duotone" className="text-yellow-300 text-base" />
            </div>
          </div>

          {!operatorRewards && (
            <div className="flex justify-center py-8">
              <Icon icon="solar:loading-line-duotone" className="text-white/30 text-2xl animate-spin" />
            </div>
          )}

          {operatorRewards && !operatorRewards.activeAgreement && (
            <div className="rounded-2xl bg-white/[0.08] border border-white/[0.12] px-5 py-6 text-center">
              <Icon icon="solar:hand-shake-bold-duotone" className="text-white/40 text-3xl mb-3" />
              <p className="text-white/70 text-sm font-medium">Aún no tienes un acuerdo de socio activo.</p>
              <p className="text-white/45 text-xs mt-1">Contacta al equipo Newayzi para activar tu nivel y ofrecer cashback a tus huéspedes.</p>
            </div>
          )}

          {operatorRewards?.activeAgreement && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white/[0.10] border border-white/[0.15] px-4 py-4">
                  <Icon icon="solar:wallet-money-bold-duotone" className="text-yellow-300/90 text-lg mb-1.5" />
                  <p className="text-white/55 text-[0.62rem] uppercase tracking-wide">Cashback a huéspedes</p>
                  <p className="font-sora font-black text-white text-xl leading-none mt-1">
                    {operatorRewards.activeAgreement.cashbackContributionPct}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.10] border border-white/[0.15] px-4 py-4">
                  <Icon icon="solar:trending-up-bold-duotone" className="text-yellow-300/90 text-lg mb-1.5" />
                  <p className="text-white/55 text-[0.62rem] uppercase tracking-wide">Visibilidad</p>
                  <p className="font-sora font-bold text-white text-sm leading-tight mt-1">
                    {operatorRewards.activeAgreement.visibilityBoostDisplay}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.10] border border-white/[0.15] px-4 py-4">
                  <Icon icon="solar:wallet-money-bold-duotone" className="text-yellow-300/90 text-lg mb-1.5" />
                  <p className="text-white/55 text-[0.62rem] uppercase tracking-wide">Aportado al pool</p>
                  <p className="font-sora font-black text-white text-2xl leading-none mt-1">
                    ${Math.round(operatorRewards.stats.poolContributions).toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.10] border border-white/[0.15] px-4 py-4">
                  <Icon icon="solar:bookmark-bold-duotone" className="text-yellow-300/90 text-lg mb-1.5" />
                  <p className="text-white/55 text-[0.62rem] uppercase tracking-wide">Reservas premiadas</p>
                  <p className="font-sora font-black text-white text-2xl leading-none mt-1">
                    {operatorRewards.stats.bookingsRewarded}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-white/45">
                <span>
                  Vigente desde{" "}
                  <span className="text-white/70 font-semibold">
                    {new Date(operatorRewards.activeAgreement.effectiveFrom).toLocaleDateString("es-CO")}
                  </span>
                </span>
                {operatorRewards.activeAgreement.effectiveUntil ? (
                  <span>
                    hasta{" "}
                    <span className="text-white/70 font-semibold">
                      {new Date(operatorRewards.activeAgreement.effectiveUntil).toLocaleDateString("es-CO")}
                    </span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold">Sin fecha de vencimiento</span>
                )}
                {operatorRewards.activeAgreement.autoRenew && (
                  <span className="text-blue-400 font-semibold">Auto-renovación activa</span>
                )}
              </div>

              {operatorRewards.activeAgreement.termsNotes && (
                <div className="rounded-xl bg-white/[0.06] border border-white/[0.08] px-4 py-3 text-xs text-white/50">
                  <span className="font-semibold text-white/60">Condiciones: </span>
                  {operatorRewards.activeAgreement.termsNotes}
                </div>
              )}
            </div>
          )}
        </AccentCard>
      )}

      {/* ── No-operadores: Newayzi Rewards (programa de huéspedes) — nunca para operadores ── */}
      {!isOperator && role !== "super_admin" && (loyalty ? (
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
        )
      )}
    </div>
  );
}

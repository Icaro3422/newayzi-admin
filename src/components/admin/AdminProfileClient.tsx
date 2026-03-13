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
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!me) return null;

  const { profile, operator_name, loyalty, operator_id } = me;
  // Preferir datos de Clerk (actualizados al editar) sobre me del backend
  const displayName =
    (user ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() : null) ||
    profile.full_name ||
    `${profile.first_name} ${profile.last_name}`.trim() ||
    profile.email;
  const operatorRewards = useOperatorRewards(role === "operador" ? (operator_id ?? null) : null);

  // Sincronizar nombre desde Clerk o me
  useEffect(() => {
    const fn = user?.firstName ?? profile.first_name ?? "";
    const ln = user?.lastName ?? profile.last_name ?? "";
    setFirstName(fn);
    setLastName(ln);
  }, [user?.firstName, user?.lastName, profile.first_name, profile.last_name]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
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
      if (!file || !user) return;

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
      {/* ── Editar mi perfil (foto + nombre) ── */}
      <GlassCard>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Mi cuenta</p>
            <p className="font-sora font-bold text-white text-base leading-tight mt-1">
              Editar foto y datos personales
            </p>
          </div>
          <Link
            href="/admin/account"
            className="text-[0.75rem] font-semibold text-[#9b74ff] hover:text-[#b89eff] transition-colors flex items-center gap-1.5"
          >
            <Icon icon="solar:settings-bold-duotone" width={16} />
            Correo, contraseña y seguridad
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar con upload */}
          <div className="flex flex-col items-center gap-2 shrink-0">
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
              disabled={uploading}
              className="relative group rounded-2xl overflow-hidden border border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-[#9b74ff]/50"
            >
              {imageUrl ? (
                <div className="h-24 w-24 shrink-0">
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#5e2cec]/25 border border-[#5e2cec]/30">
                  <Icon icon="solar:user-id-bold-duotone" className="text-[#9b74ff]" width={40} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Icon icon="solar:spinner-bold-duotone" className="text-white text-2xl animate-spin" />
                ) : (
                  <Icon icon="solar:camera-bold-duotone" className="text-white text-2xl" />
                )}
              </div>
            </button>
            <span className="text-[0.65rem] text-white/40">Clic para cambiar</span>
          </div>

          {/* Nombre editable */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={firstName}
              onValueChange={setFirstName}
              placeholder="Tu nombre"
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
              }}
            />
            <Input
              label="Apellido"
              value={lastName}
              onValueChange={setLastName}
              placeholder="Tu apellido"
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-white/[0.08]">
          <Button
            size="sm"
            className="btn-newayzi-primary"
            onPress={handleSaveProfile}
            isLoading={saving}
            isDisabled={!firstName.trim()}
            startContent={!saving && <Icon icon="solar:check-circle-bold-duotone" width={18} />}
          >
            {success ? "Guardado" : "Guardar cambios"}
          </Button>
          {success && (
            <span className="text-emerald-400 text-[0.75rem] font-medium flex items-center gap-1">
              <Icon icon="solar:check-circle-bold-duotone" width={14} />
              Cambios guardados
            </span>
          )}
        </div>
      </GlassCard>

      {/* ── Header island (avatar + nombre + rol) ── */}
      <GlassCard className="flex flex-col sm:flex-row sm:items-center gap-6 py-6">
        <div className="flex items-center gap-5">
          {imageUrl ? (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/[0.12]">
              <img src={imageUrl} alt={displayName} className="h-full w-full object-cover" />
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
              {/* Nivel de loyalty solo para no-operadores (agente/comercial/visualizador) */}
              {role !== "operador" && loyalty && <LoyaltyBadge level={loyalty.level} />}
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

      {/* ── OPERADOR: Programa de Socios (rewards de operadores, no de huéspedes) ── */}
      {role === "operador" && (
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

      {/* ── No-operadores: Newayzi Rewards (programa de huéspedes) ── */}
      {role !== "super_admin" && role !== "operador" && (loyalty ? (
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

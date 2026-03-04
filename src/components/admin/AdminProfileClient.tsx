"use client";

import { Card, CardBody } from "@heroui/react";
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

function LoyaltyBadge({ level }: { level: string }) {
  const config =
    level === "premium"
      ? { color: "from-newayzi-dark-orchid to-newayzi-majorelle", icon: "solar:crown-outline" }
      : level === "plus"
        ? { color: "from-newayzi-han-purple to-newayzi-majorelle", icon: "solar:star-outline" }
        : { color: "from-newayzi-han-purple/90 to-newayzi-majorelle/90", icon: "solar:user-id-outline" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${config.color} px-3 py-1 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(94,44,236,0.25)]`}
    >
      <Icon icon={config.icon} width={16} />
      {LOYALTY_LEVEL_LABELS[level] ?? level}
    </span>
  );
}

function LoyaltySection({ loyalty }: { loyalty: AdminLoyalty }) {
  return (
    <Card className="relative overflow-hidden border border-gray-200/60 bg-white/90 backdrop-blur-sm rounded-[28px] shadow-sm hover:shadow-md transition-all duration-300">
      <CardBody className="gap-5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-sora text-lg font-bold text-newayzi-jet">
            Newayzi Rewards
          </h3>
          <LoyaltyBadge level={loyalty.level} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Puntos", value: Math.round(loyalty.points), gradient: "from-newayzi-majorelle/15 to-newayzi-han-purple/10" },
            { label: "Reservas", value: loyalty.completedBookings, gradient: "from-newayzi-majorelle/15 to-newayzi-han-purple/10" },
            { label: "Mensuales", value: loyalty.monthlyBookings, gradient: "from-newayzi-majorelle/15 to-newayzi-han-purple/10" },
            { label: "Total gastado", value: `$${loyalty.totalSpent.toLocaleString()}`, gradient: "from-newayzi-majorelle/15 to-newayzi-han-purple/10" },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl bg-gradient-to-br ${item.gradient} border border-newayzi-majorelle/10 p-4`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {item.label}
              </p>
              <p className="font-sora text-xl font-bold text-newayzi-jet mt-1">
                {typeof item.value === "number" ? item.value : item.value}
              </p>
            </div>
          ))}
        </div>
        {loyalty.progressToNextLevel && loyalty.progressToNextLevel.required > 0 && (
          <div className="border-t border-gray-200/60 pt-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-newayzi-jet">Progreso al siguiente nivel</span>
              <span className="text-gray-500">
                {loyalty.progressToNextLevel.current} / {loyalty.progressToNextLevel.required}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-newayzi-han-purple to-newayzi-majorelle transition-all shadow-sm"
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
      </CardBody>
    </Card>
  );
}

export function AdminProfileClient() {
  const { me, role } = useAdmin();

  if (!me) return null;

  const { profile, operator_name, loyalty } = me;
  const displayName = profile.full_name || `${profile.first_name} ${profile.last_name}`.trim() || profile.email;

  return (
    <div className="space-y-6">
      {/* Header card - estilo frontend */}
      <Card className="relative overflow-hidden border border-gray-200/60 bg-white/90 backdrop-blur-sm rounded-[28px] shadow-sm hover:shadow-md transition-all duration-300">
        <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-center p-6">
          {profile.image_url ? (
            <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-[20px] border-2 border-gray-200/60 shadow-md">
              <img
                src={profile.image_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-newayzi-majorelle/15 to-newayzi-han-purple/10 border border-newayzi-majorelle/20">
              <Icon icon="solar:user-id-outline" className="text-newayzi-majorelle" width={48} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="font-sora text-2xl font-bold text-newayzi-jet">{displayName}</h2>
              <span className="rounded-full bg-gradient-to-r from-newayzi-han-purple to-newayzi-majorelle px-4 py-1 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(94,44,236,0.25)]">
                {ROLE_LABELS[role ?? "super_admin"]}
              </span>
              {loyalty && loyalty.points > 0 && (
                <LoyaltyBadge level={loyalty.level} />
              )}
            </div>
            <p className="text-sm text-gray-600">{profile.email}</p>
            {profile.phone && (
              <p className="text-sm text-gray-600">{profile.phone}</p>
            )}
            {role === "operador" && operator_name && (
              <p className="mt-2 text-sm">
                <span className="text-gray-500">Operador asignado: </span>
                <span className="font-medium text-newayzi-jet">{operator_name}</span>
              </p>
            )}
            {role === "agente" && (
              <p className="mt-2 text-sm text-gray-500">
                Cuenta de agencia. Acceso a dashboard y disponibilidad.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Información personal */}
      <Card className="relative overflow-hidden border border-gray-200/60 bg-white/90 backdrop-blur-sm rounded-[28px] shadow-sm hover:shadow-md transition-all duration-300">
        <CardBody className="gap-5 p-6">
          <h3 className="font-sora text-lg font-bold text-newayzi-jet">
            Información personal
          </h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              { dt: "Nombre completo", dd: displayName },
              { dt: "Correo", dd: profile.email },
              ...(profile.phone ? [{ dt: "Teléfono", dd: profile.phone }] : []),
              { dt: "Rol en el admin", dd: ROLE_LABELS[role ?? "super_admin"] },
              ...(profile.created
                ? [
                    {
                      dt: "Miembro desde",
                      dd: new Date(profile.created).toLocaleDateString("es", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }),
                    },
                  ]
                : []),
            ].map((item) => (
              <div
                key={item.dt}
                className="rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50/30 border border-gray-200/50 p-4"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                  {item.dt}
                </dt>
                <dd className="text-sm font-semibold text-newayzi-jet">{item.dd}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      {/* Loyalty Rewards */}
      {loyalty && <LoyaltySection loyalty={loyalty} />}

      {!loyalty && (
        <Card className="relative overflow-hidden border border-dashed border-gray-300 bg-white/80 backdrop-blur-sm rounded-[28px]">
          <CardBody className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-newayzi-majorelle/10 to-newayzi-han-purple/5 p-5 border border-newayzi-majorelle/10">
              <Icon icon="solar:gift-outline" className="text-newayzi-majorelle" width={40} />
            </div>
            <p className="text-base font-semibold text-newayzi-jet">Sin programa de loyalty</p>
            <p className="mt-2 text-sm text-gray-500 max-w-md">
              Este perfil no tiene datos de Newayzi Rewards. Los perfiles de staff pueden no tener loyalty si no han realizado reservas como huéspedes.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

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
        ? { color: "from-newayzi-purple to-newayzi-majorelle", icon: "solar:star-outline" }
        : { color: "from-newayzi-purple/80 to-newayzi-majorelle/80", icon: "solar:user-id-outline" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${config.color} px-3 py-1 text-sm font-semibold text-white shadow-sm`}
    >
      <Icon icon={config.icon} width={16} />
      {LOYALTY_LEVEL_LABELS[level] ?? level}
    </span>
  );
}

function LoyaltySection({ loyalty }: { loyalty: AdminLoyalty }) {
  return (
    <Card className="border border-semantic-surface-border">
      <CardBody className="gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-sora text-base font-semibold text-newayzi-jet">
            Newayzi Rewards
          </h3>
          <LoyaltyBadge level={loyalty.level} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-newayzi-han-purple/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-semantic-text-muted">
              Puntos
            </p>
            <p className="font-sora text-xl font-semibold text-newayzi-jet">
              {Math.round(loyalty.points)}
            </p>
          </div>
          <div className="rounded-lg bg-newayzi-han-purple/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-semantic-text-muted">
              Reservas
            </p>
            <p className="font-sora text-xl font-semibold text-newayzi-jet">
              {loyalty.completedBookings}
            </p>
          </div>
          <div className="rounded-lg bg-newayzi-han-purple/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-semantic-text-muted">
              Mensuales
            </p>
            <p className="font-sora text-xl font-semibold text-newayzi-jet">
              {loyalty.monthlyBookings}
            </p>
          </div>
          <div className="rounded-lg bg-newayzi-han-purple/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-semantic-text-muted">
              Total gastado
            </p>
            <p className="font-sora text-xl font-semibold text-newayzi-jet">
              ${loyalty.totalSpent.toLocaleString()}
            </p>
          </div>
        </div>
        {loyalty.progressToNextLevel && loyalty.progressToNextLevel.required > 0 && (
          <div className="border-t border-semantic-surface-border pt-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-newayzi-jet">Progreso al siguiente nivel</span>
              <span className="text-semantic-text-muted">
                {loyalty.progressToNextLevel.current} / {loyalty.progressToNextLevel.required}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-newayzi-purple to-newayzi-majorelle transition-all"
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
      {/* Header card */}
      <Card className="border border-semantic-surface-border">
        <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {profile.image_url ? (
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-semantic-surface-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.image_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-newayzi-han-purple/10">
              <Icon icon="solar:user-id-outline" className="text-newayzi-han-purple" width={40} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="font-sora text-xl font-semibold text-newayzi-jet">{displayName}</h2>
              <span className="rounded-full bg-newayzi-han-purple/10 px-3 py-0.5 text-sm font-medium text-newayzi-han-purple">
                {ROLE_LABELS[role ?? "super_admin"]}
              </span>
              {loyalty && loyalty.points > 0 && (
                <LoyaltyBadge level={loyalty.level} />
              )}
            </div>
            <p className="text-sm text-semantic-text-muted">{profile.email}</p>
            {profile.phone && (
              <p className="text-sm text-semantic-text-muted">{profile.phone}</p>
            )}
            {role === "operador" && operator_name && (
              <p className="mt-2 text-sm">
                <span className="text-semantic-text-muted">Operador asignado: </span>
                <span className="font-medium text-newayzi-jet">{operator_name}</span>
              </p>
            )}
            {role === "agente" && (
              <p className="mt-2 text-sm text-semantic-text-muted">
                Cuenta de agencia. Acceso a dashboard y disponibilidad.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Información personal */}
      <Card className="border border-semantic-surface-border">
        <CardBody className="gap-4">
          <h3 className="font-sora text-base font-semibold text-newayzi-jet">
            Información personal
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-semantic-text-muted">
                Nombre completo
              </dt>
              <dd className="text-sm font-medium text-newayzi-jet">{displayName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-semantic-text-muted">
                Correo
              </dt>
              <dd className="text-sm font-medium text-newayzi-jet">{profile.email}</dd>
            </div>
            {profile.phone && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-semantic-text-muted">
                  Teléfono
                </dt>
                <dd className="text-sm font-medium text-newayzi-jet">{profile.phone}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-semantic-text-muted">
                Rol en el admin
              </dt>
              <dd className="text-sm font-medium text-newayzi-jet">
                {ROLE_LABELS[role ?? "super_admin"]}
              </dd>
            </div>
            {profile.created && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-semantic-text-muted">
                  Miembro desde
                </dt>
                <dd className="text-sm font-medium text-newayzi-jet">
                  {new Date(profile.created).toLocaleDateString("es", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
        </CardBody>
      </Card>

      {/* Loyalty Rewards */}
      {loyalty && (
        <LoyaltySection loyalty={loyalty} />
      )}

      {!loyalty && (
        <Card className="border border-dashed border-semantic-surface-border">
          <CardBody className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-xl bg-gray-100 p-4">
              <Icon icon="solar:gift-outline" className="text-semantic-text-muted" width={32} />
            </div>
            <p className="text-sm font-medium text-newayzi-jet">Sin programa de loyalty</p>
            <p className="mt-1 text-xs text-semantic-text-muted">
              Este perfil no tiene datos de Newayzi Rewards. Los perfiles de staff pueden no tener loyalty si no han realizado reservas como huéspedes.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

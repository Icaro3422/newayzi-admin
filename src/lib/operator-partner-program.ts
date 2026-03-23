import type { RewardsLabel } from "./admin-api";

export type PartnerTierKey = "partner" | "premium_partner" | "elite_partner";

export type PartnerTierDef = {
  key: PartnerTierKey;
  rewardsLabel: RewardsLabel;
  name: string;
  shortName: string;
  badge: string;
  /** Iconify icon id (legible a tamaño medio) */
  icon: string;
  accent: string;
  accentBg: string;
  ringInactive: string;
  benefits: string[];
};

/** Orden de escalón en el programa (Partner → Preferred → Elite). */
export const PARTNER_TIERS: PartnerTierDef[] = [
  {
    key: "partner",
    rewardsLabel: "partner",
    name: "Partner",
    shortName: "Partner",
    badge: "Socio base",
    icon: "mdi:handshake",
    accent: "rgba(196, 200, 220, 0.95)",
    accentBg: "rgba(180, 184, 210, 0.14)",
    ringInactive: "rgba(255,255,255,0.14)",
    benefits: [
      "Cashback base para tus huéspedes en cada reserva confirmada",
      "Visibilidad estándar en el catálogo Newayzi",
    ],
  },
  {
    key: "premium_partner",
    rewardsLabel: "preferred",
    name: "Premium Partner",
    shortName: "Premium",
    badge: "Socio preferente",
    icon: "mdi:crown",
    accent: "#c4a8ff",
    accentBg: "rgba(155, 116, 255, 0.18)",
    ringInactive: "rgba(155, 116, 255, 0.25)",
    benefits: [
      "Mayor porcentaje de cashback para huéspedes",
      "Mejor posicionamiento y visibilidad destacada",
    ],
  },
  {
    key: "elite_partner",
    rewardsLabel: "elite",
    name: "Elite Partner",
    shortName: "Elite",
    badge: "Socio estratégico",
    icon: "mdi:star-four-points",
    accent: "#fcd34d",
    accentBg: "rgba(251, 191, 36, 0.16)",
    ringInactive: "rgba(251, 191, 36, 0.28)",
    benefits: [
      "Máximo cashback para huéspedes",
      "Visibilidad premium y acompañamiento del equipo Newayzi",
    ],
  },
];

export function tierKeyFromRewardsLabel(label: RewardsLabel | undefined | null): PartnerTierKey | null {
  if (!label || label === "none") return null;
  const t = PARTNER_TIERS.find((x) => x.rewardsLabel === label);
  return t?.key ?? null;
}

export function tierIndex(key: PartnerTierKey | null): number {
  if (!key) return -1;
  return PARTNER_TIERS.findIndex((t) => t.key === key);
}

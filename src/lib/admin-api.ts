/**
 * Tipos y cliente API para el panel admin.
 * Alineado con el plan: GET /api/admin/me/, properties, connections, operators, etc.
 */

function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (env) {
    const isLocalhostUrl =
      env.includes("localhost") || env.includes("127.0.0.1");

    if (typeof window === "undefined") {
      // Server-side (SSR): usar env tal cual
      return env.replace(/\/$/, "");
    }

    const h = window.location.hostname;
    const isLocalBrowser = h === "localhost" || h === "127.0.0.1";

    if (!isLocalhostUrl || isLocalBrowser) {
      // URL apunta a producción, o estamos en local → usar env
      return env.replace(/\/$/, "");
    }
    // env apunta a localhost pero el browser está en un host real
    // → ignorar env y usar detección por hostname
  }

  // Detección automática por hostname del browser
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "portal.newayzi.com") return "https://api.newayzi.com";
    if (h === "portal.staging.newayzi.com")
      return "https://api.staging.newayzi.com";
    if (h === "localhost" || h === "127.0.0.1") return "http://localhost:8000";
  }
  return "";
}

// Nota: se evalúa una vez en el browser al cargar el módulo.
// En SSR nunca se hacen llamadas a la API (todo está en useEffect/useCallback).
const API_BASE = getApiBase();

export type AdminRole = "super_admin" | "visualizador" | "comercial" | "operador" | "agente";

export interface AdminLoyalty {
  level: string;
  points: number;
  completedBookings: number;
  totalSpent: number;
  monthlyBookings: number;
  progressToNextLevel?: {
    current: number;
    required: number;
    type: string;
  } | null;
}

export interface AdminMe {
  profile: {
    id: number;
    clerk_user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone?: string;
    image_url?: string;
    created?: string | null;
    updated?: string | null;
  };
  role: AdminRole;
  operator_id: number | null;
  operator_name?: string | null;
  permissions: string[];
  loyalty?: AdminLoyalty | null;
  must_change_password?: boolean;
}

export interface PropertyPMSConnection {
  id: number;
  name: string;
  pms_type: string;
}

export interface PropertyRewardsInfo {
  participates: boolean;
  status?: "active" | "legacy";
  label?: string;
  label_display?: string;
  cashback_rate?: number;
  cashback_pct?: number;
  visibility_boost?: number;
  visibility_label?: string;
  min_monthly_bookings?: number | null;
  auto_renew?: boolean;
}

export interface PropertyListItem {
  id: number;
  name: string;
  city_name?: string;
  is_active: boolean;
  is_published: boolean;
  pets_allowed: boolean;
  property_type: string;
  room_types_count?: number;
  operator_name?: string | null;
  pms_connections?: PropertyPMSConnection[];
  rewards_info?: PropertyRewardsInfo | null;
}

export interface PropertyDetail extends PropertyListItem {
  description?: string;
  address?: string;
  phone?: string;
  currency: string;
  amenities: string[] | Record<string, unknown>[];
  room_types: { id: number; name: string; code: string }[];
}

export interface PMSConnectionListItem {
  id: number;
  name: string;
  pms_type: string;
  pms_type_display?: string;
  is_active: boolean;
  operator_id: number | null;
  operator_name?: string;
  last_sync_at: string | null;
  counts?: {
    properties_synced: number;
    properties_pending: number;
    properties_disabled: number;
    room_types_synced: number;
    room_types_pending: number;
    room_types_disabled: number;
  };
}

export interface PMSConnectionType {
  code: string;
  label: string;
}

export interface UnitsSummary {
  properties: {
    synced: UnitItem[];
    pending: UnitItem[];
    disabled: UnitItem[];
    available: UnitItem[];
  };
  room_types: {
    synced: UnitItem[];
    pending: UnitItem[];
    disabled: UnitItem[];
    available: UnitItem[];
  };
  counts: {
    properties_synced: number;
    properties_pending: number;
    properties_disabled: number;
    properties_available: number;
    room_types_synced: number;
    room_types_pending: number;
    room_types_disabled: number;
    room_types_available: number;
  };
}

export interface UnitItem {
  pms_property_id?: string;
  pms_room_id?: string;
  local_property_id?: number | null;
  local_property_name?: string | null;
  local_room_type_id?: number | null;
  local_room_name?: string | null;
  status: string;
  pms_name?: string | null;
}

export interface PMSConnectionDetail extends PMSConnectionListItem {
  config: Record<string, unknown>;
  sync_availability: boolean;
  sync_rates: boolean;
  sync_bookings: boolean;
  sync_interval_minutes: number;
}

export interface SyncedUnit {
  pms_property_id?: string;
  pms_room_id?: string;
  local_property_id: number | null;
  local_room_type_id: number | null;
  local_property_name?: string;
  local_room_name?: string;
  status: string;
}

export interface PendingUnit {
  pms_property_id: string;
  pms_room_id?: string;
  pms_name?: string;
}

export interface Operator {
  id: number;
  name: string;
  is_active: boolean;
  contact_email?: string;
  contact_phone?: string;
  connections_count?: number;
}

export interface AgencyLevelConfig {
  id: number;
  name: string;
  order: number;
  min_total_sales: string;
  commission_pct: string;
}

export interface Agency {
  id: number;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  level_name?: string | null;
  total_sales: string;
  total_commission: string;
  bookings_count: number;
}

export interface AgencyDetail extends Agency {
  summary: {
    total_sales: string;
    total_commission: string;
    bookings_count: number;
    level_id: number | null;
    level_name: string | null;
    updated_at: string | null;
  };
  created: string;
  updated: string;
}

export interface AvailabilityItem {
  id: number;
  property_id: number;
  property_name: string;
  room_type_id: number;
  room_type_name: string;
  date: string;
  available: number;
  source: "internal" | "pms";
  block_reason?: string;
  price_per_night?: string;
  currency?: string;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Region {
  id: number;
  name: string;
  country_code?: string;
  currency?: string;
}

export interface RegionPaymentMethod {
  region_id: number;
  payment_method_id: number;
  is_active: boolean;
  payment_method?: PaymentMethod;
}

export interface AdminUserListItem {
  id: number;
  clerk_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: AdminRole | null;
  operator_id: number | null;
  operator_name?: string;
  loyalty_level?: string;
  loyalty_points?: number;
}

let tokenGetter: (() => Promise<string | null>) | null = null;
export function setAdminApiToken(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

async function authFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE.replace(/\/$/, "")}${path}`;
  const token = tokenGetter ? await tokenGetter() : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res;
}

async function getJson<T>(path: string): Promise<T | null> {
  const res = await authFetch(path);
  if (res.status === 404) return null;
  return res.json() as Promise<T>;
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await authFetch(path, { method: "PATCH", body: JSON.stringify(body) });
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await authFetch(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<T>;
}

export interface RewardPoolMovement {
  id: number;
  kind: "contribution" | "cashback_issued" | "redemption" | "breakage" | "adjustment";
  amount: number;
  notes: string;
  createdAt: string;
  bookingId: number | null;
}

export interface RewardPoolSummary {
  totalContributed: number;
  totalIssued: number;
  totalRedeemed: number;
  totalBreakage: number;
  currentBalance: number;
  liability: number;
  totalUsersWithPoints: number;
  totalPointsInCirculation: number;
  recentMovements: RewardPoolMovement[];
}

export const adminApi = {
  async getMe(): Promise<AdminMe | null> {
    return getJson<AdminMe>("/api/admin/me/");
  },

  async getPoolSummary(): Promise<RewardPoolSummary | null> {
    return getJson<RewardPoolSummary>("/api/admin/loyalty/pool/");
  },

  async clearMustChangePassword(): Promise<void> {
    await patchJson("/api/admin/me/password-changed/", { must_change_password: false });
  },

  async setPassword(newPassword: string): Promise<void> {
    await postJson("/api/admin/me/set-password/", { new_password: newPassword });
  },

  async getProperties(params?: {
    operator_id?: number;
    city?: string;
    is_active?: boolean;
    pms_connection_id?: number;
  }): Promise<{ results: PropertyListItem[] } | null> {
    const q = new URLSearchParams();
    if (params?.operator_id != null) q.set("operator_id", String(params.operator_id));
    if (params?.city) q.set("city", params.city);
    if (params?.is_active != null) q.set("is_active", String(params.is_active));
    if (params?.pms_connection_id != null)
      q.set("pms_connection_id", String(params.pms_connection_id));
    const query = q.toString();
    const path = query ? `/api/admin/properties/?${query}` : "/api/admin/properties/";
    return getJson<{ results: PropertyListItem[] }>(path);
  },

  async getProperty(id: number): Promise<PropertyDetail | null> {
    return getJson<PropertyDetail>(`/api/admin/properties/${id}/`);
  },

  async patchProperty(
    id: number,
    data: Partial<{
      is_active: boolean;
      is_published: boolean;
      pets_allowed: boolean;
      name: string;
      description: string;
      amenities: string[] | Record<string, unknown>[];
    }>
  ): Promise<PropertyDetail> {
    return patchJson<PropertyDetail>(`/api/admin/properties/${id}/`, data);
  },

  async getConnectionTypes(): Promise<{ results: PMSConnectionType[] } | null> {
    return getJson<{ results: PMSConnectionType[] }>("/api/admin/pms/connection-types/");
  },

  async getConnections(): Promise<{ results: PMSConnectionListItem[] } | null> {
    return getJson<{ results: PMSConnectionListItem[] }>("/api/admin/pms/connections/");
  },

  async createConnection(data: {
    name?: string;
    pms_type: string;
    operator_id?: number;
    config?: { base_url?: string; username?: string; password?: string };
  }): Promise<PMSConnectionListItem> {
    return postJson<PMSConnectionListItem>("/api/admin/pms/connections/", data);
  },

  async getUnitsSummary(connectionId: number): Promise<UnitsSummary | null> {
    return getJson<UnitsSummary>(`/api/admin/pms/connections/${connectionId}/units-summary/`);
  },

  async getConnection(id: number): Promise<PMSConnectionDetail | null> {
    return getJson<PMSConnectionDetail>(`/api/admin/pms/connections/${id}/`);
  },

  async patchConnection(
    id: number,
    data: { is_active?: boolean; config?: { base_url?: string; username?: string; password?: string } }
  ): Promise<PMSConnectionDetail> {
    return patchJson<PMSConnectionDetail>(`/api/admin/pms/connections/${id}/`, data);
  },

  async syncConnectionNow(id: number): Promise<{ status: string }> {
    return postJson<{ status: string }>(`/api/admin/pms/connections/${id}/sync-now/`);
  },

  async getSyncedUnits(connectionId: number): Promise<SyncedUnit[] | null> {
    return getJson<SyncedUnit[]>(
      `/api/admin/pms/connections/${connectionId}/synced-units/`
    );
  },

  async getPendingUnits(connectionId: number): Promise<PendingUnit[] | null> {
    return getJson<PendingUnit[]>(
      `/api/admin/pms/connections/${connectionId}/pending-units/`
    );
  },

  async getOperators(): Promise<{ results: Operator[] } | null> {
    return getJson<{ results: Operator[] }>("/api/admin/operators/");
  },

  async getOperator(id: number): Promise<Operator | null> {
    return getJson<Operator>(`/api/admin/operators/${id}/`);
  },

  async createOperator(data: {
    name: string;
    contact_email: string;
    contact_phone?: string;
  }): Promise<Operator & { email_sent?: boolean; invite_status?: "sent" | "user_exists" | "no_resend" | "clerk_error" | "skipped" }> {
    return postJson<Operator>("/api/admin/operators/", data);
  },

  async patchOperator(
    id: number,
    data: Partial<{ name: string; is_active: boolean; contact_email: string; contact_phone: string }>
  ): Promise<Operator> {
    return patchJson<Operator>(`/api/admin/operators/${id}/`, data);
  },

  async getAgencies(): Promise<{ results: Agency[] } | null> {
    return getJson<{ results: Agency[] }>("/api/admin/agencies/");
  },

  async createAgency(data: {
    name: string;
    contact_email: string;
    contact_phone?: string;
  }): Promise<Agency & { email_sent?: boolean }> {
    return postJson<Agency>("/api/admin/agencies/", data);
  },

  async getAgency(id: number): Promise<AgencyDetail | null> {
    return getJson<AgencyDetail>(`/api/admin/agencies/${id}/`);
  },

  async getAgencyLevels(): Promise<AgencyLevelConfig[] | null> {
    return getJson<AgencyLevelConfig[]>("/api/admin/agencies/levels/");
  },

  async getAvailability(params?: {
    property_id?: number;
    operator_id?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<{ results: AvailabilityItem[] } | null> {
    const q = new URLSearchParams();
    if (params?.property_id != null) q.set("property_id", String(params.property_id));
    if (params?.operator_id != null) q.set("operator_id", String(params.operator_id));
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    const query = q.toString();
    return getJson<{ results: AvailabilityItem[] }>(
      `/api/admin/availability/${query ? `?${query}` : ""}`.replace(/\/\?/, "?")
    );
  },

  async getPaymentMethods(): Promise<PaymentMethod[] | null> {
    return getJson<PaymentMethod[]>("/api/admin/payment-methods/");
  },

  async getRegions(): Promise<Region[] | null> {
    return getJson<Region[]>("/api/admin/regions/");
  },

  async getRegionPaymentMethods(regionId: number): Promise<RegionPaymentMethod[] | null> {
    return getJson<RegionPaymentMethod[]>(`/api/admin/regions/${regionId}/payment-methods/`);
  },

  async patchRegionPaymentMethod(
    regionId: number,
    paymentMethodId: number,
    is_active: boolean
  ): Promise<RegionPaymentMethod> {
    return patchJson<RegionPaymentMethod>(
      `/api/admin/regions/${regionId}/payment-methods/`,
      { payment_method_id: paymentMethodId, is_active }
    );
  },

  async getUsers(): Promise<{ results: AdminUserListItem[] } | null> {
    return getJson<{ results: AdminUserListItem[] }>("/api/admin/users/");
  },

  async patchUser(
    id: number,
    data: { role?: AdminRole | null; operator_id?: number | null }
  ): Promise<AdminUserListItem> {
    return patchJson<AdminUserListItem>(`/api/admin/users/${id}/`, data);
  },

  async createUserAdmin(data: {
    email: string;
    first_name: string;
    last_name?: string;
    role: AdminRole;
    operator_id?: number | null;
    password: string;
  }): Promise<AdminUserListItem> {
    return postJson<AdminUserListItem>("/api/admin/users/create/", data);
  },

  async getAuditLogs(params?: { limit?: number }): Promise<{ results: unknown[] } | null> {
    const q = params?.limit != null ? `?limit=${params.limit}` : "";
    return getJson<{ results: unknown[] }>(`/api/admin/audit-logs/${q}`);
  },

  async getCommunicationTemplates(): Promise<{ templates: CommunicationTemplate[] } | null> {
    return getJson<{ templates: CommunicationTemplate[] }>("/api/admin/communications/templates/");
  },

  async getCommunicationGroups(): Promise<{ groups: CommunicationGroup[] } | null> {
    return getJson<{ groups: CommunicationGroup[] }>("/api/admin/communications/groups/");
  },

  async fetchOgMetadata(url: string): Promise<{
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    error?: string;
  }> {
    return postJson("/api/admin/communications/fetch-og/", { url });
  },

  async getCommunicationPreview(data: {
    template_id: string;
    body_text?: string;
    body_html?: string;
    greeting?: string;
    cta_text?: string;
    cta_url?: string;
  }): Promise<{ html: string }> {
    return postJson<{ html: string }>("/api/admin/communications/preview/", data);
  },

  async sendMassCommunication(data: {
    template_id: string;
    group_id?: string;
    custom_emails?: string;
    subject: string;
    body_text?: string;
    body_html?: string;
    greeting?: string;
    cta_text?: string;
    cta_url?: string;
  }): Promise<{ sent: number; failed: number; total: number; errors: string[] }> {
    return postJson<{ sent: number; failed: number; total: number; errors: string[] }>(
      "/api/admin/communications/send/",
      data
    );
  },
};

export interface CommunicationTemplate {
  id: string;
  name: string;
  description: string;
  params: string[];
}

export interface CommunicationGroup {
  id: string;
  name: string;
  description: string;
  recipients_count: number;
}

// ─────────────────────────────────────────────────────────────────────────── //
//  Rewards Agreements
// ─────────────────────────────────────────────────────────────────────────── //

export type AgreementStatus = "draft" | "pending" | "active" | "paused" | "expired" | "cancelled";
export type VisibilityBoost = 0 | 1 | 2 | 3;
export type RewardsLabel = "none" | "partner" | "preferred" | "elite";

export interface RewardsAgreement {
  id: number;
  operatorId: number;
  operatorName: string;
  status: AgreementStatus;
  statusDisplay: string;
  cashbackContributionRate: number;
  cashbackContributionPct: string;
  visibilityBoost: VisibilityBoost;
  visibilityBoostDisplay: string;
  rewardsLabel: RewardsLabel;
  rewardsLabelDisplay: string;
  commissionOffsetPct: number;
  minMonthlyBookings: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  autoRenew: boolean;
  renewalNoticeDays: number;
  termsNotes: string;
  signedByNewayzi: string;
  signedByOperator: string;
  signedAt: string | null;
  createdBy: string;
  internalNotes: string;
  isActiveToday: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorRewardsData {
  operator: { id: number; name: string; email: string };
  activeAgreement: RewardsAgreement | null;
  agreements: RewardsAgreement[];
  stats: {
    poolContributions: number;
    cashbackEmitted: number;
    bookingsRewarded: number;
  };
}

export const rewardsAgreementsApi = {
  async getForOperator(operatorId: number): Promise<OperatorRewardsData> {
    return getJson<OperatorRewardsData>(
      `/api/admin/operators/${operatorId}/rewards-agreements/`
    ) as Promise<OperatorRewardsData>;
  },

  async create(
    operatorId: number,
    data: Partial<RewardsAgreement>
  ): Promise<RewardsAgreement> {
    return postJson<RewardsAgreement>(
      `/api/admin/operators/${operatorId}/rewards-agreements/`,
      data
    );
  },

  async update(
    operatorId: number,
    agreementId: number,
    data: Partial<RewardsAgreement> & { status?: AgreementStatus }
  ): Promise<RewardsAgreement> {
    return patchJson<RewardsAgreement>(
      `/api/admin/operators/${operatorId}/rewards-agreements/${agreementId}/`,
      data
    );
  },
};

/** Metadatos visuales por rol — icono, color, label y descripción */
export const ROLE_META: Record<AdminRole, { label: string; icon: string; color: string; description: string }> = {
  super_admin:  { label: "Super Admin",  icon: "solar:shield-star-bold-duotone",     color: "#fbbf24", description: "Acceso completo a todas las funciones" },
  comercial:    { label: "Comercial",    icon: "solar:hand-money-bold-duotone",      color: "#34d399", description: "Gestión comercial y operadores" },
  visualizador: { label: "Visualizador", icon: "solar:eye-bold-duotone",             color: "#60a5fa", description: "Vista general — solo lectura" },
  operador:     { label: "Operador",     icon: "solar:buildings-2-bold-duotone",     color: "#a78bfa", description: "Gestión de tus propiedades" },
  agente:       { label: "Agente",       icon: "solar:bag-4-bold-duotone",           color: "#fb923c", description: "Disponibilidad y reservas" },
};

/** Permisos de acceso a módulos */
export function canAccessModule(role: AdminRole | null, module: string): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  switch (module) {
    case "profile":
    case "dashboard":
      return true;
    case "properties":
      return ["visualizador", "comercial", "operador"].includes(role);
    case "availability":
      return ["visualizador", "comercial", "operador", "agente"].includes(role);
    case "connections":
      return role === "operador";
    case "operators":
      return role === "comercial"; // comercial ve operadores (solo lectura)
    case "communications":
      return role === "comercial"; // comercial usa comunicaciones
    case "agents":
    case "payments":
    case "users":
    case "audit":
      return false; // solo super_admin (ya retornó arriba)
    default:
      return false;
  }
}

/** Si el módulo es de solo lectura para este rol */
export function isModuleReadOnly(role: AdminRole | null, module: string): boolean {
  if (!role) return true;
  if (role === "super_admin") return false;
  switch (module) {
    case "properties":   return role === "visualizador"; // comercial y operador pueden editar
    case "availability": return role !== "operador" && role !== "comercial";
    case "operators":    return true; // comercial solo ve, no edita
    case "communications": return role !== "comercial";
    default:             return true;
  }
}

/** Si el rol puede crear entidades en el módulo */
export function canCreate(role: AdminRole | null, module: string): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  return false; // solo super_admin puede crear por ahora
}

export function canEditProperty(role: AdminRole): boolean {
  return ["super_admin", "comercial", "operador"].includes(role);
}

export function canEditConnections(role: AdminRole): boolean {
  return role === "super_admin";
}

export function canSyncConnection(role: AdminRole): boolean {
  return ["super_admin", "operador"].includes(role);
}

/** Stats públicas de la plataforma (catalog API). Usado en sign-in. */
export interface PlatformStats {
  total_cities: number;
  total_properties: number;
  total_room_types: number;
  total_countries: number;
}

export async function fetchPlatformStats(): Promise<PlatformStats | null> {
  const base = getApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/catalog/stats/`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      total_cities: Number(data.total_cities) || 0,
      total_properties: Number(data.total_properties) || 0,
      total_room_types: Number(data.total_room_types) || 0,
      total_countries: Number(data.total_countries) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Tipos y cliente API para el panel admin.
 * Alineado con el plan: GET /api/admin/me/, properties, connections, operators, etc.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export type AdminRole = "super_admin" | "visualizador" | "comercial" | "operador" | "agente";

export interface AdminMe {
  profile: {
    id: number;
    clerk_user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  role: AdminRole;
  operator_id: number | null;
  permissions: string[];
}

export interface PropertyPMSConnection {
  id: number;
  name: string;
  pms_type: string;
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

export const adminApi = {
  async getMe(): Promise<AdminMe | null> {
    return getJson<AdminMe>("/api/admin/me/");
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
  }): Promise<PMSConnectionListItem> {
    return postJson<PMSConnectionListItem>("/api/admin/pms/connections/", data);
  },

  async getUnitsSummary(connectionId: number): Promise<UnitsSummary | null> {
    return getJson<UnitsSummary>(`/api/admin/pms/connections/${connectionId}/units-summary/`);
  },

  async getConnection(id: number): Promise<PMSConnectionDetail | null> {
    return getJson<PMSConnectionDetail>(`/api/admin/pms/connections/${id}/`);
  },

  async patchConnection(id: number, data: { is_active?: boolean }): Promise<PMSConnectionDetail> {
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
  }): Promise<Operator & { email_sent?: boolean }> {
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

  async getAuditLogs(params?: { limit?: number }): Promise<{ results: unknown[] } | null> {
    const q = params?.limit != null ? `?limit=${params.limit}` : "";
    return getJson<{ results: unknown[] }>(`/api/admin/audit-logs/${q}`);
  },
};

/** Permisos derivados del rol (plan: super_admin todo, operador solo suyo, agente solo dashboard/availability) */
export function canAccessModule(role: AdminRole | null, module: string): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  switch (module) {
    case "dashboard":
      return true;
    case "properties":
      return ["super_admin", "visualizador", "comercial", "operador"].includes(role);
    case "availability":
      return ["super_admin", "visualizador", "comercial", "operador", "agente"].includes(role);
    case "connections":
      return ["super_admin", "operador"].includes(role);
    case "operators":
    case "agents":
    case "payments":
    case "users":
    case "audit":
      return false; // solo super_admin (ya retornó arriba)
    default:
      return false;
  }
}

export function canEditProperty(role: AdminRole): boolean {
  return ["super_admin", "comercial", "visualizador", "operador"].includes(role);
}

export function canEditConnections(role: AdminRole): boolean {
  return role === "super_admin";
}

export function canSyncConnection(role: AdminRole): boolean {
  return ["super_admin", "operador"].includes(role);
}

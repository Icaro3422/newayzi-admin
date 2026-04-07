/**
 * Tipos y cliente API para el panel admin.
 * Alineado con el plan: GET /api/admin/me/, properties, connections, operators, etc.
 */

function inferApiBaseFromHostname(hostname: string): string {
  const h = hostname.trim().toLowerCase();
  if (!h) return "";
  if (h === "localhost" || h === "127.0.0.1") {
    return "http://localhost:8000";
  }
  if (
    h === "portal.staging.newayzi.com" ||
    h === "admin.staging.newayzi.com" ||
    h.includes("staging")
  ) {
    return "https://api.staging.newayzi.com";
  }
  if (
    h === "portal.newayzi.com" ||
    h === "admin.production.newayzi.com" ||
    h === "newayzi.com" ||
    h.endsWith(".newayzi.com") ||
    h.endsWith(".vercel.app")
  ) {
    return "https://api.production.newayzi.com";
  }
  // Fallback defensivo: si el admin corre en un host no contemplado (p. ej. preview de Vercel)
  // es preferible usar el API productivo a caer en rutas relativas /api/admin/* del propio Next.
  return "https://api.production.newayzi.com";
}

/** Normaliza cualquier URL de API: si viene sin protocolo (ej. "api.production.newayzi.com") añade "https://". */
function normalizeApiUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

/** URL real del backend (sin proxy). SSR y WebSockets siempre usan esto. */
function getDirectApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (env) {
    const normalized = normalizeApiUrl(env);
    const isLocalhostUrl =
      normalized.includes("localhost") || normalized.includes("127.0.0.1");

    if (typeof window === "undefined") {
      return normalized;
    }

    const h = window.location.hostname;
    const isLocalBrowser = h === "localhost" || h === "127.0.0.1";

    if (!isLocalhostUrl || isLocalBrowser) {
      return normalized;
    }
  }

  if (typeof window !== "undefined") {
    return inferApiBaseFromHostname(window.location.hostname);
  }
  return "";
}

/**
 * Base URL para fetch en el navegador.
 *
 * Estrategia:
 * - Dominios *.newayzi.com y newayzi.com → llamada directa al API (CORS configurado en Django).
 * - Otros (preview .vercel.app, localhost etc.) → proxy same-origin /proxy-api si está disponible.
 * - Desactivar proxy forzado: NEXT_PUBLIC_USE_SAME_ORIGIN_API_PROXY=false
 */
function getApiBase(): string {
  const direct = getDirectApiBase();
  if (typeof window === "undefined") {
    return direct;
  }
  if (!direct) {
    return "";
  }

  // Para dominios propios (*.newayzi.com), CORS está configurado en Django → llamar directo.
  // Esto evita dependencia del proxy rewrite de Next.js (frágil en Vercel para URLs externas).
  const hostname = window.location.hostname;
  if (
    hostname === "newayzi.com" ||
    hostname.endsWith(".newayzi.com") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return normalizeApiUrl(direct);
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const proxyDisabled = process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API_PROXY === "false";
  // Sin URL en el bundle no hay rewrite fiable → llamar directo al API.
  if (proxyDisabled || !envUrl) {
    return normalizeApiUrl(direct);
  }
  try {
    const apiOrigin = new URL(normalizeApiUrl(direct)).origin;
    if (window.location.origin === apiOrigin) {
      return normalizeApiUrl(direct);
    }
    // Para origins no-newayzi (ej. preview de Vercel), usar el proxy same-origin.
    return `${window.location.origin}/proxy-api`;
  } catch {
    return normalizeApiUrl(direct);
  }
}

/**
 * Resolver en cada fetch: no usar `const` a nivel de módulo con `getApiBase()`.
 * Si el chunk se evalúa en SSR sin window ni env, quedaba "" y las rutas `/api/admin/*`
 * se pedían al mismo Next (portal) → 404.
 */
function resolvedApiBase(): string {
  return getApiBase();
}

function getWsBase(): string {
  if (typeof window === "undefined") return "";
  const direct = getDirectApiBase();
  if (!direct) return "";
  try {
    const api = new URL(direct.startsWith("http") ? direct : `https://${direct}`);
    api.protocol = api.protocol === "https:" ? "wss:" : "ws:";
    return api.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getWsBaseCandidates(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (v: string) => {
    const key = (v || "").trim().replace(/\/$/, "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  push(getWsBase());
  if (typeof window !== "undefined") {
    try {
      const current = new URL(window.location.origin);
      current.protocol = current.protocol === "https:" ? "wss:" : "ws:";
      push(current.toString());
    } catch {
      // noop
    }
  }
  return out;
}

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

/** Contexto de agencia para rol agente (inventario / invitador). */
export interface AdminAgencyContext {
  id: number;
  name: string;
  invited_by: "operator" | "platform";
  parent_operator: { id: number; name: string } | null;
  scope_mode: "single_operator" | "platform_all" | "platform_scoped";
  scoped_operator_ids: number[];
  scoped_property_ids: number[];
  /** Para filtro de operador en UI cuando el alcance es acotado. */
  scoped_operators_detail?: { id: number; name: string }[];
  inventory_hint: string;
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
  agency?: AdminAgencyContext | null;
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
  /** True si la propiedad tiene al menos una conexión PMS (sincronizada desde PMS). */
  from_pms?: boolean;
  rewards_info?: PropertyRewardsInfo | null;
  /** URL miniatura (primera imagen) para listado admin; opcional en API antigua. */
  primary_picture_url?: string | null;
}

export interface LoyaltyDealItem {
  property_id: number;
  order: number;
  discount_percent: number;
  property_name?: string;
  city_name?: string | null;
}

export interface LoyaltyDealsResponse {
  level: LoyaltyLevelValue;
  results: LoyaltyDealItem[];
}

export interface PropertyPicture {
  id: number;
  url: string;
  is_primary: boolean;
  order_index: number;
  created: string;
}

export interface PropertyFaq {
  question: string;
  answer: string;
}

/** Resultado de búsqueda de ciudad para alta manual de propiedades (admin). */
export interface AdminCitySearchRow {
  id: number;
  name: string;
  country_name: string;
  country_code: string;
  /** Centro aproximado del punto de ciudad en el catálogo (WGS84), si existe */
  center?: { lat: number; lng: number } | null;
}

export interface PropertyDetail extends PropertyListItem {
  description?: string;
  /** Solo cotizar noches cubiertas por el Excel de inventario manual. */
  restrict_pricing_to_manual_weeks?: boolean;
  /** Solo mostrar la propiedad cuando las fechas coincidan exactamente con un PropertyFixedWeekSlot. */
  enforce_fixed_week_slots?: boolean;
  /** Multiplicador del precio "tachado" (original) que ve el huésped. Null = usa markup global. */
  display_price_markup?: string | null;
  /** Multiplicador del precio real cobrado. Null = usa display_price_markup. */
  selling_price_markup?: string | null;
  /** Las habitaciones se muestran solo con capacidad ("Para X personas"), sin nombre ni imagen. */
  simple_room_display?: boolean;
  // Contacto y ubicación
  address?: string;
  phone?: string;
  currency: string;
  timezone?: string;
  location?: { lat: number; lng: number } | null;
  // Horarios
  check_in_from?: string | null;
  check_in_until?: string | null;
  check_out_from?: string | null;
  check_out_until?: string | null;
  // Reglas
  smoking_allowed?: boolean;
  children_allowed?: boolean;
  parties_allowed?: boolean;
  min_age?: number | null;
  // Contenido
  amenities: string[] | Record<string, unknown>[];
  important_info?: string[];
  faqs?: PropertyFaq[];
  room_types: RoomTypeAdminSummary[];
  pictures?: PropertyPicture[];
}

export interface PropertyPricingConfig {
  display_price_markup: string | null;
  selling_price_markup: string | null;
  enforce_fixed_week_slots: boolean;
  restrict_pricing_to_manual_weeks: boolean;
  simple_room_display: boolean;
}

export interface PropertyFixedWeekSlot {
  id: number;
  check_in: string;   // YYYY-MM-DD
  check_out: string;  // YYYY-MM-DD
  nights: number;
  season: number | null;
  note: string;
  created: string;
}

export interface RoomTypeBaseRateRow {
  currency: string;
  price_per_night: string;
}

export interface RoomTypePmsSummary {
  connection_id: number;
  connection_name: string;
  pms_room_type_id: string;
}

export interface RoomTypeAdminSummary {
  id: number;
  name: string;
  code: string;
  description_preview: string;
  max_occupancy: number;
  num_rooms: number | null;
  num_bathrooms: number | null;
  area_sqm: number | null;
  /** Amenidades de habitación (p. ej. importadas desde Booking.com). */
  room_amenities?: string[];
  primary_picture_url: string;
  base_rates: RoomTypeBaseRateRow[];
  physical_rooms_count: number;
  pms: RoomTypePmsSummary | null;
}

export interface RoomTypePicture {
  id: number;
  url: string;
  is_primary: boolean;
  created: string;
}

export interface RoomTypePmsMappingRow {
  connection_id: number;
  connection_name: string;
  pms_room_type_id: string;
}

export interface RoomTypePhysicalRoomRow {
  id: number;
  label: string;
  floor: number | null;
}

export interface ManualInventoryImportRow {
  id: number;
  status: string;
  original_filename: string;
  rows_processed: number;
  rows_failed: number;
  error_summary: Array<Record<string, unknown>>;
  stats: Record<string, unknown>;
  created_at: string | null;
  created_by_label: string;
}

export interface RoomTypeAdminDetail extends Omit<RoomTypeAdminSummary, "description_preview"> {
  description: string;
  property_id: number;
  property_name: string;
  pictures: RoomTypePicture[];
  physical_rooms: RoomTypePhysicalRoomRow[];
  pms_mappings: RoomTypePmsMappingRow[];
  created: string;
  updated: string;
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
  operator_count?: number;
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
  pms_property_name?: string | null;
  pms_room_name?: string | null;
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

export interface ConnectionSyncNowResponse {
  status: "queued" | "ok" | "partial" | "error";
  run_id?: string;
  ws_token?: string;
  estimated_seconds?: number;
  summary?: {
    sync_run_id?: string;
    started_at?: string;
    completed_at?: string;
    duration_seconds?: number;
    synced: number;
    failed: number;
    draft_mappings_created: number;
    auto_created_properties?: number;
    auto_created_room_types?: number;
    properties_synced: number;
    properties_discovered?: number;
    room_types_synced: number;
    room_types_discovered?: number;
    room_type_base_rates_synced: number;
    dynamic_pricing_rules_synced: number;
    property_images_discovered?: number;
    property_images_saved?: number;
    property_images_failed?: number;
    room_type_images_discovered?: number;
    room_type_images_saved?: number;
    room_type_images_failed?: number;
    image_sync_errors?: string[];
    pricing_unavailable?: boolean;
    pricing_unavailable_properties?: string[];
    phase_totals?: Record<string, unknown>;
    errors: string[];
  };
  window?: {
    start_date: string;
    end_date: string;
  };
  detail?: string;
}

export interface ConnectionSyncStreamEvent {
  event:
    | "sync_started"
    | "phase_started"
    | "item_progress"
    | "phase_summary"
    | "sync_skipped"
    | "sync_completed"
    | "sync_finished"
    | "sync_error"
    | "message";
  phase?: "properties" | "room_types" | "availability" | "rates";
  current?: number;
  total?: number;
  status?: string;
  item?: {
    pms_property_id?: string;
    pms_room_type_id?: string;
    date?: string | null;
    name?: string | null;
  };
  error?: string;
  summary?: ConnectionSyncNowResponse["summary"] & {
    properties_failed?: number;
    property_errors?: string[];
    room_types_failed?: number;
    room_type_errors?: string[];
  };
  window?: ConnectionSyncNowResponse["window"];
  detail?: string;
  [key: string]: unknown;
}

export interface PMSSyncRunStatus {
  run_id: string;
  connection_id: number;
  status: "queued" | "running" | "success" | "partial" | "error" | "cancelled";
  requested_by?: string | null;
  window: { start_date: string; end_date: string };
  started_at?: string | null;
  completed_at?: string | null;
  summary?: ConnectionSyncNowResponse["summary"];
  /** Opciones de la corrida (p. ej. skip_properties cuando no hay pendientes). */
  params?: {
    skip_properties?: boolean;
    pricing_only?: boolean;
    only_images?: boolean;
    scope_pms_property_id?: string | null;
    scope_pms_room_type_id?: string | null;
    [key: string]: unknown;
  };
  error?: string;
  last_event_seq: number;
  created_at: string;
  updated_at: string;
  ws_token?: string;
}

export interface PMSSyncRunEventsResponse {
  run_id: string;
  status: PMSSyncRunStatus["status"];
  events: (ConnectionSyncStreamEvent & { seq?: number })[];
  last_seq: number;
}

export interface PMSSyncRunsListResponse {
  results: PMSSyncRunStatus[];
  total?: number;
  limit?: number;
  offset?: number;
}

/** Resumen del último sync completado (propiedades, habitaciones, imágenes). */
export interface LastSyncSummaryResponse {
  run_id: string;
  status: "success" | "partial" | "error";
  completed_at: string | null;
  error: string | null;
  summary: {
    properties_synced?: number;
    room_types_synced?: number;
    property_images_saved?: number;
    room_type_images_saved?: number;
    properties_failed?: number;
    room_types_failed?: number;
    duration_seconds?: number;
    [key: string]: unknown;
  };
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
  /** Solo plataforma; el operador no recibe estos campos en el listado. */
  level_name?: string | null;
  total_sales: string;
  total_commission?: string;
  bookings_count: number;
}

export interface AgencyDetail extends Agency {
  operator_id?: number | null;
  scoped_operator_ids?: number[];
  scoped_property_ids?: number[];
  summary: {
    total_sales: string;
    /** Solo plataforma. */
    total_commission?: string;
    bookings_count: number;
    level_id?: number | null;
    level_name?: string | null;
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
  total_rooms?: number;
  locked?: number;
  source: "internal" | "pms";
  block_reason?: string;
  price_per_night?: string;
  currency?: string;
}

export interface AvailabilityPhysicalRoom {
  id: number;
  label: string;
  floor?: number | null;
  ical_url?: string | null;
  last_sync?: string | null;
  is_available: boolean;
  lock?: {
    block_id: number;
    source: string;
    note: string;
    block_start: string;
    block_end: string;
    status: string;
    external_reference?: string | null;
  } | null;
}

export interface AvailabilityBlockItem {
  id: number;
  room_type_id: number;
  room_type_name: string;
  property_id: number;
  property_name: string;
  start_date: string;
  end_date: string;
  status: "active" | "cancelled" | "released";
  source: "internal" | "external" | "system";
  note: string;
  external_reference?: string | null;
  locks_count?: number;
  rooms_affected?: number;
  created?: string;
}

export interface AvailabilitySlotDetail {
  room_type_id: number;
  room_type_name: string;
  property_id: number;
  property_name: string;
  date: string;
  total: number;
  available: number;
  locked: number;
  physical_rooms: AvailabilityPhysicalRoom[];
  active_blocks: Array<{
    id: number;
    source: string;
    status: string;
    start_date: string;
    end_date: string;
    note: string;
    external_reference?: string | null;
    rooms_affected: number;
  }>;
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

/** Alineado con Clerk `getToken` (p. ej. `{ skipCache: true }` antes de subidas). */
export type AdminTokenGetter = (opts?: { skipCache?: boolean }) => Promise<string | null>;

let tokenGetter: AdminTokenGetter | null = null;
export function setAdminApiToken(getter: AdminTokenGetter) {
  tokenGetter = getter;
}

/** Repite el JWT en un header de respaldo: algunos proxies quitan `Authorization` en POST multipart. */
function applyBearerHeaders(headers: Record<string, string>, token: string | null) {
  if (!token) return;
  const v = `Bearer ${token}`;
  headers.Authorization = v;
  headers["X-Clerk-Authorization"] = v;
}

/** Para `fetch` puntuales que no usan authFetch (mismo criterio que applyBearerHeaders). */
function clerkAuthHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  applyBearerHeaders(h, token);
  return h;
}

/**
 * 404 del API: authFetch la lanza en lugar de devolver un Response con el body ya consumido.
 * Evita "Failed to execute 'json' on 'Response': body stream already read" en postJson/patchJson.
 */
export class AdminApiNotFoundError extends Error {
  readonly status = 404;
  constructor(message: string) {
    super(message);
    this.name = "AdminApiNotFoundError";
  }
}

/** Logs en consola del navegador para diagnosticar fallos de sesión / API (filtrar por "newayzi-admin"). */
function logAdminSessionIssue(
  phase: string,
  detail: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  console.error(`[newayzi-admin] ${phase}`, detail);
}

/**
 * Decodifica el payload de un JWT sin verificar firma para leer el campo `exp`.
 * Devuelve true si el token está expirado o expirará en los próximos `bufferSeconds`.
 */
function isTokenExpiringShortly(token: string | null, bufferSeconds = 30): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() / 1000 + bufferSeconds >= payload.exp;
  } catch {
    return false;
  }
}

/** Getter con skipCache, tipado correctamente para Clerk's getToken. */
async function getFreshToken(): Promise<string | null> {
  if (!tokenGetter) return null;
  return (tokenGetter as (o: { skipCache: boolean }) => Promise<string | null>)({
    skipCache: true,
  }).catch(() => null);
}

async function authFetch(path: string, options: RequestInit = {}) {
  const base = resolvedApiBase().replace(/\/$/, "");
  const url = `${base}${path}`;

  function buildHeaders(tok: string | null): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    applyBearerHeaders(h, tok);
    return h;
  }

  async function execFetch(tok: string | null): Promise<Response> {
    return fetch(url, { ...options, headers: buildHeaders(tok), credentials: "include" });
  }

  // Obtiene el token cacheado y, si está por expirar (< 30s de vida) o ya expiró,
  // fuerza un refresco antes de enviar el request — evita el 401 proactivamente.
  let token = tokenGetter ? await tokenGetter() : null;
  if (isTokenExpiringShortly(token)) {
    const refreshed = await getFreshToken();
    if (refreshed) token = refreshed;
  }

  let res: Response;
  try {
    res = await execFetch(token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logAdminSessionIssue("fetch de API falló (red/CORS/bloqueo)", {
      path,
      apiBase: base || "(vacío)",
      message: msg,
    });
    if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
      throw new Error(
        "No se pudo contactar la API (red, CORS o bloqueo del navegador). Revisa la consola [newayzi-admin] y la pestaña Red."
      );
    }
    throw e instanceof Error ? e : new Error(msg);
  }

  // Segunda línea de defensa: si el backend devuelve 401 (p.ej. skew de reloj
  // o el token expiró exactamente entre el chequeo y la llegada al servidor),
  // forzar un refresco y reintentar UNA sola vez antes de redirigir al login.
  if (res.status === 401 && tokenGetter) {
    const freshToken = await getFreshToken();
    if (freshToken) {
      const retried = await execFetch(freshToken).catch(() => null);
      if (retried && retried.status !== 401) {
        res = retried;
      }
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let parsedDetail: string | undefined;
    try {
      const j = JSON.parse(text) as { detail?: unknown };
      if (typeof j.detail === "string") parsedDetail = j.detail;
      else if (Array.isArray(j.detail)) parsedDetail = JSON.stringify(j.detail);
    } catch {
      /* cuerpo no JSON */
    }
    if (res.status === 401) {
      logAdminSessionIssue("401 en API admin (tras reintento con token fresco)", {
        path,
        apiBase: base || "(vacío)",
        detail: parsedDetail ?? text.slice(0, 400),
      });
      // Sesión realmente expirada o inválida: redirigir al login
      if (typeof window !== "undefined") {
        window.location.href = "/sign-in?reason=session_expired";
      }
      throw new Error(
        parsedDetail ?? "Sesión expirada o token inválido. Redirigiendo al inicio de sesión…"
      );
    }
    if (res.status === 403) {
      logAdminSessionIssue("403 en API admin", {
        path,
        detail: parsedDetail ?? text.slice(0, 400),
      });
      throw new Error(parsedDetail ?? "No tienes permisos para realizar esta acción.");
    }
    if (res.status === 404) {
      logAdminSessionIssue("404 en API admin (ruta o recurso inexistente)", {
        path,
        apiBase: base || "(vacío)",
        detail: parsedDetail ?? text.slice(0, 400),
      });
      throw new AdminApiNotFoundError(
        parsedDetail ??
          "Recurso no encontrado (404). Comprueba la URL del API y que el backend desplegado incluya la ruta solicitada."
      );
    }
    logAdminSessionIssue(`HTTP ${res.status} en API admin`, {
      path,
      apiBase: base || "(vacío)",
      bodyPreview: text.slice(0, 600),
    });
    throw new Error(
      parsedDetail ?? `API ${res.status}: ${text || res.statusText}`
    );
  }
  return res;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await authFetch(path);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof AdminApiNotFoundError) {
      return null;
    }
    throw e;
  }
}

/**
 * Base URL para POST multipart (Excel, etc.).
 *
 * En producción, el fetch directo a `api.*.newayzi.com` puede fallar con "Failed to fetch"
 * por CORS opacos, WAF o límites en el borde, aunque JSON vaya bien. El mismo origen
 * `/proxy-api` (rewrite en next.config → upstream) evita CORS y suele ser más fiable.
 *
 * Localhost sigue yendo directo al API para desarrollo sin depender del rewrite.
 */
function getMultipartApiBase(): string {
  const direct = getDirectApiBase().replace(/\/$/, "");
  if (typeof window === "undefined") {
    return direct;
  }
  if (!direct) {
    return "";
  }

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return direct;
  }

  const proxyDisabled = process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API_PROXY === "false";
  if (proxyDisabled) {
    return direct;
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!envUrl) {
    return direct;
  }

  try {
    const apiOrigin = new URL(normalizeApiUrl(direct)).origin;
    if (window.location.origin === apiOrigin) {
      return direct;
    }
    return `${window.location.origin}/proxy-api`.replace(/\/$/, "");
  } catch {
    return direct;
  }
}

function getMultipartUrl(path: string): string {
  const base = getMultipartApiBase().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function authFetchMultipart(path: string, method: string, body: FormData) {
  const url = getMultipartUrl(path);
  const token = tokenGetter ? await tokenGetter({ skipCache: true }) : null;
  const headers: Record<string, string> = {};
  applyBearerHeaders(headers, token);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      body,
      headers,
      credentials: "include",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
      throw new Error(
        "No se pudo contactar la API (red, CORS o bloqueo del navegador). Abre Herramientas de desarrollador → Red y revisa el POST."
      );
    }
    throw e;
  }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/sign-in?reason=session_expired";
    }
    const text = await res.text();
    let detail = text;
    try {
      detail = JSON.parse(text).detail ?? text;
    } catch {
      /* keep raw text */
    }
    throw new Error(detail || `Error ${res.status}`);
  }
  return res;
}

/**
 * POST multipart a S3 con la URL devuelta por presign.
 * Sin CORS en el bucket, el navegador puede rechazar con "Failed to fetch" aunque S3 haya aceptado el objeto (204).
 */
async function uploadToS3PresignedPost(uploadUrl: string, formData: FormData): Promise<void> {
  try {
    const s3Res = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
    if (!s3Res.ok && s3Res.status !== 204) {
      const txt = await s3Res.text().catch(() => "");
      throw new Error(`S3 respondió ${s3Res.status}: ${txt || s3Res.statusText}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("S3 respondió")) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    const looksLikeCorsOrOpaqueNetwork =
      msg === "Failed to fetch" ||
      msg.includes("Failed to fetch") ||
      msg.includes("Load failed") ||
      msg.includes("NetworkError");
    if (looksLikeCorsOrOpaqueNetwork) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn(
          "[newayzi-admin] POST a S3: respuesta no legible por CORS; si en Red ves 204, se asume éxito y se llama a confirm."
        );
      }
      return;
    }
    throw e;
  }
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await authFetch(path, { method: "PATCH", body: JSON.stringify(body) });
  return res.json() as Promise<T>;
}

async function deleteVoid(path: string): Promise<void> {
  const res = await authFetch(path, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await authFetch(path, { method: "PUT", body: JSON.stringify(body) });
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await authFetch(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<T>;
}

async function streamSSE(
  path: string,
  onEvent?: (event: ConnectionSyncStreamEvent) => void,
  signal?: AbortSignal
): Promise<ConnectionSyncNowResponse> {
  const url = `${resolvedApiBase().replace(/\/$/, "")}${path}`;
  const token = tokenGetter ? await tokenGetter() : null;
  const headers: Record<string, string> = { Accept: "text/event-stream, application/json" };
  applyBearerHeaders(headers, token);

  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/sign-in?reason=session_expired";
      }
      throw new Error("Sesión expirada. Redirigiendo al inicio de sesión...");
    }
    if (res.status === 403) {
      throw new Error("No tienes permisos para realizar esta acción.");
    }
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  if (!res.body) {
    throw new Error("El servidor no devolvió stream de sincronización.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ConnectionSyncNowResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const separatorIdx = buffer.indexOf("\n\n");
      if (separatorIdx === -1) break;
      const rawEvent = buffer.slice(0, separatorIdx);
      buffer = buffer.slice(separatorIdx + 2);

      const lines = rawEvent.split("\n");
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim() || "message";
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length === 0) continue;
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
      } catch {
        payload = { detail: dataLines.join("\n") };
      }

      const event = {
        event: (payload.event as ConnectionSyncStreamEvent["event"]) ?? (eventName as ConnectionSyncStreamEvent["event"]),
        ...payload,
      } as ConnectionSyncStreamEvent;
      onEvent?.(event);

      if (event.event === "sync_completed") {
        finalResult = {
          status: (event.status as ConnectionSyncNowResponse["status"]) ?? "ok",
          summary: event.summary as ConnectionSyncNowResponse["summary"],
          window: event.window as ConnectionSyncNowResponse["window"],
        };
      }
      if (event.event === "sync_error") {
        throw new Error(event.detail || "No se pudo completar la sincronización.");
      }
    }
  }

  if (finalResult) return finalResult;
  throw new Error("El stream de sincronización finalizó sin resultado.");
}

export interface RewardPoolMovement {
  id: number;
  kind:
    | "contribution"
    | "cashback_issued"
    | "redemption"
    | "breakage"
    | "adjustment"
    | "corporate_contribution";
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

/** Detalle de precios (solo super_admin) — GET /api/admin/dashboard-stats/ */
export interface AdminDashboardPriceDetails {
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
  histogram: { label: string; min: number; max: number; count: number }[];
  by_operator: {
    operator_id: number;
    name: string;
    properties_count: number;
    average_price: number;
  }[];
}

export interface AdminDashboardStats {
  average_price_synced: number | null;
  currency: string;
  properties_count: number;
  price_details?: AdminDashboardPriceDetails | null;
}

export const adminApi = {
  async getMe(): Promise<AdminMe | null> {
    return getJson<AdminMe>("/api/admin/me/");
  },

  async getPoolSummary(): Promise<RewardPoolSummary | null> {
    return getJson<RewardPoolSummary>("/api/admin/loyalty/pool/");
  },

  async getAnalyticsDashboard(days: number): Promise<{
    kpis: Record<string, unknown>;
    time_series: { date: string; bookings: number; revenue: number }[];
    top_properties: { property_id: number; name: string; bookings: number; revenue: number }[];
    status_distribution: { status: string; count: number }[];
  } | null> {
    return getJson(`/api/admin/analytics/dashboard/?days=${days}`);
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
    /** Búsqueda parcial por nombre (backend: translations__name__icontains) */
    name?: string;
    is_active?: boolean;
    pms_connection_id?: number;
  }): Promise<{ results: PropertyListItem[] } | null> {
    const q = new URLSearchParams();
    if (params?.operator_id != null) q.set("operator_id", String(params.operator_id));
    if (params?.city) q.set("city", params.city);
    const nameTrim = params?.name?.trim();
    if (nameTrim) q.set("name", nameTrim);
    if (params?.is_active != null) q.set("is_active", String(params.is_active));
    if (params?.pms_connection_id != null)
      q.set("pms_connection_id", String(params.pms_connection_id));
    const query = q.toString();
    const path = query ? `/api/admin/properties/?${query}` : "/api/admin/properties/";
    return getJson<{ results: PropertyListItem[] }>(path);
  },

  async searchAdminCities(q: string): Promise<{ results: AdminCitySearchRow[] } | null> {
    const t = q.trim();
    if (t.length < 2) return { results: [] };
    return getJson<{ results: AdminCitySearchRow[] }>(
      `/api/admin/properties/cities/search/?q=${encodeURIComponent(t)}`
    );
  },

  async createProperty(data: {
    name: string;
    city_id: number;
    timezone?: string;
    currency?: string;
    property_type?: string;
    description?: string;
    operator_id?: number;
    address?: string;
    location?: { lat: number; lng: number } | null;
  }): Promise<PropertyDetail> {
    return postJson<PropertyDetail>("/api/admin/properties/", data);
  },

  async getProperty(id: number): Promise<PropertyDetail | null> {
    return getJson<PropertyDetail>(`/api/admin/properties/${id}/`);
  },

  async getPropertyLoyaltyDeals(level: LoyaltyLevelValue): Promise<LoyaltyDealsResponse | null> {
    return getJson<LoyaltyDealsResponse>(`/api/admin/properties/loyalty-deals/${level}/`);
  },

  async putPropertyLoyaltyDeals(
    level: LoyaltyLevelValue,
    deals: Array<{ property_id: number; order?: number; discount_percent: number }>
  ): Promise<LoyaltyDealsResponse> {
    return putJson<LoyaltyDealsResponse>(`/api/admin/properties/loyalty-deals/${level}/`, { deals });
  },

  async patchProperty(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      is_active: boolean;
      is_published: boolean;
      pets_allowed: boolean;
      smoking_allowed: boolean;
      children_allowed: boolean;
      parties_allowed: boolean;
      min_age: number | null;
      address: string;
      phone: string;
      timezone: string;
      check_in_from: string | null;
      check_in_until: string | null;
      check_out_from: string | null;
      check_out_until: string | null;
      amenities: string[] | Record<string, unknown>[];
      important_info: string[];
      faqs: { question: string; answer: string }[];
      restrict_pricing_to_manual_weeks: boolean;
    }>
  ): Promise<PropertyDetail> {
    return patchJson<PropertyDetail>(`/api/admin/properties/${id}/`, data);
  },

  async deleteProperty(id: number): Promise<void> {
    const res = await authFetch(`/api/admin/properties/${id}/`, { method: "DELETE" });
    if (res.status !== 204) {
      const text = await res.text();
      throw new Error(text || "Error al eliminar propiedad");
    }
  },

  async downloadManualInventoryTemplate(): Promise<Blob> {
    const res = await authFetch("/api/admin/properties/manual-inventory/template/");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Error al descargar plantilla");
    }
    return res.blob();
  },

  async importManualInventory(
    propertyId: number,
    file: File,
    replace = true
  ): Promise<ManualInventoryImportRow> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("replace", replace ? "true" : "false");
    const res = await authFetchMultipart(
      `/api/admin/properties/${propertyId}/manual-inventory/import/`,
      "POST",
      fd
    );
    return res.json() as Promise<ManualInventoryImportRow>;
  },

  async getManualInventoryImports(
    propertyId: number
  ): Promise<{ results: ManualInventoryImportRow[] } | null> {
    return getJson<{ results: ManualInventoryImportRow[] }>(
      `/api/admin/properties/${propertyId}/manual-imports/`
    );
  },

  // ── Pricing config ─────────────────────────────────────────────────────────

  async getPricingConfig(propertyId: number): Promise<PropertyPricingConfig | null> {
    return getJson<PropertyPricingConfig>(`/api/admin/properties/${propertyId}/pricing-config/`);
  },

  async patchPricingConfig(
    propertyId: number,
    data: Partial<PropertyPricingConfig>
  ): Promise<PropertyPricingConfig> {
    const res = await authFetch(`/api/admin/properties/${propertyId}/pricing-config/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return res.json() as Promise<PropertyPricingConfig>;
  },

  // ── Fixed Week Slots ────────────────────────────────────────────────────────

  async getWeekSlots(propertyId: number): Promise<{ results: PropertyFixedWeekSlot[] } | null> {
    return getJson<{ results: PropertyFixedWeekSlot[] }>(`/api/admin/properties/${propertyId}/week-slots/`);
  },

  async createWeekSlot(
    propertyId: number,
    data: { check_in: string; check_out: string; note?: string; season?: number | null }
  ): Promise<PropertyFixedWeekSlot> {
    return postJson<PropertyFixedWeekSlot>(`/api/admin/properties/${propertyId}/week-slots/`, data);
  },

  async patchWeekSlot(
    propertyId: number,
    slotId: number,
    data: { note?: string; season?: number | null }
  ): Promise<PropertyFixedWeekSlot> {
    const res = await authFetch(`/api/admin/properties/${propertyId}/week-slots/${slotId}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return res.json() as Promise<PropertyFixedWeekSlot>;
  },

  async deleteWeekSlot(propertyId: number, slotId: number): Promise<void> {
    await authFetch(`/api/admin/properties/${propertyId}/week-slots/${slotId}/`, { method: "DELETE" });
  },

  async deleteAllWeekSlots(propertyId: number): Promise<{ deleted: number }> {
    const res = await authFetch(`/api/admin/properties/${propertyId}/week-slots/`, { method: "DELETE" });
    return res.json() as Promise<{ deleted: number }>;
  },

  async ensureRoomTypePhysicalRooms(
    propertyId: number,
    roomTypeId: number,
    data: { desired_count: number; label_prefix?: string }
  ): Promise<{ created: number; current_count: number; desired_count: number; message?: string }> {
    return putJson(`/api/admin/properties/${propertyId}/room-types/${roomTypeId}/physical-rooms/`, data);
  },

  async getPropertyPictures(propertyId: number): Promise<PropertyPicture[]> {
    const result = await getJson<PropertyPicture[]>(`/api/admin/properties/${propertyId}/pictures/`);
    return result ?? [];
  },

  /**
   * Sube vía presign→S3→confirm (cuerpos JSON pequeños al API). El POST multipart directo a
   * /pictures/ suele ser bloqueado por WAF/CloudFront del API en producción.
   */
  async uploadPropertyPicture(propertyId: number, file: File, isPrimary = false): Promise<PropertyPicture> {
    return (await adminApi.uploadPropertyPicturesBatch(propertyId, [file], isPrimary))[0];
  },

  /** Hasta 50 imágenes: presign (JSON) → subida a S3 → confirm (JSON). */
  async uploadPropertyPicturesBatch(
    propertyId: number,
    files: File[],
    isPrimary = false
  ): Promise<PropertyPicture[]> {
    const slice = files.slice(0, 50);
    if (slice.length === 0) return [];

    const presignResult = await postJson<{
      presigned: Array<{ index: number; rel_key: string; upload_url: string; fields: Record<string, string> }>;
    }>(`/api/admin/properties/${propertyId}/pictures/presign/`, {
      files: slice.map((f) => ({ filename: f.name, content_type: f.type || "image/jpeg" })),
    });

    const relKeys: string[] = [];
    for (const { index, rel_key, upload_url, fields } of presignResult.presigned) {
      const fd = new FormData();
      for (const [key, value] of Object.entries(fields)) fd.append(key, value);
      fd.append("file", slice[index]);
      try {
        await uploadToS3PresignedPost(upload_url, fd);
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        throw new Error(`Error al subir imagen ${index + 1}: ${m}`);
      }
      relKeys.push(rel_key);
    }

    const confirmed = await postJson<{ pictures?: PropertyPicture[] } | PropertyPicture>(
      `/api/admin/properties/${propertyId}/pictures/confirm/`,
      { rel_keys: relKeys, is_primary: isPrimary }
    );
    if (
      confirmed &&
      typeof confirmed === "object" &&
      "pictures" in confirmed &&
      Array.isArray((confirmed as { pictures: PropertyPicture[] }).pictures)
    ) {
      return (confirmed as { pictures: PropertyPicture[] }).pictures;
    }
    return [confirmed as PropertyPicture];
  },

  async setPropertyPicturePrimary(propertyId: number, picId: number): Promise<PropertyPicture> {
    return patchJson<PropertyPicture>(`/api/admin/properties/${propertyId}/pictures/${picId}/`, { is_primary: true });
  },

  async deletePropertyPicture(propertyId: number, picId: number): Promise<void> {
    await authFetch(`/api/admin/properties/${propertyId}/pictures/${picId}/`, { method: "DELETE" });
  },

  async getRoomTypeAdmin(propertyId: number, roomTypeId: number): Promise<RoomTypeAdminDetail | null> {
    return getJson<RoomTypeAdminDetail>(
      `/api/admin/properties/${propertyId}/room-types/${roomTypeId}/`
    );
  },

  async patchRoomTypeAdmin(
    propertyId: number,
    roomTypeId: number,
    data: Partial<{
      name: string;
      description: string;
      code: string;
      max_occupancy: number;
      num_rooms: number | null;
      num_bathrooms: number | null;
      area_sqm: number | string | null;
      room_amenities: string[];
    }>
  ): Promise<RoomTypeAdminDetail> {
    return patchJson<RoomTypeAdminDetail>(
      `/api/admin/properties/${propertyId}/room-types/${roomTypeId}/`,
      data
    );
  },

  /** Elimina un tipo de habitación (409 si hay reservas u otros registros protegidos). */
  async deleteRoomTypeAdmin(propertyId: number, roomTypeId: number): Promise<void> {
    await deleteVoid(`/api/admin/properties/${propertyId}/room-types/${roomTypeId}/`);
  },

  /** Elimina todos los tipos de habitación de la propiedad (409 si alguno está protegido). */
  async deleteAllRoomTypesForProperty(propertyId: number): Promise<{ deleted: number }> {
    const res = await authFetch(`/api/admin/properties/${propertyId}/room-types/`, { method: "DELETE" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    try {
      return (await res.json()) as { deleted: number };
    } catch {
      return { deleted: 0 };
    }
  },

  async getRoomTypePictures(propertyId: number, roomTypeId: number): Promise<RoomTypePicture[]> {
    const r = await getJson<RoomTypePicture[]>(
      `/api/admin/properties/${propertyId}/room-types/${roomTypeId}/pictures/`
    );
    return r ?? [];
  },

  async uploadRoomTypePicture(
    propertyId: number,
    roomTypeId: number,
    file: File,
    isPrimary = false
  ): Promise<RoomTypePicture> {
    return (await adminApi.uploadRoomTypePicturesBatch(propertyId, roomTypeId, [file], isPrimary))[0];
  },

  /** Hasta 50 imágenes: presign → S3 → confirm (evita multipart bloqueado por WAF del API). */
  async uploadRoomTypePicturesBatch(
    propertyId: number,
    roomTypeId: number,
    files: File[],
    isPrimary = false
  ): Promise<RoomTypePicture[]> {
    const slice = files.slice(0, 50);
    if (slice.length === 0) return [];

    const presignResult = await postJson<{
      presigned: Array<{ index: number; rel_key: string; upload_url: string; fields: Record<string, string> }>;
    }>(
      `/api/admin/properties/${propertyId}/room-types/${roomTypeId}/pictures/presign/`,
      {
        files: slice.map((f) => ({ filename: f.name, content_type: f.type || "image/jpeg" })),
      }
    );

    const relKeys: string[] = [];
    for (const { index, rel_key, upload_url, fields } of presignResult.presigned) {
      const fd = new FormData();
      for (const [key, value] of Object.entries(fields)) fd.append(key, value);
      fd.append("file", slice[index]);
      try {
        await uploadToS3PresignedPost(upload_url, fd);
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        throw new Error(`Error al subir imagen ${index + 1}: ${m}`);
      }
      relKeys.push(rel_key);
    }

    const confirmed = await postJson<{ pictures?: RoomTypePicture[] } | RoomTypePicture>(
      `/api/admin/properties/${propertyId}/room-types/${roomTypeId}/pictures/confirm/`,
      { rel_keys: relKeys, is_primary: isPrimary }
    );
    if (
      confirmed &&
      typeof confirmed === "object" &&
      "pictures" in confirmed &&
      Array.isArray((confirmed as { pictures: RoomTypePicture[] }).pictures)
    ) {
      return (confirmed as { pictures: RoomTypePicture[] }).pictures;
    }
    return [confirmed as RoomTypePicture];
  },

  async setRoomTypePicturePrimary(
    propertyId: number,
    roomTypeId: number,
    picId: number
  ): Promise<RoomTypePicture> {
    return patchJson<RoomTypePicture>(
      `/api/admin/properties/${propertyId}/room-types/${roomTypeId}/pictures/${picId}/`,
      { is_primary: true }
    );
  },

  async deleteRoomTypePicture(propertyId: number, roomTypeId: number, picId: number): Promise<void> {
    await authFetch(
      `/api/admin/properties/${propertyId}/room-types/${roomTypeId}/pictures/${picId}/`,
      { method: "DELETE" }
    );
  },

  async getConnectionTypes(): Promise<{ results: PMSConnectionType[] } | null> {
    return getJson<{ results: PMSConnectionType[] }>("/api/admin/pms/connection-types/");
  },

  async getConnections(): Promise<{ results: PMSConnectionListItem[] } | null> {
    return getJson<{ results: PMSConnectionListItem[] }>("/api/admin/pms/connections/");
  },

  async getDashboardStats(): Promise<AdminDashboardStats | null> {
    return getJson("/api/admin/dashboard-stats/");
  },

  async createConnection(data: {
    name?: string;
    pms_type: string;
    operator_id?: number;
    config?: Record<string, unknown>;
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
    data: { is_active?: boolean; config?: Record<string, unknown> }
  ): Promise<PMSConnectionDetail> {
    return patchJson<PMSConnectionDetail>(`/api/admin/pms/connections/${id}/`, data);
  },

  async testPmsConnection(id: number): Promise<{ ok: boolean; detail?: string }> {
    return postJson<{ ok: boolean; detail?: string }>(`/api/admin/pms/connections/${id}/test/`, {});
  },

  async syncConnectionNow(id: number): Promise<ConnectionSyncNowResponse> {
    return postJson<ConnectionSyncNowResponse>(`/api/admin/pms/connections/${id}/sync-now/`);
  },

  async getActiveSync(connectionId: number): Promise<{ active: boolean; run_id?: string; status?: string }> {
    const data = await getJson<{ active: boolean; run_id?: string; status?: string }>(
      `/api/admin/pms/connections/${connectionId}/active-sync/`
    );
    return data ?? { active: false };
  },

  /** Resumen del último sync completado (404 si no hay ninguno). */
  async getLastSyncSummary(connectionId: number): Promise<LastSyncSummaryResponse | null> {
    return getJson<LastSyncSummaryResponse>(
      `/api/admin/pms/connections/${connectionId}/last-sync-summary/`
    );
  },

  async startSyncRun(
    id: number,
    opts?: {
      cancelPrevious?: boolean;
      skipProperties?: boolean;
      /** Forzar sincronización completa (fase propiedades + redescubrir alojamientos). */
      forceFullSync?: boolean;
      /** Solo tarifas y disponibilidad (sin fase catálogo: propiedades + tipos de habitación). */
      pricingOnly?: boolean;
      onlyImages?: boolean;
      throttleSeconds?: number;
      scopePmsPropertyId?: string | null;
      scopePmsRoomTypeId?: string | null;
    }
  ): Promise<ConnectionSyncNowResponse> {
    const q = new URLSearchParams();
    if (opts?.cancelPrevious) q.set("cancel_previous", "1");
    if (opts?.skipProperties) q.set("skip_properties", "1");
    if (opts?.forceFullSync) q.set("force_full_sync", "1");
    if (opts?.pricingOnly) q.set("pricing_only", "1");
    if (opts?.onlyImages) q.set("only_images", "1");
    if (opts?.throttleSeconds != null && opts.throttleSeconds > 0) {
      q.set("throttle_seconds", String(opts.throttleSeconds));
    }
    if (opts?.scopePmsPropertyId) q.set("scope_pms_property_id", opts.scopePmsPropertyId);
    if (opts?.scopePmsRoomTypeId) q.set("scope_pms_room_type_id", opts.scopePmsRoomTypeId);
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return postJson<ConnectionSyncNowResponse>(`/api/admin/pms/connections/${id}/sync-now/${suffix}`);
  },

  async cancelSyncRun(runId: string): Promise<{ status: string; run_id: string }> {
    return postJson<{ status: string; run_id: string }>(`/api/admin/pms/sync-runs/${runId}/cancel/`);
  },

  async getSyncRuns(
    connectionId: number,
    limit = 10,
    offset = 0
  ): Promise<PMSSyncRunsListResponse> {
    const q = new URLSearchParams();
    q.set("limit", String(Math.max(1, Math.min(100, limit))));
    q.set("offset", String(Math.max(0, offset)));
    const data = await getJson<PMSSyncRunsListResponse>(
      `/api/admin/pms/connections/${connectionId}/sync-runs/?${q.toString()}`
    );
    return data ?? { results: [], total: 0, limit: limit, offset: offset };
  },

  async getSyncRun(runId: string): Promise<PMSSyncRunStatus> {
    const run = await getJson<PMSSyncRunStatus>(`/api/admin/pms/sync-runs/${runId}/`);
    if (!run) throw new Error("No se encontró la corrida de sincronización.");
    return run;
  },

  async getSyncRunEvents(runId: string, afterSeq = 0, limit = 200): Promise<PMSSyncRunEventsResponse> {
    const q = new URLSearchParams();
    q.set("after_seq", String(Math.max(0, afterSeq)));
    q.set("limit", String(Math.max(1, Math.min(1000, limit))));
    const path = `/api/admin/pms/sync-runs/${runId}/events/?${q.toString()}`;
    const data = await getJson<PMSSyncRunEventsResponse>(path);
    if (!data) {
      return { run_id: runId, status: "queued", events: [], last_seq: afterSeq };
    }
    return data;
  },

  connectSyncSocket(
    runId: string,
    wsToken: string,
    opts: {
      lastSeq?: number;
      onMessage?: (evt: ConnectionSyncStreamEvent & { seq?: number; type?: string; run?: PMSSyncRunStatus }) => void;
      onError?: () => void;
      onClose?: (ev: CloseEvent) => void;
      onOpen?: () => void;
    } = {}
  ): { close: () => void } {
    const wsBases = getWsBaseCandidates();
    if (wsBases.length === 0) throw new Error("No fue posible resolver la URL websocket.");
    const lastSeq = Math.max(0, opts.lastSeq ?? 0);
    const wsPaths = [
      `/ws/admin/pms/sync-runs/${runId}/`,
      `/api/ws/admin/pms/sync-runs/${runId}/`,
    ];

    let socket: WebSocket | null = null;
    let userClosed = false;
    let openedOnce = false;
    let targetIdx = 0;
    const targets = wsBases.flatMap((base) => wsPaths.map((path) => ({ base, path })));

    const bindListeners = (current: WebSocket, idx: number) => {
      current.onopen = () => {
        openedOnce = true;
        opts.onOpen?.();
      };
      current.onerror = () => {
        if (!openedOnce && !userClosed && idx + 1 < targets.length) {
          return;
        }
        opts.onError?.();
      };
      current.onclose = (ev) => {
        if (socket === current) socket = null;
        if (!openedOnce && !userClosed && idx + 1 < targets.length) {
          targetIdx = idx + 1;
          openSocket(targetIdx);
          return;
        }
        opts.onClose?.(ev);
      };
      current.onmessage = (raw) => {
        try {
          const data = JSON.parse(String(raw.data ?? "{}")) as ConnectionSyncStreamEvent & {
            seq?: number;
            type?: string;
            run?: PMSSyncRunStatus;
          };
          opts.onMessage?.(data);
        } catch {
          opts.onMessage?.({ event: "message", detail: String(raw.data ?? "") });
        }
      };
    };

    const openSocket = (idx: number) => {
      const target = targets[idx];
      const url = `${target.base}${target.path}?token=${encodeURIComponent(wsToken)}&last_seq=${lastSeq}`;
      const nextSocket = new WebSocket(url);
      socket = nextSocket;
      bindListeners(nextSocket, idx);
    };

    openSocket(targetIdx);
    return {
      close: () => {
        userClosed = true;
        if (!socket) return;
        try {
          socket.close();
        } catch {
          // noop
        }
        socket = null;
      },
    };
  },

  async syncConnectionWithStream(
    id: number,
    onEvent?: (event: ConnectionSyncStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<ConnectionSyncNowResponse> {
    return streamSSE(`/api/admin/pms/connections/${id}/sync-stream/`, onEvent, signal);
  },

  async deleteConnection(id: number): Promise<void> {
    const res = await authFetch(`/api/admin/pms/connections/${id}/`, { method: "DELETE" });
    if (res.status !== 204) {
      const text = await res.text();
      throw new Error(text || "Error al eliminar conexión");
    }
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

  async deleteOperator(id: number): Promise<void> {
    const res = await authFetch(`/api/admin/operators/${id}/`, { method: "DELETE" });
    if (res.status !== 204) {
      const text = await res.text();
      throw new Error(text || "Error al eliminar operador");
    }
  },

  async getAgencies(): Promise<{ results: Agency[] } | null> {
    return getJson<{ results: Agency[] }>("/api/admin/agencies/");
  },

  async createAgency(data: {
    name: string;
    contact_email: string;
    contact_phone?: string;
    initial_level?: string;
    initial_points?: number;
  }): Promise<Agency & { email_sent?: boolean }> {
    return postJson<Agency>("/api/admin/agencies/", data);
  },

  async getAgency(id: number): Promise<AgencyDetail | null> {
    return getJson<AgencyDetail>(`/api/admin/agencies/${id}/`);
  },

  async patchAgency(
    id: number,
    body: Partial<{
      name: string;
      contact_email: string;
      contact_phone: string;
      is_active: boolean;
      scoped_operator_ids: number[];
      scoped_property_ids: number[];
    }>
  ): Promise<AgencyDetail | null> {
    return patchJson<AgencyDetail>(`/api/admin/agencies/${id}/`, body);
  },

  async patchAgencyInventoryScope(
    id: number,
    body: { scoped_operator_ids?: number[]; scoped_property_ids?: number[] }
  ): Promise<AgencyDetail | null> {
    return patchJson<AgencyDetail>(`/api/admin/agencies/${id}/`, body);
  },

  async deleteAgency(id: number): Promise<void> {
    return deleteVoid(`/api/admin/agencies/${id}/`);
  },

  async getAgencyLevels(): Promise<AgencyLevelConfig[] | null> {
    return getJson<AgencyLevelConfig[]>("/api/admin/agencies/levels/");
  },

  async getAgencyWallet(agencyId: number): Promise<AgentWallet | null> {
    return getJson<AgentWallet>(`/api/admin/agencies/${agencyId}/wallet/`);
  },

  async adjustAgencyWallet(
    agencyId: number,
    payload: { amount?: number; reason?: WalletMovementReason; note?: string; level?: LoyaltyLevelValue }
  ): Promise<AgentWallet> {
    return postJson<AgentWallet>(`/api/admin/agencies/${agencyId}/wallet/`, payload);
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

  async getAvailabilitySlotDetail(params: {
    room_type_id: number;
    date: string;
  }): Promise<AvailabilitySlotDetail | null> {
    const q = new URLSearchParams();
    q.set("room_type_id", String(params.room_type_id));
    q.set("date", params.date);
    const path = `/api/admin/availability/slot/?${q.toString()}`;
    const res = await authFetch(path);
    if (res.status === 404) {
      throw new Error("Tipo de habitación no encontrado (404). El endpoint puede no existir o el ID es inválido.");
    }
    return res.json() as Promise<AvailabilitySlotDetail>;
  },

  async getAvailabilityBlocks(params?: {
    property_id?: number;
    room_type_id?: number;
    date_from?: string;
    date_to?: string;
    status?: "active" | "cancelled" | "released" | "all";
  }): Promise<{ results: AvailabilityBlockItem[] } | null> {
    const q = new URLSearchParams();
    if (params?.property_id != null) q.set("property_id", String(params.property_id));
    if (params?.room_type_id != null) q.set("room_type_id", String(params.room_type_id));
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    if (params?.status) q.set("status", params.status);
    const query = q.toString();
    return getJson<{ results: AvailabilityBlockItem[] }>(
      `/api/admin/availability/blocks/${query ? `?${query}` : ""}`
    );
  },

  async createAvailabilityBlock(data: {
    room_type_id: number;
    start_date: string;
    end_date: string;
    note?: string;
    physical_room_ids?: number[];
  }): Promise<AvailabilityBlockItem | null> {
    return postJson<AvailabilityBlockItem>("/api/admin/availability/blocks/", data);
  },

  async cancelAvailabilityBlock(id: number): Promise<{ id: number; status: string } | null> {
    return patchJson<{ id: number; status: string }>(`/api/admin/availability/blocks/${id}/`, {
      status: "cancelled",
    });
  },

  async deleteAvailabilityBlock(id: number): Promise<boolean> {
    const res = await authFetch(`/api/admin/availability/blocks/${id}/`, { method: "DELETE" });
    return res.ok;
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
    data: {
      role?: AdminRole | null;
      operator_id?: number | null;
      first_name?: string;
      last_name?: string;
      email?: string;
    }
  ): Promise<AdminUserListItem> {
    return patchJson<AdminUserListItem>(`/api/admin/users/${id}/`, data);
  },

  async deleteUser(id: number): Promise<void> {
    const res = await authFetch(`/api/admin/users/${id}/`, { method: "DELETE" });
    if (res.status !== 204) {
      const text = await res.text();
      throw new Error(text || "Error al eliminar usuario");
    }
  },

  async createUserAdmin(data: {
    email: string;
    first_name: string;
    last_name?: string;
    role: AdminRole;
    operator_id?: number | null;
    password: string;
    initial_level?: string;
    initial_points?: number;
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

// ─────────────────────────────────────────────────────────────────────────── //
//  Reviews (admin moderation)
// ─────────────────────────────────────────────────────────────────────────── //

export interface AdminReview {
  id: number;
  property_id: number;
  property_name: string;
  booking_id: number | null;
  clerk_user_id: string;
  author_name: string;
  rating: number;
  cleanliness: number | null;
  comfort: number | null;
  location: number | null;
  value: number | null;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  moderated_by: string;
  moderation_note: string;
  moderated_at: string | null;
  operator_response: string;
  operator_response_at: string | null;
  created: string;
}

export interface ReviewsListResponse {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  pending_count: number;
  results: AdminReview[];
}

// ─────────────────────────────────────────────────────────────────────────── //
//  Coupons (admin)
// ─────────────────────────────────────────────────────────────────────────── //

export interface AdminCoupon {
  id: number;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  max_discount_amount: string | null;
  min_booking_amount: string;
  max_uses: number | null;
  max_uses_per_user: number;
  times_used: number;
  /** Reservas no canceladas con este cupón (pending + confirmadas); gobierna max_uses. */
  active_reservations_with_coupon: number;
  /** Filas CouponUsage (pagos confirmados con cupón). */
  coupon_usage_records_count: number;
  /** Cupos globales restantes según reservas activas; null si max_uses es ilimitado. */
  max_uses_remaining: number | null;
  /** True si ya no caben más reservas por límite global. */
  at_global_use_limit: boolean;
  /** times_used en BD coincide con coupon_usage_records_count. */
  ledger_counter_in_sync: boolean;
  valid_from: string;
  valid_until: string | null;
  status: "active" | "paused" | "expired";
  created: string;
  updated: string;
  applies_to_property_id: number | null;
  applies_to_operator_id: number | null;
}

export interface CouponsListResponse {
  count: number;
  page: number;
  num_pages: number;
  results: AdminCoupon[];
}

export const couponsApi = {
  async list(params: { page?: number; search?: string; status?: string }): Promise<CouponsListResponse> {
    const q = new URLSearchParams();
    if (params.page != null) q.set("page", String(params.page));
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    const res = await authFetch(`/api/admin/coupons/?${q}`);
    return (await res.json()) as CouponsListResponse;
  },
  async create(data: {
    code: string;
    description?: string;
    discount_type: "percentage" | "fixed";
    discount_value: string;
    max_discount_amount?: string | null;
    min_booking_amount?: string;
    max_uses?: number | null;
    max_uses_per_user?: number;
    valid_from?: string;
    valid_until?: string | null;
    applies_to_property_id?: number | null;
    applies_to_operator_id?: number | null;
  }): Promise<AdminCoupon> {
    return postJson<AdminCoupon>("/api/admin/coupons/", data);
  },
  async patch(
    id: number,
    data: {
      status?: string;
      applies_to_property_id?: number | null;
      applies_to_operator_id?: number | null;
      min_booking_amount?: string;
      max_uses?: number | null;
      max_uses_per_user?: number;
      valid_from?: string;
      valid_until?: string | null;
      discount_type?: "percentage" | "fixed";
      discount_value?: string;
      description?: string;
    }
  ): Promise<AdminCoupon> {
    return patchJson<AdminCoupon>(`/api/admin/coupons/${id}/`, data);
  },
  async delete(id: number): Promise<void> {
    const res = await authFetch(`/api/admin/coupons/${id}/`, { method: "DELETE" });
    if (res.status !== 204) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────── //
//  Reviews (admin moderation)
// ─────────────────────────────────────────────────────────────────────────── //

export const reviewsApi = {
  async list(params: { status?: string; search?: string; page?: number }): Promise<ReviewsListResponse> {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    if (params.page != null) q.set("page", String(params.page));
    const res = await authFetch(`/api/admin/reviews/?${q}`);
    return (await res.json()) as ReviewsListResponse;
  },
  async approve(reviewId: number, note?: string): Promise<{ ok: boolean; status: string }> {
    return postJson(`/api/admin/reviews/${reviewId}/approve/`, { note: note || "" });
  },
  async reject(reviewId: number, note?: string): Promise<{ ok: boolean; status: string }> {
    return postJson(`/api/admin/reviews/${reviewId}/reject/`, { note: note || "" });
  },
  async respond(reviewId: number, response: string): Promise<{ ok: boolean }> {
    return postJson(`/api/admin/reviews/${reviewId}/respond/`, { response });
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

// ---------------------------------------------------------------------------
// Bookings Admin
// ---------------------------------------------------------------------------

export interface AdminBookingTransaction {
  id: number;
  gateway: string;
  amount: string;
  currency: string;
  status: string;
  external_reference: string;
  created: string;
}

export interface AdminBookingListItem {
  id: number;
  reference: string;
  clerk_user_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  property_id: number;
  property_name: string;
  room_type_id: number;
  room_type_name: string;
  operator_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests_count: number;
  status: string;
  currency: string;
  total_amount: string;
  payment_status: string;
  payment_gateway: string;
  payment_reference: string;
  notes: string;
  metadata: Record<string, unknown>;
  coupon_code: string | null;
  coupon_discount: string | null;
  refund_attempted: boolean;
  refund_success: boolean;
  refund_requires_manual: boolean;
  refund_gateway: string | null;
  cancellation_refund_amount: string | null;
  cancellation_refund_type: string | null;
  cancellation_refund_pct: number | null;
  created: string;
  updated: string;
  agency_id: number | null;
  profile_id: number | null;
  transactions: AdminBookingTransaction[];
}

export interface AdminBookingDetail extends AdminBookingListItem {
  guests: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    is_primary: boolean;
  }[];
  profile: { id: number; clerk_user_id: string } | null;
}

export interface AdminBookingListResponse {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  results: AdminBookingListItem[];
}

export interface AdminBookingStats {
  total: number;
  confirmed: number;
  cancelled: number;
  pending: number;
  this_month_count: number;
  this_month_revenue: string;
}

export const adminBookings = {
  async list(params?: {
    status?: string;
    search?: string;
    page?: number;
    operator_id?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<AdminBookingListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.operator_id) searchParams.set("operator_id", String(params.operator_id));
    if (params?.date_from) searchParams.set("date_from", params.date_from);
    if (params?.date_to) searchParams.set("date_to", params.date_to);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const data = await getJson<AdminBookingListResponse>(`/api/admin/bookings/${qs}`);
    return data ?? { count: 0, page: 1, page_size: 25, num_pages: 0, results: [] };
  },

  async stats(): Promise<AdminBookingStats> {
    const data = await getJson<AdminBookingStats>(`/api/admin/bookings/stats/`);
    return data ?? { total: 0, confirmed: 0, cancelled: 0, pending: 0, this_month_count: 0, this_month_revenue: "0" };
  },

  async get(id: number): Promise<AdminBookingDetail | null> {
    return getJson<AdminBookingDetail>(`/api/admin/bookings/${id}/`);
  },

  async cancel(
    id: number,
    data: { reason?: string; has_justification?: boolean }
  ): Promise<{ ok: boolean; refund_type: string; refund_pct: number; refund_amount: string; reason: string }> {
    return postJson(`/api/admin/bookings/${id}/cancel/`, data);
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
  // Super admin no ve "Mi Billetera" — es parte del equipo Newayzi, no usa rewards personales
  if (role === "super_admin" && module === "wallet") return false;
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
      return false; // solo super_admin (ya retornó arriba; backend restringe igual)
    case "wallet":
      // Operador: Programa de Socios. Agente/visualizador: billetera guest. Comercial/super_admin: no (son staff puro)
      return ["agente", "visualizador", "operador"].includes(role);
    case "agent-wallets":
      return false; // solo super_admin (ya retornó arriba)
    case "agents":
      return role === "operador";
    case "payments":
      return false; // solo super_admin (ya cubierto arriba)
    case "bookings":
      return role === "operador" || role === "agente"; // operador: sus propiedades; agente: sus reservas
    case "analytics":
    case "reviews":
    case "coupons":
    case "users":
    case "corporate-credits":
    case "audit":
    case "simulator":
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
    case "communications": return true; // solo super_admin accede; para el resto no aplica
    default:             return true;
  }
}

/** Si el rol puede crear entidades en el módulo */
export function canCreate(role: AdminRole | null, module: string): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  if (role === "operador" && module === "agents") return true; // operador crea sus agentes
  return false;
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
  const base = resolvedApiBase();
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

// ─── Agent Wallets (unificado con Newayzi Rewards / LoyaltyUserSummary) ────────

export type WalletMovementReason =
  | "cashback"
  | "redemption"
  | "adjustment"
  | "booking_commission"
  | "bonus"
  | "correction";

export type LoyaltyLevelValue = "member" | "plus" | "premium";

export interface AgentWalletMovement {
  id: number;
  amount: number;
  reason: WalletMovementReason;
  reason_label: string;
  note: string;
  created_at: string;
  is_expired: boolean;
  expires_at: string | null;
}

/** La billetera del agente ES su LoyaltyUserSummary — mismo sistema que los huéspedes */
export interface AgentWallet {
  exists: boolean;
  profile_id: number;
  agent_name: string;
  agent_email: string;
  agent_role: string;
  points: number;
  level: LoyaltyLevelValue;
  level_label: string;
  completed_bookings: number;
  total_spent: number;
  updated_at: string | null;
  movements: AgentWalletMovement[];
}

export const LEVEL_OPTIONS: { value: LoyaltyLevelValue; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "plus", label: "Plus" },
  { value: "premium", label: "Premium" },
];

export const WALLET_REASON_OPTIONS: { value: WalletMovementReason; label: string }[] = [
  { value: "adjustment", label: "Ajuste manual" },
  { value: "booking_commission", label: "Comisión por reserva cerrada" },
  { value: "bonus", label: "Bono / incentivo" },
  { value: "redemption", label: "Redención" },
  { value: "correction", label: "Corrección" },
];

export const agentWallets = {
  /** Super admin: listar billeteras de todos los agentes/personal */
  async list(token: string): Promise<AgentWallet[]> {
    const res = await fetch(`${resolvedApiBase()}/api/admin/agent-wallets/`, {
      headers: clerkAuthHeaders(token),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    return data.results ?? [];
  },

  /** Ver billetera de un agente específico (super_admin o el propio agente) */
  async get(profileId: number, token: string): Promise<AgentWallet | null> {
    const res = await fetch(`${resolvedApiBase()}/api/admin/users/${profileId}/wallet/`, {
      headers: clerkAuthHeaders(token),
    });
    if (!res.ok) return null;
    return res.json();
  },

  /** Super admin: ajustar saldo y/o nivel (crea LoyaltyUserSummary si no existe) */
  async adjust(
    profileId: number,
    token: string,
    payload: { amount?: number; reason?: WalletMovementReason; note?: string; level?: LoyaltyLevelValue }
  ): Promise<AgentWallet> {
    const res = await fetch(`${resolvedApiBase()}/api/admin/users/${profileId}/wallet/`, {
      method: "POST",
      headers: { ...clerkAuthHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? `Error ${res.status}`);
    }
    return res.json();
  },

  /** El propio agente ve su billetera Newayzi Rewards */
  async getOwn(token: string): Promise<AgentWallet | null> {
    const res = await fetch(`${resolvedApiBase()}/api/agent/wallet/`, {
      headers: clerkAuthHeaders(token),
    });
    if (!res.ok) return null;
    return res.json();
  },
};

export interface CorporateCreditMovementRow {
  id: number;
  profile_id: number;
  profile_email: string;
  profile_name: string;
  amount: number;
  reference_id: string;
  created_at: string;
}

export interface CorporateCreditListResponse {
  total: number;
  offset: number;
  limit: number;
  results: CorporateCreditMovementRow[];
}

export interface CorporateCreditPostResponse {
  idempotent: boolean;
  movement_id: number;
  profile_id: number;
  points: number;
  test_points: number;
  pool_total_contributed: number;
}

/** Créditos corporativos prepago (super_admin): puntos + aporte Reward Pool */
export const corporateCreditsApi = {
  async list(
    token: string,
    params?: { limit?: number; offset?: number }
  ): Promise<CorporateCreditListResponse> {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    const url = `${resolvedApiBase()}/api/admin/corporate-credits/${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { headers: clerkAuthHeaders(token) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Error ${res.status}`);
    }
    return res.json();
  },

  async credit(
    token: string,
    payload: {
      profile_id: number;
      amount: number;
      transfer_reference: string;
      note?: string;
    }
  ): Promise<CorporateCreditPostResponse> {
    const res = await fetch(`${resolvedApiBase()}/api/admin/corporate-credits/`, {
      method: "POST",
      headers: {
        ...clerkAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_id: payload.profile_id,
        amount: payload.amount,
        transfer_reference: payload.transfer_reference,
        note: payload.note ?? "",
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Error ${res.status}`);
    }
    return res.json();
  },
};

// ─── Contratos de Operador ──────────────────────────────────────────────────

export type ContractStatus = "draft" | "sent_to_operator" | "signed" | "active" | "superseded";

export interface OperatorContract {
  id: number;
  contractNumber: string;
  operatorId: number;
  operatorName: string;
  title: string;
  status: ContractStatus;
  statusDisplay: string;
  validFrom: string | null;
  validUntil: string | null;
  documentPdfUrl: string | null;
  /** PDF original + anexo con firma del operador (tras firmar) */
  signedDocumentPdfUrl?: string | null;
  signedByNewayziName: string;
  signedByNewayziAt: string | null;
  signedByOperatorName: string;
  signedByOperatorAt: string | null;
  operatorIp: string | null;
  contentHash: string;
  isLocked: boolean;
  tokenExpiresAt: string | null;
  isTokenValid: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** Tras sign-newayzi / resend-link: si Resend envió el correo con el link */
  signEmailSent?: boolean;
  signEmailWarning?: string;
  documentSource?: "uploaded" | "platform_template";
  counterpartyDisplayName?: string;
  pdfTemplateVersion?: string;
}

export interface CreateContractPayload {
  title: string;
  /** upload = PDF manual; platform_template = genera contrato estándar Newayzi */
  creation_mode?: "upload" | "platform_template";
  document_pdf?: File;
  /** Parte operadora en el PDF (plantilla); vacío = nombre del operador en sistema */
  counterparty_display_name?: string;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
}

export interface SignNewayziPayload {
  signer_name: string;
}

export const operatorContracts = {
  async list(operatorId: number): Promise<OperatorContract[]> {
    const res = await authFetch(`/api/admin/operators/${operatorId}/contracts/`);
    return res.json();
  },

  async create(operatorId: number, payload: CreateContractPayload): Promise<OperatorContract> {
    const form = new FormData();
    form.append("title", payload.title);
    const mode = payload.creation_mode ?? "upload";
    form.append("creation_mode", mode);
    if (mode === "platform_template") {
      if (payload.counterparty_display_name?.trim()) {
        form.append("counterparty_display_name", payload.counterparty_display_name.trim());
      }
    } else {
      if (!payload.document_pdf) throw new Error("Debes subir un PDF o elegir la plantilla estándar.");
      form.append("document_pdf", payload.document_pdf);
      if (payload.counterparty_display_name?.trim()) {
        form.append("counterparty_display_name", payload.counterparty_display_name.trim());
      }
    }
    if (payload.valid_from) form.append("valid_from", payload.valid_from);
    if (payload.valid_until) form.append("valid_until", payload.valid_until);
    if (payload.notes) form.append("notes", payload.notes);
    const res = await authFetchMultipart(`/api/admin/operators/${operatorId}/contracts/`, "POST", form);
    return res.json();
  },

  async get(operatorId: number, contractId: number): Promise<OperatorContract> {
    const res = await authFetch(`/api/admin/operators/${operatorId}/contracts/${contractId}/`);
    return res.json();
  },

  async patch(
    operatorId: number,
    contractId: number,
    data: Partial<{
      title: string;
      valid_from: string;
      valid_until: string;
      notes: string;
      counterparty_display_name: string;
      document_pdf: File;
    }>,
  ): Promise<OperatorContract> {
    const form = new FormData();
    if (data.title !== undefined) form.append("title", data.title);
    if (data.valid_from !== undefined) form.append("valid_from", data.valid_from);
    if (data.valid_until !== undefined) form.append("valid_until", data.valid_until);
    if (data.notes !== undefined) form.append("notes", data.notes);
    if (data.counterparty_display_name !== undefined) {
      form.append("counterparty_display_name", data.counterparty_display_name);
    }
    if (data.document_pdf) form.append("document_pdf", data.document_pdf);
    const res = await authFetchMultipart(`/api/admin/operators/${operatorId}/contracts/${contractId}/`, "PATCH", form);
    return res.json();
  },

  async signNewayzi(operatorId: number, contractId: number, signerName: string): Promise<OperatorContract> {
    const res = await authFetch(`/api/admin/operators/${operatorId}/contracts/${contractId}/sign-newayzi/`, {
      method: "POST",
      body: JSON.stringify({ signer_name: signerName }),
    });
    return res.json();
  },

  async resendLink(operatorId: number, contractId: number): Promise<OperatorContract> {
    const res = await authFetch(`/api/admin/operators/${operatorId}/contracts/${contractId}/resend-link/`, { method: "POST" });
    return res.json();
  },

  async activate(operatorId: number, contractId: number): Promise<OperatorContract> {
    const res = await authFetch(`/api/admin/operators/${operatorId}/contracts/${contractId}/activate/`, { method: "POST" });
    return res.json();
  },
};

// ─── Políticas de Cancelación de Propiedad ──────────────────────────────────

export type CancellationPolicyType = "flexible" | "moderate" | "strict" | "custom";
export type RefundType = "cash" | "credits" | "none";

export interface CancellationTier {
  days_before_checkin: number;
  refund_pct: number;
  refund_type: RefundType;
}

export interface PropertyCancellationPolicy {
  id: number;
  propertyId: number;
  contractId: number | null;
  contractNumber: string | null;
  policyType: CancellationPolicyType;
  policyTypeDisplay: string;
  tiers: CancellationTier[];
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  isLocked: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CancellationPolicyResponse {
  activePolicy: PropertyCancellationPolicy | null;
  history: PropertyCancellationPolicy[];
  presets: Record<string, CancellationTier[]>;
}

export const propertyCancellationPolicies = {
  async get(propertyId: number): Promise<CancellationPolicyResponse> {
    const res = await authFetch(`/api/admin/properties/${propertyId}/cancellation-policy/`);
    return res.json();
  },

  async set(
    propertyId: number,
    payload: {
      policy_type: CancellationPolicyType;
      tiers?: CancellationTier[];
      effective_from?: string;
      effective_until?: string;
    },
  ): Promise<PropertyCancellationPolicy> {
    const res = await authFetch(`/api/admin/properties/${propertyId}/cancellation-policy/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  /** Desactiva la política de la propiedad; aplica de nuevo la lógica estándar (T&C §19). */
  async clear(propertyId: number): Promise<void> {
    await authFetch(`/api/admin/properties/${propertyId}/cancellation-policy/`, {
      method: "DELETE",
    });
  },
};

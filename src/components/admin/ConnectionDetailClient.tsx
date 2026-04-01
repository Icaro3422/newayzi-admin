"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Switch, Input, Textarea, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import {
  adminApi,
  type PMSConnectionDetail,
  type UnitsSummary,
  type ConnectionSyncNowResponse,
  type ConnectionSyncStreamEvent,
  type PMSSyncRunStatus,
  type LastSyncSummaryResponse,
} from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";
import { addToast } from "@heroui/react";

type TabKey = "synced" | "pending" | "disabled" | "available";
type SyncPhaseKey = "properties" | "room_types" | "availability" | "rates";
type PhaseCounter = {
  current: number;
  total: number;
  synced: number;
  failed: number;
  skipped: number;
  draft: number;
};

/** -1 = total desconocido (mostrar "?"). 0+ = total conocido. */
function emptySyncCounters(): Record<SyncPhaseKey, PhaseCounter> {
  const init = { current: 0, total: -1, synced: 0, failed: 0, skipped: 0, draft: 0 };
  return {
    properties: { ...init },
    room_types: { ...init },
    availability: { ...init },
    rates: { ...init },
  };
}

function phaseLabel(phase?: string): string {
  if (phase === "properties") return "Propiedades";
  if (phase === "room_types") return "Tipos de habitación";
  if (phase === "availability") return "Disponibilidad";
  if (phase === "rates") return "Tarifas";
  return "Sincronización";
}

function formatSyncEvent(evt: ConnectionSyncStreamEvent): string {
  if (evt.event === "phase_started") return `Iniciando fase: ${phaseLabel(evt.phase)}`;
  if (evt.event === "phase_summary") return `Fase ${phaseLabel(evt.phase)} completada.`;
  if (evt.event === "sync_started") return "Sincronización iniciada.";
  if (evt.event === "sync_completed") return "Sincronización completada.";
  if (evt.event === "sync_finished") return "Sincronización finalizada.";
  if (evt.event === "sync_error") return `Error: ${evt.detail || "No se pudo completar."}`;
  if (evt.event === "sync_skipped") return evt.detail ? String(evt.detail) : "Sincronización omitida.";
  if (evt.event === "item_progress") {
    if (evt.status === "init") return `${phaseLabel(evt.phase)}: ${evt.total ?? "?"} elementos a procesar`;
    const item = evt.item ?? {};
    const room = item.pms_room_type_id ? ` • Hab ${item.pms_room_type_id}` : "";
    const prop = item.pms_property_id ? `Prop ${item.pms_property_id}` : "Elemento";
    const status =
      evt.status === "auto_created" ? "auto-creado" :
      evt.status === "draft_mapping" ? "auto-vinculado" :
      evt.status === "failed" ? "falló" :
      evt.status === "skipped" ? "omitido" :
      "sincronizado";
    return `${phaseLabel(evt.phase)}: ${prop}${room} (${status})`;
  }
  return String(evt.detail || "Actualización de sincronización.");
}

function mapRunStatusToApiStatus(runStatus: PMSSyncRunStatus["status"]): ConnectionSyncNowResponse["status"] {
  if (runStatus === "success") return "ok";
  if (runStatus === "partial") return "partial";
  if (runStatus === "error") return "error";
  return "queued";
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; dot: string; text: string }> = {
  synced:    { label: "Sincronizada",   dot: "bg-emerald-400", text: "text-emerald-300" },
  pending:   { label: "Pendiente",      dot: "bg-amber-400",   text: "text-amber-300"  },
  disabled:  { label: "No disponible",  dot: "bg-red-400",     text: "text-red-300"    },
  available: { label: "Disponible",     dot: "bg-blue-400",    text: "text-blue-300"   },
};

const inputDark = "rounded-xl border border-white/[0.12] bg-white/[0.04]";

export function ConnectionDetailClient() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(String(params?.id ?? "0"), 10);
  const { canEditConnections, canSyncConnection } = useAdmin();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [connection, setConnection] = useState<PMSConnectionDetail | null>(null);
  const [unitsSummary, setUnitsSummary] = useState<UnitsSummary | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<LastSyncSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgressModalOpen, setSyncProgressModalOpen] = useState(false);
  const [syncEvents, setSyncEvents] = useState<ConnectionSyncStreamEvent[]>([]);
  const [syncCurrentPhase, setSyncCurrentPhase] = useState<string>("Preparando...");
  const [syncCounters, setSyncCounters] = useState<Record<SyncPhaseKey, PhaseCounter>>(emptySyncCounters);
  const [syncFallbackUsed, setSyncFallbackUsed] = useState(false);
  const [syncResultModalOpen, setSyncResultModalOpen] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<ConnectionSyncNowResponse | null>(null);
  const [cancelPreviousModalOpen, setCancelPreviousModalOpen] = useState(false);
  const [activeRunIdForCancel, setActiveRunIdForCancel] = useState<string | null>(null);
  const [syncEstimatedSeconds, setSyncEstimatedSeconds] = useState<number | null>(null);
  const [patching, setPatching] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("synced");
  const [viewType, setViewType] = useState<"properties" | "room_types">("room_types");
  const [unitsTablePage, setUnitsTablePage] = useState(0);
  const [editingConfig, setEditingConfig] = useState(false);
  const [configBaseUrl, setConfigBaseUrl] = useState("");
  const [configUsername, setConfigUsername] = useState("");
  const [configPassword, setConfigPassword] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  // Kunas
  const [configToken, setConfigToken] = useState("");
  const [configKunasUser, setConfigKunasUser] = useState("");
  const [configKunasPwd, setConfigKunasPwd] = useState("");
  const [configSmBaseUrl, setConfigSmBaseUrl] = useState("");
  const [configSmEmail, setConfigSmEmail] = useState("");
  const [configSmPwd, setConfigSmPwd] = useState("");
  const [configSmInventoryUrl, setConfigSmInventoryUrl] = useState("");
  const [configSmGraphqlPath, setConfigSmGraphqlPath] = useState("");
  const [configSmGraphqlQuery, setConfigSmGraphqlQuery] = useState("");
  const [configSmGraphqlVariables, setConfigSmGraphqlVariables] = useState("");
  const [configSmPropertiesListPath, setConfigSmPropertiesListPath] = useState("");
  const [configRgBaseUrl, setConfigRgBaseUrl] = useState("");
  const [configRgApiKey, setConfigRgApiKey] = useState("");
  const [configRgApiSecret, setConfigRgApiSecret] = useState("");
  const [configRgPropertyIds, setConfigRgPropertyIds] = useState("");
  const [configRgMaxDays, setConfigRgMaxDays] = useState("");
  const [testingRategain, setTestingRategain] = useState(false);
  const [syncRuns, setSyncRuns] = useState<PMSSyncRunStatus[]>([]);
  const [loadingSyncRuns, setLoadingSyncRuns] = useState(false);
  const [runDetailModalOpen, setRunDetailModalOpen] = useState(false);
  const [allSyncRunsModalOpen, setAllSyncRunsModalOpen] = useState(false);
  const [allSyncRuns, setAllSyncRuns] = useState<PMSSyncRunStatus[]>([]);
  const [allSyncRunsTotal, setAllSyncRunsTotal] = useState(0);
  const [allSyncRunsPage, setAllSyncRunsPage] = useState(0);
  const [loadingAllSyncRuns, setLoadingAllSyncRuns] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PMSSyncRunStatus | null>(null);
  const [runDetailEvents, setRunDetailEvents] = useState<ConnectionSyncStreamEvent[]>([]);
  const [runDetailCounters, setRunDetailCounters] = useState<Record<SyncPhaseKey, PhaseCounter>>(emptySyncCounters);
  const [runDetailPhase, setRunDetailPhase] = useState("Preparando...");
  const [runDetailLastRefresh, setRunDetailLastRefresh] = useState<Date | null>(null);
  const [runDetailUsingWebSocket, setRunDetailUsingWebSocket] = useState(false);
  const [syncOnlyImages, setSyncOnlyImages] = useState(false);
  const [syncThrottleSeconds, setSyncThrottleSeconds] = useState(0);
  const [syncForceFullSync, setSyncForceFullSync] = useState(false);
  /** Tras mapear catálogo: solo tarifas (Stays: rates) + disponibilidad, sin re-descargar propiedades/alojamientos. */
  const [syncPricingOnly, setSyncPricingOnly] = useState(false);

  useEffect(() => {
    if (Number.isNaN(id) || id <= 0) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      adminApi.getConnection(id),
      adminApi.getUnitsSummary(id),
      adminApi.getLastSyncSummary(id),
    ])
      .then(([conn, summary, lastSync]) => {
        if (cancelled) return;
        setConnection(conn ?? null);
        setUnitsSummary(summary ?? null);
        setLastSyncSummary(lastSync ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setConnection(null);
          setUnitsSummary(null);
          setLastSyncSummary(null);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (Number.isNaN(id) || id <= 0) return;
    let cancelled = false;
    setLoadingSyncRuns(true);
    Promise.all([
      adminApi.getSyncRuns(id, 5),
      adminApi.getLastSyncSummary(id),
    ])
      .then(([runsData, lastSummary]) => {
        if (!cancelled) {
          setSyncRuns(runsData?.results ?? []);
          setLastSyncSummary(lastSummary ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSyncRuns([]);
          setLastSyncSummary(null);
        }
      })
      .finally(() => { if (!cancelled) setLoadingSyncRuns(false); });
    return () => { cancelled = true; };
  }, [id, syncing]);

  const SYNC_RUNS_PAGE_SIZE = 15;
  useEffect(() => {
    if (!allSyncRunsModalOpen || Number.isNaN(id) || id <= 0) return;
    let cancelled = false;
    setLoadingAllSyncRuns(true);
    adminApi.getSyncRuns(id, SYNC_RUNS_PAGE_SIZE, allSyncRunsPage * SYNC_RUNS_PAGE_SIZE)
      .then((data) => {
        if (!cancelled) {
          setAllSyncRuns(data.results ?? []);
          setAllSyncRunsTotal(data.total ?? data.results?.length ?? 0);
        }
      })
      .catch(() => { if (!cancelled) setAllSyncRuns([]); })
      .finally(() => { if (!cancelled) setLoadingAllSyncRuns(false); });
    return () => { cancelled = true; };
  }, [id, allSyncRunsModalOpen, allSyncRunsPage]);

  useEffect(() => {
    if (!connection?.config) return;
    const cfg = connection.config as Record<string, string>;
    if (connection.pms_type === "generic") {
      setConfigBaseUrl(cfg.base_url ?? cfg.url ?? "");
      setConfigUsername(cfg.username ?? cfg.user ?? "");
    }
    if (connection.pms_type === "kunas") {
      setConfigToken(cfg.token ?? "");
      setConfigKunasUser(cfg.username ?? cfg.user ?? "");
    }
    if (connection.pms_type === "siteminder_dashboard") {
      setConfigSmBaseUrl(cfg.base_url ?? "");
      setConfigSmEmail(cfg.email ?? "");
      setConfigSmInventoryUrl(cfg.inventory_url ?? "");
      setConfigSmGraphqlPath(cfg.graphql_path ?? "");
      setConfigSmGraphqlQuery(cfg.graphql_query ?? "");
      setConfigSmPropertiesListPath(cfg.properties_list_path ?? "");
      const gv = cfg.graphql_variables as unknown;
      if (gv && typeof gv === "object") {
        setConfigSmGraphqlVariables(JSON.stringify(gv, null, 2));
      } else if (typeof gv === "string") {
        setConfigSmGraphqlVariables(gv);
      } else {
        setConfigSmGraphqlVariables("");
      }
    }
    if (connection.pms_type === "rategain") {
      const c = connection.config as Record<string, unknown>;
      setConfigRgBaseUrl(String(c.base_url ?? ""));
      setConfigRgApiKey(String(c.api_key ?? c.apiKey ?? ""));
      setConfigRgApiSecret("");
      const rawIds = c.property_ids;
      if (Array.isArray(rawIds)) {
        setConfigRgPropertyIds(JSON.stringify(rawIds));
      } else if (c.property_id != null && String(c.property_id).trim()) {
        setConfigRgPropertyIds(JSON.stringify([String(c.property_id).trim()]));
      } else {
        setConfigRgPropertyIds("");
      }
      const md = c.max_availability_days;
      setConfigRgMaxDays(md != null && md !== "" ? String(md) : "");
    }
  }, [connection?.id, connection?.config, connection?.pms_type]);

  function resetSyncRealtimeState() {
    setSyncEvents([]);
    setSyncCurrentPhase("Preparando...");
    setSyncCounters(emptySyncCounters());
    setSyncFallbackUsed(false);
  }

  function applyRunDetailEvent(evt: ConnectionSyncStreamEvent & { seq?: number; synced?: number; failed?: number; discovered?: number }) {
    setRunDetailEvents((prev) => [evt, ...prev].slice(0, 80));
    if (evt.event === "phase_started") {
      setRunDetailPhase(`Procesando ${phaseLabel(evt.phase)}...`);
    }
    if (evt.event === "phase_summary") {
      setRunDetailPhase(`Fase ${phaseLabel(evt.phase)} completada.`);
    }
    if (evt.event === "sync_completed" || evt.event === "sync_finished") {
      setRunDetailPhase("Sincronización finalizada.");
    }
    if (evt.event === "sync_error") {
      setRunDetailPhase("Sincronización finalizada con error.");
    }
    if (evt.event === "sync_skipped") {
      setRunDetailPhase("Omitido.");
    }
    const phase = evt.phase as SyncPhaseKey | undefined;
    if (phase) {
      setRunDetailCounters((prev) => {
        const current = prev[phase];
        const updated: PhaseCounter = {
          ...current,
          current: typeof evt.current === "number" ? evt.current : current.current,
          total: typeof evt.total === "number" ? evt.total : current.total,
        };
        if (evt.event === "item_progress") {
          if (evt.status === "init") {
            /* solo actualiza current/total, no incrementa contadores */
          } else if (evt.status === "failed") updated.failed += 1;
          else if (evt.status === "draft_mapping") updated.draft += 1;
          else if (evt.status === "skipped") updated.skipped += 1;
          else updated.synced += 1;
        }
        if (evt.event === "phase_summary") {
          const synced = typeof evt.synced === "number" ? evt.synced : current.synced;
          const failed = typeof evt.failed === "number" ? evt.failed : current.failed;
          const total = typeof evt.discovered === "number" ? evt.discovered : (typeof evt.synced === "number" ? evt.synced + failed : current.total);
          updated.synced = synced;
          updated.failed = failed;
          updated.total = total;
          updated.current = total;
        }
        return { ...prev, [phase]: updated };
      });
    }
  }

  async function openRunDetail(run: PMSSyncRunStatus) {
    setRunDetailEvents([]);
    setRunDetailCounters(emptySyncCounters());
    setRunDetailPhase(run.status === "queued" ? "En cola" : run.status === "running" ? "Ejecutando..." : "Finalizado");
    setRunDetailLastRefresh(null);
    runDetailLastSeqRef.current = 0;
    runDetailPollingRunIdRef.current = null;
    runDetailWsRef.current?.close();
    runDetailWsRef.current = null;
    setRunDetailUsingWebSocket(false);
    setSelectedRun(run);
    setRunDetailModalOpen(true);
    try {
      const full = await adminApi.getSyncRun(run.run_id);
      setSelectedRun(full);
      const isCompleted = full.status === "success" || full.status === "partial" || full.status === "error";
      if (isCompleted) {
        const data = await adminApi.getSyncRunEvents(run.run_id, 0, 300);
        data.events.forEach((evt) => applyRunDetailEvent(evt));
      }
    } catch {
      /* keep run from list */
    }
  }

  const runDetailLastSeqRef = useRef(0);
  const runDetailPollingRunIdRef = useRef<string | null>(null);
  const runDetailWsRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    if (!runDetailModalOpen || !selectedRun) return;
    if (selectedRun.status !== "queued" && selectedRun.status !== "running") return;
    const runId = selectedRun.run_id;
    const wsToken = selectedRun.ws_token;
    if (runDetailPollingRunIdRef.current !== runId) {
      runDetailLastSeqRef.current = 0;
      runDetailPollingRunIdRef.current = runId;
      runDetailWsRef.current?.close();
      runDetailWsRef.current = null;
    }
    let cancelled = false;
    let usePolling = true;

    const POLL_INTERVAL_MS = 60_000; // fallback: cada 60 s

    if (wsToken) {
      try {
        const socket = adminApi.connectSyncSocket(runId, wsToken, {
          lastSeq: runDetailLastSeqRef.current,
          onMessage: (msg) => {
            if (cancelled) return;
            const evt = msg as ConnectionSyncStreamEvent & { seq?: number };
            if (typeof evt.seq === "number") runDetailLastSeqRef.current = Math.max(runDetailLastSeqRef.current, evt.seq);
            if (msg.run) setSelectedRun(msg.run);
            if (evt.event) applyRunDetailEvent(evt);
            setRunDetailLastRefresh(new Date());
          },
          onOpen: () => {
            if (!cancelled) setRunDetailUsingWebSocket(true);
          },
          onClose: () => {
            if (!cancelled) {
              usePolling = true;
              setRunDetailUsingWebSocket(false);
              poll();
            }
          },
          onError: () => {
            if (!cancelled) {
              usePolling = true;
              setRunDetailUsingWebSocket(false);
              poll();
            }
          },
        });
        runDetailWsRef.current = socket;
        usePolling = false;
      } catch {
        usePolling = true;
        setRunDetailUsingWebSocket(false);
      }
    }

    const poll = async () => {
      if (cancelled || !usePolling) return;
      const afterSeq = runDetailLastSeqRef.current;
      try {
        const data = await adminApi.getSyncRunEvents(runId, afterSeq, 300);
        data.events.forEach((evt) => {
          if (typeof evt.seq === "number") runDetailLastSeqRef.current = Math.max(runDetailLastSeqRef.current, evt.seq);
          if (!cancelled) applyRunDetailEvent(evt);
        });
        runDetailLastSeqRef.current = data.last_seq;
        const updated = await adminApi.getSyncRun(runId);
        if (!cancelled) {
          setSelectedRun(updated);
          setRunDetailLastRefresh(new Date());
        }
        if (updated.status !== "queued" && updated.status !== "running") return;
        if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
      }
    };
    if (usePolling) poll();
    return () => {
      cancelled = true;
      runDetailWsRef.current?.close();
      runDetailWsRef.current = null;
      if (runDetailPollingRunIdRef.current === runId) runDetailPollingRunIdRef.current = null;
    };
  }, [runDetailModalOpen, selectedRun?.run_id, selectedRun?.ws_token]);

  function registerSyncEvent(evt: ConnectionSyncStreamEvent) {
    setSyncEvents((prev) => [evt, ...prev].slice(0, 80));
    if (evt.event === "phase_started") {
      setSyncCurrentPhase(`Procesando ${phaseLabel(evt.phase)}...`);
    }
    if (evt.event === "sync_completed") {
      setSyncCurrentPhase("Sincronización finalizada.");
    }
    if (evt.event === "sync_finished") {
      setSyncCurrentPhase("Sincronización finalizada.");
    }
    if (evt.event === "sync_error") {
      setSyncCurrentPhase("Sincronización finalizada con error.");
    }
    if (evt.event === "sync_skipped") {
      setSyncCurrentPhase("Omitido.");
    }

    if (!evt.phase) return;
    const phase = evt.phase as SyncPhaseKey;
    setSyncCounters((prev) => {
      const current = prev[phase];
      const updated: PhaseCounter = {
        ...current,
        current: typeof evt.current === "number" ? evt.current : current.current,
        total: typeof evt.total === "number" ? evt.total : current.total,
      };

      if (evt.event === "item_progress") {
        if (evt.status === "init") {
          /* solo actualiza current/total, no incrementa contadores */
        } else if (evt.status === "failed") updated.failed += 1;
        else if (evt.status === "draft_mapping") updated.draft += 1;
        else if (evt.status === "skipped") updated.skipped += 1;
        else updated.synced += 1;
      }

      return { ...prev, [phase]: updated };
    });
  }

  async function handleSyncNow() {
    if (!canSyncConnection) return;
    try {
      const active = await adminApi.getActiveSync(id);
      if (active.active && active.run_id) {
        setActiveRunIdForCancel(active.run_id);
        setCancelPreviousModalOpen(true);
        return;
      }
    } catch {
      /* continue */
    }
    doStartSync(false);
  }

  async function doStartSync(
    cancelPrevious: boolean,
    scope?: { pmsPropertyId?: string | null; pmsRoomTypeId?: string | null }
  ) {
    if (!canSyncConnection) return;
    setCancelPreviousModalOpen(false);
    setActiveRunIdForCancel(null);
    setSyncing(true);
    setSyncProgressModalOpen(true);
    resetSyncRealtimeState();
    try {
      const pricingOnly = syncPricingOnly && !syncOnlyImages;
      const skipProperties =
        pricingOnly ||
        (!syncForceFullSync && !scope && (unitsSummary?.counts?.properties_pending ?? 0) === 0);
      const started = await adminApi.startSyncRun(id, {
        cancelPrevious,
        skipProperties,
        forceFullSync: syncForceFullSync && !pricingOnly,
        pricingOnly,
        onlyImages: syncOnlyImages,
        throttleSeconds: syncThrottleSeconds > 0 ? syncThrottleSeconds : undefined,
        scopePmsPropertyId: scope?.pmsPropertyId ?? undefined,
        scopePmsRoomTypeId: scope?.pmsRoomTypeId ?? undefined,
      });
      setSyncEstimatedSeconds(started.estimated_seconds ?? null);
      const runId = started.run_id;
      const wsToken = started.ws_token;
      if (!runId) {
        throw new Error("No se recibió run_id para la sincronización.");
      }

      let lastSeq = 0;
      let finalRun: PMSSyncRunStatus | null = null;
      let socket: { close: () => void } | null = null;
      let wsHealthy = false;
      let warnedFallback = false;
      let usedFallback = false;
      const wsStartTs = Date.now();
      const wsFallbackGraceMs = 12000;
      const staleRealtimeThresholdMs = 12000;
      let wsRetryCount = 0;
      let wsNextRetryAt = 0;
      let lastRealtimeActivityTs = Date.now();

      const applyIncomingEvent = (evt: ConnectionSyncStreamEvent & { seq?: number }) => {
        if (typeof evt.seq === "number") {
          lastSeq = Math.max(lastSeq, evt.seq);
        }
        lastRealtimeActivityTs = Date.now();
        if (evt.event) registerSyncEvent(evt);
      };

      const scheduleSocketRetry = () => {
        wsRetryCount += 1;
        const backoffMs = Math.min(8000, 500 * Math.pow(2, Math.max(0, wsRetryCount - 1)));
        wsNextRetryAt = Date.now() + backoffMs;
      };

      const openSocket = () => {
        if (!wsToken || socket) return;
        if (Date.now() < wsNextRetryAt) return;
        try {
          socket = adminApi.connectSyncSocket(runId, wsToken, {
            lastSeq,
            onOpen: () => {
              wsHealthy = true;
              wsRetryCount = 0;
              wsNextRetryAt = 0;
            },
            onClose: () => {
              wsHealthy = false;
              socket = null;
              if (!finalRun) scheduleSocketRetry();
            },
            onError: () => {
              wsHealthy = false;
              socket = null;
              if (!finalRun) scheduleSocketRetry();
            },
            onMessage: (msg) => {
              if (msg.type === "sync_snapshot" && msg.run) {
                const run = msg.run as PMSSyncRunStatus;
                if (run.status === "success" || run.status === "partial" || run.status === "error") {
                  finalRun = run;
                }
                return;
              }
              applyIncomingEvent(msg);
            },
          });
        } catch {
          wsHealthy = false;
          socket = null;
          scheduleSocketRetry();
        }
      };
      const closeSocket = () => {
        const maybeSocket = socket as { close: () => void } | null;
        if (!maybeSocket) return;
        try {
          maybeSocket.close();
        } catch {
          // noop
        }
        socket = null;
      };

      openSocket();
      let pollAttempts = 0;
      while (!finalRun && pollAttempts < 240) {
        const eventsPage = await adminApi.getSyncRunEvents(runId, lastSeq, 200);
        for (const evt of eventsPage.events ?? []) {
          applyIncomingEvent(evt);
        }

        const run = await adminApi.getSyncRun(runId);
        if (run.status === "success" || run.status === "partial" || run.status === "error") {
          finalRun = run;
          break;
        }

        pollAttempts += 1;
        if (!wsHealthy && wsToken) {
          openSocket();
          const wsGraceElapsed = Date.now() - wsStartTs >= wsFallbackGraceMs;
          const realtimeLooksStale = Date.now() - lastRealtimeActivityTs >= staleRealtimeThresholdMs;
          if (wsGraceElapsed && realtimeLooksStale) {
            usedFallback = true;
            setSyncFallbackUsed(true);
            if (!warnedFallback) {
              warnedFallback = true;
              registerSyncEvent({
                event: "message",
                detail: "Canal websocket inestable. Se mantiene progreso en vivo mediante polling de respaldo.",
              });
            }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      closeSocket();
      if (!finalRun) {
        throw new Error("La sincronización no reportó estado final a tiempo.");
      }

      const syncResult: ConnectionSyncNowResponse = {
        status: mapRunStatusToApiStatus(finalRun.status),
        summary: finalRun.summary,
        window: finalRun.window,
      };

      setLastSyncResult(syncResult);

      const summary = syncResult.summary;
      const synced = summary?.synced ?? 0;
      const failed = summary?.failed ?? 0;
      const draft = summary?.draft_mappings_created ?? 0;
      const autoCreatedProperties = summary?.auto_created_properties ?? 0;
      const autoCreatedRoomTypes = summary?.auto_created_room_types ?? 0;
      const errorCount = summary?.errors?.length ?? 0;
      const pricingUnavailable = Boolean(summary?.pricing_unavailable);

      if (usedFallback) {
        addToast({
          title: "Sincronización con fallback",
          description: "Se completó con respaldo por polling para evitar cortes del stream en vivo.",
          color: "warning",
        });
      }

      if (syncResult.status === "ok") {
        const pricingNote = pricingUnavailable
          ? " Parte de los precios del PMS no respondió en esta corrida; disponibilidad y catálogo quedaron actualizados."
          : "";
        addToast({
          title: "Sincronización exitosa",
          description: `Sincronizados: ${synced}. Duración: ${Math.round(summary?.duration_seconds ?? 0)}s.${pricingNote}`,
          color: "success",
        });
      } else if (syncResult.status === "partial") {
        const partialDesc = pricingUnavailable
          ? "Se omitió pricing por fallback del PMS. Disponibilidad y mapeos sí se sincronizaron."
          : `Procesados: ${synced}. Fallidos: ${failed}. Errores: ${errorCount}.`;
        addToast({
          title: "Sincronización parcial",
          description:
            autoCreatedProperties > 0 || autoCreatedRoomTypes > 0
              ? `Autocreados: ${autoCreatedProperties} propiedades y ${autoCreatedRoomTypes} alojamientos. ${partialDesc}`
              : partialDesc,
          color: "danger",
        });
      } else {
        addToast({
          title: "Sincronización con error",
          description: syncResult.detail || "No se pudo completar la sincronización.",
          color: "danger",
        });
      }

      setSyncProgressModalOpen(false);
      setSyncResultModalOpen(true);
      const [conn, unitsSummaryData] = await Promise.all([adminApi.getConnection(id), adminApi.getUnitsSummary(id)]);
      setConnection(conn ?? null);
      setUnitsSummary(unitsSummaryData ?? null);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo ejecutar la sincronización.";
      setSyncProgressModalOpen(false);
      addToast({
        title: "Error al sincronizar",
        description: msg,
        color: "danger",
      });
    } finally {
      setSyncing(false);
    }
  }

  async function toggleActive() {
    if (!connection || !canEditConnections) return;
    setPatching(true);
    try {
      const updated = await adminApi.patchConnection(id, { is_active: !connection.is_active });
      setConnection(updated);
    } finally { setPatching(false); }
  }

  async function saveConfig() {
    if (!connection || !canEditConnections || connection.pms_type !== "generic") return;
    setSavingConfig(true);
    try {
      const updated = await adminApi.patchConnection(id, {
        config: { base_url: configBaseUrl.trim(), username: configUsername.trim(), password: configPassword || undefined },
      });
      setConnection(updated);
      setEditingConfig(false);
      setConfigPassword("");
    } finally { setSavingConfig(false); }
  }

  async function saveKunasConfig() {
    if (!connection || !canEditConnections || connection.pms_type !== "kunas") return;
    const cfg = (connection.config ?? {}) as Record<string, unknown>;
    const newConfig: Record<string, string> = {
      token: configToken.trim(),
      username: configKunasUser.trim() || (cfg.username as string) || (cfg.user as string),
    };
    if (configKunasPwd) newConfig.password = configKunasPwd;
    else if (cfg.password && cfg.password !== "••••••••") newConfig.password = cfg.password as string;
    Object.keys(newConfig).forEach((k) => {
      if (newConfig[k] === undefined || newConfig[k] === "") delete newConfig[k];
    });
    setSavingConfig(true);
    try {
      const updated = await adminApi.patchConnection(id, { config: newConfig });
      setConnection(updated);
      setEditingConfig(false);
      setConfigKunasPwd("");
    } finally { setSavingConfig(false); }
  }

  async function saveSiteMinderConfig() {
    if (!connection || !canEditConnections || connection.pms_type !== "siteminder_dashboard") return;
    const prev = { ...(connection.config as Record<string, unknown>) };
    delete prev.password;
    const newConfig: Record<string, unknown> = {
      ...prev,
      base_url: configSmBaseUrl.trim(),
      email: configSmEmail.trim(),
      inventory_url: configSmInventoryUrl.trim(),
    };
    if (configSmGraphqlQuery.trim()) {
      newConfig.graphql_query = configSmGraphqlQuery.trim();
    } else {
      delete newConfig.graphql_query;
    }
    if (configSmGraphqlPath.trim()) {
      newConfig.graphql_path = configSmGraphqlPath.trim();
    } else {
      delete newConfig.graphql_path;
    }
    if (configSmPropertiesListPath.trim()) {
      newConfig.properties_list_path = configSmPropertiesListPath.trim();
    } else {
      delete newConfig.properties_list_path;
    }
    const gvRaw = configSmGraphqlVariables.trim();
    if (gvRaw) {
      try {
        newConfig.graphql_variables = JSON.parse(gvRaw) as Record<string, unknown>;
      } catch {
        addToast({
          title: "Variables GraphQL inválidas",
          description: "Debe ser JSON válido u estar vacío.",
          color: "danger",
        });
        return;
      }
    } else {
      delete newConfig.graphql_variables;
    }
    if (configSmPwd) newConfig.password = configSmPwd;
    setSavingConfig(true);
    try {
      const updated = await adminApi.patchConnection(id, { config: newConfig });
      setConnection(updated);
      setEditingConfig(false);
      setConfigSmPwd("");
    } finally { setSavingConfig(false); }
  }

  async function saveRategainConfig() {
    if (!connection || !canEditConnections || connection.pms_type !== "rategain") return;
    const prev = { ...(connection.config as Record<string, unknown>) };
    delete prev.api_key;
    delete prev.apiKey;
    delete prev.api_secret;
    delete prev.apiSecret;
    let propertyIds: string[] = [];
    const raw = configRgPropertyIds.trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          propertyIds = parsed.map((x) => String(x).trim()).filter(Boolean);
        }
      } catch {
        propertyIds = raw
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    const newConfig: Record<string, unknown> = {
      ...prev,
      base_url: configRgBaseUrl.trim().replace(/\/+$/, ""),
    };
    if (propertyIds.length) {
      newConfig.property_ids = propertyIds;
    } else {
      newConfig.property_ids = [];
    }
    delete newConfig.property_id;
    delete newConfig.propertyID;
    const ak = configRgApiKey.trim();
    if (ak && ak !== "••••••••") {
      newConfig.api_key = ak;
    }
    const sec = configRgApiSecret.trim();
    if (sec) {
      newConfig.api_secret = sec;
    }
    const md = configRgMaxDays.trim();
    if (md) {
      const n = parseInt(md, 10);
      if (!Number.isNaN(n) && n > 0) newConfig.max_availability_days = n;
    } else {
      delete newConfig.max_availability_days;
    }
    setSavingConfig(true);
    try {
      const updated = await adminApi.patchConnection(id, { config: newConfig });
      setConnection(updated);
      setEditingConfig(false);
      setConfigRgApiSecret("");
    } finally {
      setSavingConfig(false);
    }
  }

  async function testRategainConnection() {
    if (!connection || connection.pms_type !== "rategain") return;
    setTestingRategain(true);
    try {
      const r = await adminApi.testPmsConnection(id);
      addToast({
        title: r.ok ? "Conexión OK" : "Conexión fallida",
        description: r.detail || (r.ok ? "RateGain respondió correctamente." : "Revisa credenciales, SD-Domain o descubrimiento de propiedades."),
        color: r.ok ? "success" : "danger",
      });
    } catch (e) {
      addToast({
        title: "Error al probar",
        description: e instanceof Error ? e.message : "No se pudo completar la prueba.",
        color: "danger",
      });
    } finally {
      setTestingRategain(false);
    }
  }

  async function handleDeleteConnection() {
    if (!connection || !canSyncConnection) return;
    setDeleting(true);
    try {
      await adminApi.deleteConnection(id);
      addToast({
        title: "Conexión eliminada",
        description: "La conexión y las propiedades sincronizadas desde ella fueron eliminadas.",
        color: "success",
      });
      router.push("/admin/connections");
    } catch (e) {
      addToast({
        title: "Error al eliminar",
        description: e instanceof Error ? e.message : "No se pudo eliminar la conexión.",
        color: "danger",
      });
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  }

  if (loading) {
    return (
      <GlassCard className="p-12 flex justify-center">
        <Spinner size="lg" color="secondary" />
      </GlassCard>
    );
  }

  if (!connection) {
    return (
      <GlassCard className="p-10 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-red-500/20 border border-red-400/30 p-4">
          <Icon icon="solar:plug-circle-broken" width={40} className="text-red-300" />
        </div>
        <p className="text-white/70 font-medium">Conexión no encontrada.</p>
        <Button
          as={Link}
          href="/admin/connections"
          variant="flat"
          className="!text-white/80 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12]"
          startContent={<Icon icon="solar:arrow-left-outline" width={16} />}
        >
          Volver a conexiones
        </Button>
      </GlassCard>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "synced",    label: "Sincronizadas"  },
    { key: "pending",   label: "Pendientes"     },
    { key: "disabled",  label: "No disponibles" },
    { key: "available", label: "Disponibles"    },
  ];

  const counts = unitsSummary?.counts;
  const tabCount = (tab: TabKey) =>
    viewType === "room_types"
      ? (counts?.[`room_types_${tab}`] ?? 0)
      : (counts?.[`properties_${tab}`] ?? 0);

  const tableData = unitsSummary
    ? viewType === "properties"
      ? unitsSummary.properties[activeTab]
      : unitsSummary.room_types[activeTab]
    : [];

  const UNITS_PAGE_SIZE = 10;
  const totalUnits = tableData.length;
  const paginatedTableData = tableData.slice(
    unitsTablePage * UNITS_PAGE_SIZE,
    (unitsTablePage + 1) * UNITS_PAGE_SIZE
  );
  const totalPages = Math.ceil(totalUnits / UNITS_PAGE_SIZE) || 1;

  const isRoom = viewType === "room_types";

  return (
    <div className="space-y-5">
      {/* Back button */}
      <Button
        as={Link}
        href="/admin/connections"
        variant="flat"
        size="sm"
        className="!text-white/60 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] rounded-xl"
        startContent={<Icon icon="solar:arrow-left-outline" width={16} />}
      >
        Conexiones PMS
      </Button>

      {/* Header card */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 p-3 shrink-0">
              <Icon icon="solar:server-bold-duotone" width={28} className="text-[#b89eff]" />
            </div>
            <div>
              <h2 className="font-sora font-bold text-white text-lg leading-tight">
                {connection.name || connection.pms_type}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[0.65rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                  {connection.pms_type}
                </span>
                {connection.operator_name && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-[0.65rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                      {connection.operator_name}
                    </span>
                  </>
                )}
              </div>
              <p className="text-white/45 text-xs mt-2 max-w-xl leading-relaxed">
                Flujo estándar: credenciales de tu PMS → <strong className="text-white/55 font-semibold">Sincronizar ahora</strong> para
                importar propiedades, habitaciones, disponibilidad y tarifas (igual que Kunas o Stays).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {canEditConnections && (
              <Switch
                isSelected={connection.is_active}
                onValueChange={toggleActive}
                isDisabled={patching}
                color="secondary"
                classNames={{
                  wrapper: "group-data-[selected=true]:bg-[#5e2cec]",
                  label: "text-white/70 text-sm",
                }}
              >
                Conexión activa
              </Switch>
            )}
            {canSyncConnection && (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    className="btn-newayzi-primary"
                    onPress={handleSyncNow}
                    isLoading={syncing}
                    size="sm"
                    startContent={!syncing ? <Icon icon="solar:refresh-bold" width={16} /> : undefined}
                  >
                    Sincronizar ahora
                  </Button>
                  <Popover placement="bottom-end">
                    <PopoverTrigger as="div">
                      <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLElement).click()}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white/80 transition-colors"
                        aria-label="Opciones de sincronización"
                      >
                        <Icon icon="solar:settings-minimalistic-bold" width={18} />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="bg-[#0f1220] border border-white/[0.1] p-3 w-56">
                      <div className="space-y-3">
                        <p className="text-[0.65rem] uppercase tracking-wider text-white/45">Opciones de sync</p>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={syncOnlyImages}
                            onChange={(e) => setSyncOnlyImages(e.target.checked)}
                            className="rounded border-white/30 bg-white/10 text-[#5e2cec] focus:ring-[#5e2cec]"
                          />
                          <span className="text-sm text-white/70">Solo imágenes</span>
                        </label>
                        <label
                          className="flex cursor-pointer items-center gap-2"
                          title="Omite propiedades y tipos de habitación; solo sincroniza tarifas (Stays: API calendario + calculate-price si aplica) y disponibilidad. Usar cuando el catálogo ya está mapeado."
                        >
                          <input
                            type="checkbox"
                            checked={syncPricingOnly}
                            disabled={syncOnlyImages}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setSyncPricingOnly(v);
                              if (v) setSyncForceFullSync(false);
                            }}
                            className="rounded border-white/30 bg-white/10 text-[#5e2cec] focus:ring-[#5e2cec] disabled:opacity-40"
                          />
                          <span className="text-sm text-white/70">Solo precios y disponibilidad</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2" title="Ejecuta fase de propiedades y redescubre todos los alojamientos del PMS (p. ej. para Stays cuando faltan mapeos).">
                          <input
                            type="checkbox"
                            checked={syncForceFullSync}
                            disabled={syncPricingOnly || syncOnlyImages}
                            onChange={(e) => setSyncForceFullSync(e.target.checked)}
                            className="rounded border-white/30 bg-white/10 text-[#5e2cec] focus:ring-[#5e2cec] disabled:opacity-40"
                          />
                          <span className="text-sm text-white/70">Redescubrir propiedades y alojamientos</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <span className="text-sm text-white/50 shrink-0">Pausa (s)</span>
                          <Input
                            type="number"
                            min={0}
                            max={60}
                            step={0.5}
                            value={String(syncThrottleSeconds)}
                            onValueChange={(v) => setSyncThrottleSeconds(parseFloat(v) || 0)}
                            className="w-14 border-white/10 bg-white/5 text-sm text-white"
                            classNames={{ input: "text-center text-sm" }}
                            placeholder="0"
                          />
                        </label>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  color="danger"
                  variant="flat"
                  size="sm"
                  onPress={() => setDeleteModalOpen(true)}
                  startContent={<Icon icon="solar:trash-bin-2-bold" width={16} />}
                  className="!text-red-300 border border-red-400/30 hover:bg-red-500/20"
                >
                  Eliminar conexión
                </Button>
              </>
            )}
          </div>
        </div>

        <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <ModalContent className="bg-[#0f1220] border border-white/[0.1]">
            <ModalHeader className="text-white font-sora">Eliminar conexión</ModalHeader>
            <ModalBody>
              <p className="text-white/70 text-sm">
                Se eliminará la conexión <strong className="text-white">{connection?.name || connection?.pms_type}</strong> y
                todas las propiedades sincronizadas desde ella. Esta acción no se puede deshacer.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setDeleteModalOpen(false)} className="!text-white/70">
                Cancelar
              </Button>
              <Button color="danger" onPress={handleDeleteConnection} isLoading={deleting}>
                Eliminar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={cancelPreviousModalOpen} onOpenChange={setCancelPreviousModalOpen}>
          <ModalContent className="bg-[#0f1220] border border-white/[0.1]">
            <ModalHeader className="text-white font-sora flex items-center gap-2">
              <Icon icon="solar:refresh-bold-duotone" className="text-amber-400" width={20} />
              Sincronización en progreso
            </ModalHeader>
            <ModalBody>
              <p className="text-white/70 text-sm">
                Ya hay una sincronización en curso. No se puede iniciar otra sin cancelar la anterior.
              </p>
              <p className="text-white/50 text-sm mt-2">
                ¿Deseas cancelar el proceso actual e iniciar una nueva sincronización?
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setCancelPreviousModalOpen(false)} className="!text-white/70">
                No, esperar
              </Button>
              <Button
                color="warning"
                onPress={() => doStartSync(true)}
                className="!text-white"
              >
                Sí, cancelar e iniciar nueva
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={syncProgressModalOpen} onOpenChange={setSyncProgressModalOpen} size="lg" backdrop="blur">
          <ModalContent className="bg-[#0f1220] border border-white/[0.1]">
            <ModalHeader className="text-white font-sora flex items-center gap-2">
              <Icon icon="solar:refresh-bold-duotone" className="text-[#9b74ff]" width={18} />
              Sincronización en vivo
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                {syncEstimatedSeconds != null && (
                  <p className="text-[0.8rem] text-white/50">
                    Tiempo estimado: ~{syncEstimatedSeconds >= 60
                      ? `${Math.floor(syncEstimatedSeconds / 60)} min`
                      : `${syncEstimatedSeconds} s`}
                  </p>
                )}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/70">
                  <p className="text-white/90 font-medium">{syncCurrentPhase}</p>
                  {syncFallbackUsed && (
                    <p className="mt-1 text-amber-300">
                      Modo estándar activo: no se pudo abrir el stream en tiempo real.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(syncCounters) as SyncPhaseKey[]).map((phase) => (
                    <div key={phase} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <p className="text-[0.65rem] uppercase tracking-wider text-white/40">{phaseLabel(phase)}</p>
                      <p className="text-white/90 text-sm mt-1">
                        {syncCounters[phase].current}/{syncCounters[phase].total >= 0 ? syncCounters[phase].total : "?"}
                      </p>
                      <p className="text-[0.72rem] text-white/55 mt-1">
                        OK: {syncCounters[phase].synced} · Fallos: {syncCounters[phase].failed}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Actividad reciente</p>
                  <ul className="space-y-1 max-h-52 overflow-y-auto text-xs text-white/75">
                    {syncEvents.length === 0 ? (
                      <li>Esperando eventos de sincronización...</li>
                    ) : (
                      syncEvents.slice(0, 24).map((evt, idx) => (
                        <li key={`${evt.event}-${idx}`}>- {formatSyncEvent(evt)}</li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => setSyncProgressModalOpen(false)}
                isDisabled={syncing}
                className="!text-white/80 bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14]"
              >
                {syncing ? "Sincronizando..." : "Cerrar"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={syncResultModalOpen} onOpenChange={setSyncResultModalOpen} size="lg" backdrop="blur">
          <ModalContent className="bg-[#0f1220] border border-white/[0.1]">
            <ModalHeader className="text-white font-sora flex items-center gap-2">
              <Icon icon="solar:check-circle-bold" className="text-[#9b74ff]" width={18} />
              Resumen de sincronización
            </ModalHeader>
            <ModalBody>
              {lastSyncResult?.summary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Procesados</p>
                      <p className="text-xl font-semibold text-white">{lastSyncResult.summary.synced}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Fallidos</p>
                      <p className="text-xl font-semibold text-white">{lastSyncResult.summary.failed}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Autocreados</p>
                      <p className="text-xl font-semibold text-white">
                        {(lastSyncResult.summary.auto_created_properties ?? 0) + (lastSyncResult.summary.auto_created_room_types ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Tarifas base</p>
                      <p className="text-xl font-semibold text-white">{lastSyncResult.summary.room_type_base_rates_synced}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/70 space-y-1">
                    <p>
                      Propiedades descubiertas en PMS:{" "}
                      <span className="text-white/90 font-medium">
                        {lastSyncResult.summary.properties_discovered ?? lastSyncResult.summary.properties_synced}
                      </span>
                    </p>
                    <p>
                      Propiedades mapeadas localmente:{" "}
                      <span className="text-white/90 font-medium">{lastSyncResult.summary.properties_synced}</span>
                    </p>
                    <p>
                      Propiedades auto-creadas:{" "}
                      <span className="text-white/90 font-medium">{lastSyncResult.summary.auto_created_properties ?? 0}</span>
                    </p>
                    <p>
                      Alojamientos descubiertos en PMS:{" "}
                      <span className="text-white/90 font-medium">
                        {lastSyncResult.summary.room_types_discovered ?? lastSyncResult.summary.room_types_synced}
                      </span>
                    </p>
                    <p>
                      Alojamientos mapeados localmente:{" "}
                      <span className="text-white/90 font-medium">{lastSyncResult.summary.room_types_synced}</span>
                    </p>
                    <p>
                      Alojamientos auto-creados:{" "}
                      <span className="text-white/90 font-medium">{lastSyncResult.summary.auto_created_room_types ?? 0}</span>
                    </p>
                    {lastSyncResult.window && (
                      <p className="text-white/50">
                        Ventana de sync: {lastSyncResult.window.start_date} a {lastSyncResult.window.end_date}
                      </p>
                    )}
                    {lastSyncResult.summary.sync_run_id && (
                      <p className="text-white/50">Run ID: {lastSyncResult.summary.sync_run_id}</p>
                    )}
                    {typeof lastSyncResult.summary.duration_seconds === "number" && (
                      <p className="text-white/50">Duración: {Math.round(lastSyncResult.summary.duration_seconds)}s</p>
                    )}
                  </div>

                  {lastSyncResult.summary.pricing_unavailable && (
                    <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-amber-200 text-sm space-y-1">
                      <p className="font-medium">Pricing omitido por fallback de resiliencia.</p>
                      <p>
                        La corrida continuó con disponibilidad y metadatos para evitar timeout del sync.
                        {(lastSyncResult.summary.pricing_unavailable_properties?.length ?? 0) > 0
                          ? ` Propiedades afectadas: ${lastSyncResult.summary.pricing_unavailable_properties?.slice(0, 6).join(", ")}`
                          : ""}
                      </p>
                    </div>
                  )}

                  {lastSyncResult.summary.draft_mappings_created > 0 && (
                    <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-amber-200 text-sm">
                      Se detectaron {lastSyncResult.summary.draft_mappings_created} draft(s) legacy en esta corrida.
                    </div>
                  )}

                  {(lastSyncResult.summary.errors?.length ?? 0) > 0 && (
                    <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-3">
                      <p className="text-sm font-medium text-red-200 mb-1">Errores reportados</p>
                      <ul className="text-xs text-red-100/90 space-y-1 max-h-32 overflow-y-auto">
                        {lastSyncResult.summary.errors.slice(0, 8).map((err, idx) => (
                          <li key={idx}>- {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-white/70 text-sm">No hay resumen disponible para esta ejecución.</p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => setSyncResultModalOpen(false)}
                className="!text-white/80 bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14]"
              >
                Cerrar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal detalle de corrida (bloque de tareas) */}
        <Modal
          isOpen={runDetailModalOpen}
          onOpenChange={(open) => {
            setRunDetailModalOpen(open);
            if (!open) {
              setSelectedRun(null);
              setRunDetailEvents([]);
              setRunDetailCounters(emptySyncCounters());
              setRunDetailUsingWebSocket(false);
              runDetailPollingRunIdRef.current = null;
              runDetailWsRef.current?.close();
              runDetailWsRef.current = null;
              adminApi.getSyncRuns(id, 5).then((d) => setSyncRuns(d.results ?? []));
            }
          }}
          size="lg"
          backdrop="blur"
        >
          <ModalContent className="bg-[#0f1220] border border-white/[0.1]">
            <ModalHeader className="text-white font-sora flex items-center gap-2">
              <Icon icon="solar:layers-minimalistic-bold-duotone" className="text-[#9b74ff]" width={18} />
              Detalle de sincronización
              {selectedRun && (
                <span className="text-[0.65rem] font-mono text-white/50 ml-1">
                  {selectedRun.run_id.slice(0, 8)}…
                </span>
              )}
            </ModalHeader>
            <ModalBody>
              {selectedRun ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span
                      className={
                        selectedRun.status === "success"
                          ? "text-emerald-400"
                          : selectedRun.status === "partial"
                            ? "text-amber-400"
                            : selectedRun.status === "error"
                              ? "text-red-400"
                              : selectedRun.status === "running"
                                ? "text-blue-400"
                                : "text-white/50"
                      }
                    >
                      {selectedRun.status === "success"
                        ? "Completado"
                        : selectedRun.status === "partial"
                          ? selectedRun.summary?.pricing_unavailable &&
                              (selectedRun.summary?.failed ?? 0) === 0 &&
                              (selectedRun.summary?.errors?.length ?? 0) === 0
                            ? "Parcial (precios PMS)"
                            : "Parcial"
                          : selectedRun.status === "error"
                            ? "Error"
                            : selectedRun.status === "running"
                              ? "En ejecución"
                              : "En cola"}
                    </span>
                    {selectedRun.window?.start_date && selectedRun.window?.end_date && (
                      <span className="text-white/50">
                        {selectedRun.window.start_date} → {selectedRun.window.end_date}
                      </span>
                    )}
                    {selectedRun.started_at && (
                      <span className="text-white/40 text-xs">
                        Inicio: {new Date(selectedRun.started_at).toLocaleString("es")}
                      </span>
                    )}
                  </div>

                  {(selectedRun.status === "queued" || selectedRun.status === "running") && (
                    <>
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/70">
                        <p className="text-white/90 font-medium">{runDetailPhase}</p>
                        <p className="mt-1 text-[0.8rem] text-white/50">
                          {runDetailUsingWebSocket
                            ? "WebSocket en tiempo real."
                            : "Actualizando cada 60 s (fallback)."}
                          {runDetailLastRefresh && (
                            <span className="ml-2 text-emerald-400/80">
                              Última actualización: {runDetailLastRefresh.toLocaleTimeString("es")}
                            </span>
                          )}
                        </p>
                        {selectedRun.status === "queued" && selectedRun.started_at == null && runDetailLastRefresh && (
                          <p className="mt-2 text-[0.75rem] text-amber-400/80">
                            Si la corrida permanece en cola, verifica que el worker de Celery esté en ejecución.
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(Object.keys(runDetailCounters) as SyncPhaseKey[]).map((phase) => (
                          <div key={phase} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                            <p className="text-[0.65rem] uppercase tracking-wider text-white/40">{phaseLabel(phase)}</p>
                            <p className="text-white/90 text-sm mt-1">
                              {runDetailCounters[phase].current}/{runDetailCounters[phase].total >= 0 ? runDetailCounters[phase].total : "?"}
                            </p>
                            <p className="text-[0.72rem] text-white/55 mt-1">
                              OK: {runDetailCounters[phase].synced} · Fallos: {runDetailCounters[phase].failed}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {(selectedRun.status === "success" ||
                    selectedRun.status === "partial" ||
                    selectedRun.status === "error") &&
                    selectedRun.summary && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                            <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Procesados</p>
                            <p className="text-xl font-semibold text-white">{selectedRun.summary.synced ?? 0}</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                            <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Fallidos</p>
                            <p className="text-xl font-semibold text-white">{selectedRun.summary.failed ?? 0}</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                            <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Propiedades</p>
                            <p className="text-xl font-semibold text-white">
                              {selectedRun.summary.properties_synced ?? 0}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                            <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Tipos de habitación</p>
                            <p className="text-xl font-semibold text-white">
                              {selectedRun.summary.room_types_synced ?? 0}
                            </p>
                          </div>
                        </div>
                        {Boolean(selectedRun.params?.pricing_only) && (
                          <div className="rounded-xl border border-[#5e2cec]/30 bg-[#5e2cec]/10 p-3 text-white/80 text-sm">
                            <p className="font-medium text-white/95">Modo solo precios y disponibilidad</p>
                            <p className="mt-1 text-[0.8rem] text-white/65">
                              No se volvieron a sincronizar propiedades ni tipos de habitación; solo tarifas (p. ej. Stays:
                              calendario y fallback calculate-price) y disponibilidad según la conexión.
                            </p>
                          </div>
                        )}
                        {Boolean(selectedRun.params?.skip_properties) &&
                          !selectedRun.params?.pricing_only &&
                          (selectedRun.summary.properties_synced ?? 0) === 0 && (
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-white/70 text-sm">
                              <p className="font-medium text-white/90">Fase de propiedades omitida</p>
                              <p className="mt-1 text-[0.8rem] text-white/60">
                                No había propiedades en estado pendiente: la sincronización completa no vuelve a pedir
                                metadatos de propiedades al PMS (ahorro de tiempo). Tipos de habitación y disponibilidad
                                sí se procesaron.
                              </p>
                            </div>
                          )}
                        {selectedRun.summary.pricing_unavailable && (
                          <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-amber-200 text-sm space-y-1">
                            <p className="font-medium">Precios Kunas no disponibles en parte de la corrida</p>
                            <p>
                              Falló al menos una llamada a <code className="text-amber-100/90">prices/data/prices</code>.
                              La disponibilidad se sincronizó igual; el estado de la corrida es &quot;Parcial&quot; por esta
                              advertencia.
                              {(selectedRun.summary.pricing_unavailable_properties?.length ?? 0) > 0
                                ? ` IDs PMS afectados: ${selectedRun.summary.pricing_unavailable_properties?.slice(0, 8).join(", ")}`
                                : ""}
                            </p>
                          </div>
                        )}
                        {selectedRun.error && (
                          <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-red-200 text-sm">
                            {selectedRun.error}
                          </div>
                        )}
                        {(selectedRun.summary.errors?.length ?? 0) > 0 && (
                          <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-3">
                            <p className="text-sm font-medium text-red-200 mb-1">Errores</p>
                            <ul className="text-xs text-red-100/90 space-y-1 max-h-24 overflow-y-auto">
                              {selectedRun.summary.errors.slice(0, 5).map((err, idx) => (
                                <li key={idx}>- {err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Actividad</p>
                    <ul className="space-y-1 max-h-52 overflow-y-auto text-xs text-white/75">
                      {runDetailEvents.length === 0 ? (
                        <li>
                          {selectedRun.status === "queued"
                            ? "La corrida está en cola. Los eventos aparecerán cuando comience."
                            : selectedRun.status === "running"
                              ? "Obteniendo eventos..."
                              : "No hay eventos registrados."}
                        </li>
                      ) : (
                        runDetailEvents.slice(0, 24).map((evt, idx) => (
                          <li key={idx}>- {formatSyncEvent(evt)}</li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" color="secondary" />
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => {
                  setRunDetailModalOpen(false);
                  setSelectedRun(null);
                  adminApi.getSyncRuns(id, 5).then((d) => setSyncRuns(d.results ?? []));
                }}
                className="!text-white/80 bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14]"
              >
                Cerrar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal: Ver todas las corridas */}
        <Modal
          isOpen={allSyncRunsModalOpen}
          onOpenChange={setAllSyncRunsModalOpen}
          size="lg"
          backdrop="blur"
        >
          <ModalContent className="bg-[#0f1220] border border-white/[0.1]">
            <ModalHeader className="text-white font-sora flex items-center gap-2">
              <Icon icon="solar:layers-minimalistic-bold-duotone" className="text-[#9b74ff]" width={18} />
              Todas las corridas de sincronización
            </ModalHeader>
            <ModalBody>
              {loadingAllSyncRuns ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" color="secondary" />
                </div>
              ) : allSyncRuns.length === 0 ? (
                <p className="text-white/50 text-sm py-8 text-center">No hay corridas registradas.</p>
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-2 max-h-80 overflow-y-auto">
                    {allSyncRuns.map((run) => {
                      const statusStyle =
                        run.status === "success"
                          ? "text-emerald-400"
                          : run.status === "partial"
                            ? "text-amber-400"
                            : run.status === "error"
                              ? "text-red-400"
                              : run.status === "cancelled"
                                ? "text-white/40"
                                : run.status === "running"
                                  ? "text-blue-400"
                                  : "text-white/50";
                      const statusLabel =
                        run.status === "success"
                          ? "Completado"
                          : run.status === "partial"
                            ? "Parcial"
                            : run.status === "error"
                              ? "Error"
                              : run.status === "cancelled"
                                ? "Cancelado"
                                : run.status === "running"
                                  ? "En ejecución"
                                  : "En cola";
                      return (
                        <li
                          key={run.run_id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setAllSyncRunsModalOpen(false);
                            openRunDetail(run);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && (setAllSyncRunsModalOpen(false), openRunDetail(run))}
                          className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.12] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`font-medium ${statusStyle}`}>{statusLabel}</span>
                            <span className="text-white/50 text-xs">
                              {run.window?.start_date && run.window?.end_date
                                ? `${run.window.start_date} → ${run.window.end_date}`
                                : run.created_at
                                  ? new Date(run.created_at).toLocaleString("es")
                                  : run.run_id}
                            </span>
                          </div>
                          <span className="text-[0.65rem] uppercase tracking-wider text-white/30 font-mono">
                            {run.run_id.slice(0, 8)}…
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {allSyncRunsTotal > SYNC_RUNS_PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      <span className="text-white/50 text-xs">
                        {allSyncRunsPage * SYNC_RUNS_PAGE_SIZE + 1}–{Math.min((allSyncRunsPage + 1) * SYNC_RUNS_PAGE_SIZE, allSyncRunsTotal)} de {allSyncRunsTotal}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={allSyncRunsPage === 0}
                          onPress={() => setAllSyncRunsPage((p) => Math.max(0, p - 1))}
                          className="!text-white/70 bg-white/[0.07]"
                        >
                          Anterior
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={(allSyncRunsPage + 1) * SYNC_RUNS_PAGE_SIZE >= allSyncRunsTotal}
                          onPress={() => setAllSyncRunsPage((p) => p + 1)}
                          className="!text-white/70 bg-white/[0.07]"
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => setAllSyncRunsModalOpen(false)}
                className="!text-white/80 bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14]"
              >
                Cerrar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Last sync */}
        <div className="mt-5 flex items-center gap-2 text-sm text-white/40">
          <Icon icon="solar:clock-circle-outline" width={15} />
          <span>
            Última sincronización:{" "}
            <span className="text-white/60 font-medium">
              {connection.last_sync_at
                ? new Date(connection.last_sync_at).toLocaleString("es")
                : "Nunca"}
            </span>
          </span>
        </div>

        {/* Resumen del último sync completado */}
        {lastSyncSummary?.run_id && (
          <div className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="solar:chart-2-bold-duotone" width={17} className="text-[#b89eff]" />
              <p className="text-sm font-semibold text-white/80">Resumen del último sync</p>
              <span className="text-[0.7rem] text-white/40">
                {lastSyncSummary.completed_at
                  ? new Date(lastSyncSummary.completed_at).toLocaleString("es")
                  : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Propiedades</p>
                <p className="text-white/90 text-sm mt-0.5">
                  {(lastSyncSummary.summary.properties_synced ?? 0)} sincronizadas
                  {lastSyncSummary.summary.properties_failed != null && lastSyncSummary.summary.properties_failed > 0 && (
                    <span className="text-amber-400 ml-1">({lastSyncSummary.summary.properties_failed} fallos)</span>
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Habitaciones</p>
                <p className="text-white/90 text-sm mt-0.5">
                  {(lastSyncSummary.summary.room_types_synced ?? 0)} sincronizadas
                  {lastSyncSummary.summary.room_types_failed != null && lastSyncSummary.summary.room_types_failed > 0 && (
                    <span className="text-amber-400 ml-1">({lastSyncSummary.summary.room_types_failed} fallos)</span>
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Imágenes propiedades</p>
                <p className="text-white/90 text-sm mt-0.5">{lastSyncSummary.summary.property_images_saved ?? 0} guardadas</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Imágenes habitaciones</p>
                <p className="text-white/90 text-sm mt-0.5">{lastSyncSummary.summary.room_type_images_saved ?? 0} guardadas</p>
              </div>
            </div>
            {lastSyncSummary.error && (
              <p className="mt-2 text-[0.8rem] text-amber-300">{lastSyncSummary.error}</p>
            )}
          </div>
        )}

        {/* Bloques de tareas (corridas de sync) */}
        <div className="mt-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="solar:layers-minimalistic-bold-duotone" width={17} className="text-[#b89eff]" />
              <p className="text-sm font-semibold text-white/80">Bloques de tareas (últimas 5)</p>
            </div>
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                setAllSyncRunsModalOpen(true);
                setAllSyncRunsPage(0);
              }}
              className="!text-[#b89eff] bg-[#5e2cec]/15 border border-[#5e2cec]/25 hover:bg-[#5e2cec]/25"
            >
              Ver todas
            </Button>
          </div>
          {loadingSyncRuns ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" color="secondary" />
              <span className="text-[0.8rem] text-white/50">Cargando corridas...</span>
            </div>
          ) : syncRuns.length === 0 ? (
            <p className="text-[0.8rem] text-white/50">No hay corridas de sincronización registradas.</p>
          ) : (
            <ul className="space-y-2">
              {syncRuns.map((run) => {
                const statusStyle =
                  run.status === "success"
                    ? "text-emerald-400"
                    : run.status === "partial"
                      ? "text-amber-400"
                      : run.status === "error"
                        ? "text-red-400"
                        : run.status === "cancelled"
                          ? "text-white/40"
                          : run.status === "running"
                            ? "text-blue-400"
                            : "text-white/50";
                const statusLabel =
                  run.status === "success"
                    ? "Completado"
                    : run.status === "partial"
                      ? "Parcial"
                      : run.status === "error"
                        ? "Error"
                        : run.status === "cancelled"
                          ? "Cancelado"
                          : run.status === "running"
                            ? "En ejecución"
                            : "En cola";
                return (
                  <li
                    key={run.run_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openRunDetail(run)}
                    onKeyDown={(e) => e.key === "Enter" && openRunDetail(run)}
                    className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.12] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${statusStyle}`}>{statusLabel}</span>
                      <span className="text-white/50 text-xs">
                        {run.window?.start_date && run.window?.end_date
                          ? `${run.window.start_date} → ${run.window.end_date}`
                          : run.created_at
                            ? new Date(run.created_at).toLocaleString("es")
                            : run.run_id}
                      </span>
                      {run.summary?.synced != null && (
                        <span className="text-white/40 text-xs">
                          {run.summary.synced} sincronizados
                          {run.summary.failed != null && run.summary.failed > 0 ? ` · ${run.summary.failed} fallidos` : ""}
                        </span>
                      )}
                    </div>
                    <span className="text-[0.65rem] uppercase tracking-wider text-white/30 font-mono">
                      {run.run_id.slice(0, 8)}…
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Generic API credentials */}
        {connection.pms_type === "generic" && canEditConnections && (
          <div className="mt-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="solar:key-bold-duotone" width={17} className="text-[#b89eff]" />
                <p className="text-sm font-semibold text-white/80">Credenciales de la API</p>
              </div>
              {!editingConfig ? (
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setEditingConfig(true)}
                  className="!text-white/70 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12]"
                >
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    className="!text-white/60 bg-white/[0.05] border border-white/[0.1]"
                    onPress={() => {
                      setEditingConfig(false);
                      const cfg = (connection.config ?? {}) as Record<string, string>;
                      setConfigBaseUrl(cfg.base_url ?? cfg.url ?? "");
                      setConfigUsername(cfg.username ?? cfg.user ?? "");
                      setConfigPassword("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="btn-newayzi-primary"
                    onPress={saveConfig}
                    isLoading={savingConfig}
                    isDisabled={!configBaseUrl.trim() || !configUsername.trim()}
                  >
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            {editingConfig ? (
              <div className="space-y-3">
                <Input
                  label="URL de la API"
                  value={configBaseUrl}
                  onValueChange={setConfigBaseUrl}
                  placeholder="https://api.ejemplo.com"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Usuario"
                  value={configUsername}
                  onValueChange={setConfigUsername}
                  placeholder="Usuario o API key"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={configPassword}
                  onValueChange={setConfigPassword}
                  placeholder="Dejar vacío para mantener la actual"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
              </div>
            ) : (
              <div className="text-sm text-white/40 space-y-1">
                <p>URL: <span className="text-white/70">{configBaseUrl || "—"}</span></p>
                <p>Usuario: <span className="text-white/70">{configUsername || "—"}</span></p>
                <p>Contraseña: <span className="text-white/50 tracking-widest">••••••••</span></p>
              </div>
            )}
          </div>
        )}

        {/* Kunas credentials */}
        {connection.pms_type === "kunas" && canEditConnections && (
          <div className="mt-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="solar:key-bold-duotone" width={17} className="text-[#b89eff]" />
                <p className="text-sm font-semibold text-white/80">Credenciales Kunas</p>
              </div>
              {!editingConfig ? (
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setEditingConfig(true)}
                  className="!text-white/70 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12]"
                >
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    className="!text-white/60 bg-white/[0.05] border border-white/[0.1]"
                    onPress={() => {
                      setEditingConfig(false);
                      const cfg = (connection.config ?? {}) as Record<string, string>;
                      setConfigToken(cfg.token ?? "");
                      setConfigKunasUser(cfg.username ?? cfg.user ?? "");
                      setConfigKunasPwd("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="btn-newayzi-primary"
                    onPress={saveKunasConfig}
                    isLoading={savingConfig}
                    isDisabled={!configToken.trim() || !configKunasUser.trim()}
                  >
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            {editingConfig ? (
              <div className="space-y-3">
                <Input
                  label="Token"
                  value={configToken}
                  onValueChange={setConfigToken}
                  placeholder="Token de la URL del panel Kunas"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Usuario"
                  value={configKunasUser}
                  onValueChange={setConfigKunasUser}
                  placeholder="Usuario del panel Kunas"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={configKunasPwd}
                  onValueChange={setConfigKunasPwd}
                  placeholder="Dejar vacío para mantener la actual"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
              </div>
            ) : (
              <div className="text-sm text-white/40 space-y-1">
                <p>Token: <span className="text-white/70">{configToken ? "••••••••" : "—"}</span></p>
                <p>Usuario: <span className="text-white/70">{configKunasUser || "—"}</span></p>
              </div>
            )}
          </div>
        )}

        {connection.pms_type === "siteminder_dashboard" && canEditConnections && (
          <div className="mt-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="solar:key-bold-duotone" width={17} className="text-[#b89eff]" />
                <p className="text-sm font-semibold text-white/80">SiteMinder (dashboard)</p>
              </div>
              {!editingConfig ? (
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setEditingConfig(true)}
                  className="!text-white/70 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12]"
                >
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    className="!text-white/60 bg-white/[0.05] border border-white/[0.1]"
                    onPress={() => {
                      setEditingConfig(false);
                      const cfg = (connection.config ?? {}) as Record<string, string>;
                      setConfigSmBaseUrl(cfg.base_url ?? "");
                      setConfigSmEmail(cfg.email ?? "");
                      setConfigSmInventoryUrl(cfg.inventory_url ?? "");
                      setConfigSmGraphqlPath(cfg.graphql_path ?? "");
                      setConfigSmGraphqlQuery(cfg.graphql_query ?? "");
                      setConfigSmPropertiesListPath(cfg.properties_list_path ?? "");
                      const gv = cfg.graphql_variables as unknown;
                      if (gv && typeof gv === "object") {
                        setConfigSmGraphqlVariables(JSON.stringify(gv, null, 2));
                      } else if (typeof gv === "string") {
                        setConfigSmGraphqlVariables(gv);
                      } else {
                        setConfigSmGraphqlVariables("");
                      }
                      setConfigSmPwd("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="btn-newayzi-primary"
                    onPress={saveSiteMinderConfig}
                    isLoading={savingConfig}
                    isDisabled={!configSmBaseUrl.trim() || !configSmEmail.trim()}
                  >
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            {editingConfig ? (
              <div className="space-y-3">
                <Input
                  label="URL del dashboard"
                  value={configSmBaseUrl}
                  onValueChange={setConfigSmBaseUrl}
                  placeholder="https://platform.siteminder.com"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Email"
                  value={configSmEmail}
                  onValueChange={setConfigSmEmail}
                  placeholder="usuario@hotel.com"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={configSmPwd}
                  onValueChange={setConfigSmPwd}
                  placeholder="Dejar vacío para mantener la actual"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="URL inventario GET (opcional, modo http_get)"
                  value={configSmInventoryUrl}
                  onValueChange={setConfigSmInventoryUrl}
                  placeholder="/ruta GET que devuelve JSON"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Ruta GraphQL (opcional)"
                  value={configSmGraphqlPath}
                  onValueChange={setConfigSmGraphqlPath}
                  placeholder="/api/cm-beef/graphql"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Textarea
                  label="Query GraphQL (opcional)"
                  value={configSmGraphqlQuery}
                  onValueChange={setConfigSmGraphqlQuery}
                  placeholder="Pega la query desde DevTools → Payload"
                  minRows={5}
                  classNames={{
                    inputWrapper: `${inputDark} border-white/[0.12]`,
                    input: "!text-white/95 placeholder:!text-white/30 min-h-[120px]",
                    label: "!text-white/60",
                  }}
                />
                <Textarea
                  label="Variables GraphQL JSON (opcional)"
                  value={configSmGraphqlVariables}
                  onValueChange={setConfigSmGraphqlVariables}
                  placeholder='{}'
                  minRows={3}
                  classNames={{
                    inputWrapper: `${inputDark} border-white/[0.12]`,
                    input: "!text-white/95 placeholder:!text-white/30 font-mono text-xs",
                    label: "!text-white/60",
                  }}
                />
                <Input
                  label="Ruta lista en respuesta (properties_list_path)"
                  value={configSmPropertiesListPath}
                  onValueChange={setConfigSmPropertiesListPath}
                  placeholder="ej. data.misPropiedades"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
              </div>
            ) : (
              <div className="text-sm text-white/40 space-y-1">
                <p>Dashboard: <span className="text-white/70">{configSmBaseUrl || "—"}</span></p>
                <p>Email: <span className="text-white/70">{configSmEmail || "—"}</span></p>
                <p>Contraseña: <span className="text-white/50 tracking-widest">••••••••</span></p>
                <p>Inventario GET: <span className="text-white/70">{configSmInventoryUrl || "—"}</span></p>
                <p>GraphQL path: <span className="text-white/70">{configSmGraphqlPath || "—"}</span></p>
                <p>Lista (path): <span className="text-white/70">{configSmPropertiesListPath || "—"}</span></p>
                <p>Query GraphQL: <span className="text-white/70">{configSmGraphqlQuery ? `${configSmGraphqlQuery.slice(0, 80)}…` : "—"}</span></p>
              </div>
            )}
          </div>
        )}

        {connection.pms_type === "rategain" && canEditConnections && (
          <div className="mt-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Icon icon="solar:graph-up-bold-duotone" width={17} className="text-[#b89eff]" />
                <p className="text-sm font-semibold text-white/80">RateGain Smart Distribution</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  className="!text-white/70 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12]"
                  onPress={testRategainConnection}
                  isLoading={testingRategain}
                  isDisabled={!configRgBaseUrl.trim() || testingRategain}
                >
                  Probar conexión
                </Button>
                {!editingConfig ? (
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setEditingConfig(true)}
                    className="!text-white/70 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12]"
                  >
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="flat"
                      className="!text-white/60 bg-white/[0.05] border border-white/[0.1]"
                      onPress={() => {
                        setEditingConfig(false);
                        const c = (connection.config ?? {}) as Record<string, unknown>;
                        setConfigRgBaseUrl(String(c.base_url ?? ""));
                        setConfigRgApiKey(String(c.api_key ?? c.apiKey ?? ""));
                        setConfigRgApiSecret("");
                        const rawIds = c.property_ids;
                        if (Array.isArray(rawIds)) {
                          setConfigRgPropertyIds(JSON.stringify(rawIds));
                        } else if (c.property_id != null && String(c.property_id).trim()) {
                          setConfigRgPropertyIds(JSON.stringify([String(c.property_id).trim()]));
                        } else {
                          setConfigRgPropertyIds("");
                        }
                        const mdx = c.max_availability_days;
                        setConfigRgMaxDays(mdx != null && mdx !== "" ? String(mdx) : "");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="btn-newayzi-primary"
                      onPress={saveRategainConfig}
                      isLoading={savingConfig}
                      isDisabled={!configRgBaseUrl.trim()}
                    >
                      Guardar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {editingConfig ? (
              <div className="space-y-3">
                <Input
                  label="SD-Domain (base URL)"
                  value={configRgBaseUrl}
                  onValueChange={setConfigRgBaseUrl}
                  placeholder="https://partner.ejemplo.com"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Api Key"
                  type="password"
                  value={configRgApiKey}
                  onValueChange={setConfigRgApiKey}
                  placeholder="Dejar enmascarado para no cambiar"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Input
                  label="Api Secret"
                  type="password"
                  value={configRgApiSecret}
                  onValueChange={setConfigRgApiSecret}
                  placeholder="Dejar vacío para mantener el actual"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
                <Textarea
                  label="Property IDs (opcional; vacío = todas vía API)"
                  value={configRgPropertyIds}
                  onValueChange={setConfigRgPropertyIds}
                  placeholder="Vacío = descubrir todas (getDestinations + bestproperties)"
                  minRows={3}
                  classNames={{
                    inputWrapper: `${inputDark} border-white/[0.12]`,
                    input: "!text-white/95 placeholder:!text-white/30 font-mono text-xs",
                    label: "!text-white/60",
                  }}
                />
                <Input
                  label="Máx. días disponibilidad (opcional)"
                  value={configRgMaxDays}
                  onValueChange={setConfigRgMaxDays}
                  placeholder="62"
                  size="sm"
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/30", label: "!text-white/60" }}
                />
              </div>
            ) : (
              <div className="text-sm text-white/40 space-y-1">
                <p>
                  Base URL: <span className="text-white/70">{configRgBaseUrl || "—"}</span>
                </p>
                <p>
                  Api Key: <span className="text-white/70">{configRgApiKey ? "••••••••" : "—"}</span>
                </p>
                <p>
                  Api Secret: <span className="text-white/50 tracking-widest">••••••••</span>
                </p>
                <p>
                  Property IDs:{" "}
                  <span className="text-white/70 font-mono text-xs">
                    {configRgPropertyIds.trim()
                      ? configRgPropertyIds
                      : "Automático (todas las detectadas en RateGain SD)"}
                  </span>
                </p>
                <p>
                  Máx. días ARI: <span className="text-white/70">{configRgMaxDays || "predeterminado (62)"}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Units table card */}
      <GlassCard className="overflow-hidden">
        {/* Tabs */}
        <div className="px-6 pt-5">
          <div className="flex flex-wrap gap-1 border-b border-white/[0.07] pb-0">
            {TABS.map((tab) => {
              const count = tabCount(tab.key);
              const style = STATUS_STYLES[tab.key];
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setUnitsTablePage(0);
                  }}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all duration-200 -mb-px ${
                    isActive
                      ? "text-white border-b-2 border-[#7c4dff]"
                      : "text-white/40 hover:text-white/70 border-b-2 border-transparent"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? style.dot : "bg-white/25"}`}
                  />
                  {tab.label}
                  <span
                    className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[#5e2cec]/30 text-[#b89eff]"
                        : "bg-white/[0.07] text-white/40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-3">
          <span className="text-[0.6rem] uppercase tracking-[0.12em] text-white/30 font-semibold mr-1">
            Ver por
          </span>
          {(["properties", "room_types"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setViewType(v);
                setUnitsTablePage(0);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewType === v
                  ? "bg-[#5e2cec]/25 text-[#b89eff] border border-[#5e2cec]/30"
                  : "text-white/40 hover:text-white/70 border border-transparent"
              }`}
            >
              {v === "properties" ? "Propiedades" : "Tipos de habitación"}
            </button>
          ))}
        </div>

        {/* Table: scroll horizontal con columna Acciones fija a la derecha */}
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-sm min-w-[32rem]">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.03]">
                <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                  Propiedad local (mapeo)
                </th>
                {isRoom && (
                  <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                    Alojamiento local (mapeo)
                  </th>
                )}
                <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                  {isRoom ? "Alojamiento PMS" : "Nombre en PMS"}
                </th>
                <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                  ID PMS
                </th>
                <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40">
                  Estado
                </th>
                {canSyncConnection && (
                  <th className="px-6 py-3 text-left text-[0.6rem] uppercase tracking-[0.12em] font-semibold text-white/40 sticky right-0 z-10 bg-[#0f1220] border-l border-white/[0.07] shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedTableData.length === 0 ? (
                <tr>
                  <td
                    colSpan={isRoom ? (canSyncConnection ? 6 : 5) : (canSyncConnection ? 5 : 4)}
                    className="py-12 text-center text-white/30 text-sm"
                  >
                    No hay unidades en esta categoría
                  </td>
                </tr>
              ) : (
                paginatedTableData.map((u, i) => {
                  const st = STATUS_STYLES[u.status] ?? STATUS_STYLES.pending;
                  const pmsNameLabel = isRoom
                    ? (u.pms_room_name ?? u.pms_name ?? u.pms_room_id ?? "—")
                    : (u.pms_property_name ?? u.pms_property_id ?? "—");
                  const pmsIdLabel = isRoom
                    ? `${u.pms_property_id ?? "—"} / ${u.pms_room_id ?? "—"}`
                    : (u.pms_property_id ?? "—");
                  const rowKey = isRoom
                    ? `${u.pms_property_id ?? ""}-${u.pms_room_id ?? ""}-${u.local_property_id ?? ""}-${u.local_room_type_id ?? ""}-${i}`
                    : `${u.pms_property_id ?? ""}-${u.local_property_id ?? ""}-${i}`;
                  const syncScope = {
                    pmsPropertyId: u.pms_property_id ?? null,
                    pmsRoomTypeId: isRoom ? (u.pms_room_id ?? null) : undefined,
                  };
                  return (
                    <tr
                      key={rowKey}
                      className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-6 py-3 text-white/80 font-medium">
                        {u.local_property_name ?? u.local_property_id ?? "—"}
                      </td>
                      {isRoom && (
                        <td className="px-6 py-3 text-white/70">
                          {u.local_room_name ?? u.local_room_type_id ?? "—"}
                        </td>
                      )}
                      <td className="px-6 py-3 text-white/80 max-w-[14rem] truncate" title={pmsNameLabel}>
                        {pmsNameLabel}
                      </td>
                      <td className="px-6 py-3 font-mono text-[0.78rem] text-white/50 whitespace-nowrap">
                        {pmsIdLabel}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      {canSyncConnection && (
                        <td className="px-6 py-3 sticky right-0 z-10 bg-[#0f1220] border-l border-white/[0.07] shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                          <Button
                            size="sm"
                            variant="flat"
                            isIconOnly
                            aria-label="Sincronizar esta unidad"
                            onPress={() => doStartSync(false, syncScope)}
                            isDisabled={syncing}
                            className="!text-white/70 bg-white/[0.07] hover:bg-white/[0.12] min-w-8 w-8"
                          >
                            <Icon icon="solar:refresh-bold" width={16} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalUnits > 0 && (
          <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[0.65rem] text-white/40 uppercase tracking-wider">
              {unitsTablePage * UNITS_PAGE_SIZE + 1}–{Math.min((unitsTablePage + 1) * UNITS_PAGE_SIZE, totalUnits)} de {totalUnits}{" "}
              {isRoom ? "tipos de habitación" : "propiedades"}
            </span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={unitsTablePage === 0}
                  onPress={() => setUnitsTablePage((p) => Math.max(0, p - 1))}
                  className="!text-white/70 bg-white/[0.07] min-w-0"
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={unitsTablePage >= totalPages - 1}
                  onPress={() => setUnitsTablePage((p) => Math.min(totalPages - 1, p + 1))}
                  className="!text-white/70 bg-white/[0.07] min-w-0"
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

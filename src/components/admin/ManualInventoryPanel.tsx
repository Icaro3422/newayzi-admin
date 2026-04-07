"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Spinner, Switch, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  adminApi,
  type ManualInventoryImportRow,
  type RoomTypeAdminSummary,
} from "@/lib/admin-api";

const inputDark =
  "rounded-xl border border-white/[0.12] bg-white/[0.06] shadow-none data-[hover=true]:bg-white/[0.08]";

export function ManualInventoryPanel({
  propertyId,
  roomTypes,
  readOnly,
  onRefresh,
  restrictPricingToManualWeeks,
  onRestrictPricingChange,
}: {
  propertyId: number;
  roomTypes: RoomTypeAdminSummary[];
  readOnly: boolean;
  onRefresh?: () => void;
  /** Si true, no se cotizan fechas fuera de las semanas definidas en el Excel (no relleno con tarifa base). */
  restrictPricingToManualWeeks: boolean;
  onRestrictPricingChange: (value: boolean) => Promise<void>;
}) {
  const [imports, setImports] = useState<ManualInventoryImportRow[]>([]);
  const [loadingImports, setLoadingImports] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState<ManualInventoryImportRow | null>(null);
  const [ensureCounts, setEnsureCounts] = useState<Record<number, string>>({});
  const [ensuringId, setEnsuringId] = useState<number | null>(null);
  const [restrictSaving, setRestrictSaving] = useState(false);

  const loadImports = useCallback(() => {
    setLoadingImports(true);
    adminApi
      .getManualInventoryImports(propertyId)
      .then((r) => setImports(r?.results ?? []))
      .catch(() => setImports([]))
      .finally(() => setLoadingImports(false));
  }, [propertyId]);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  async function downloadTemplate() {
    try {
      const blob = await adminApi.downloadManualInventoryTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla_inventario_manual.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      addToast({ title: "Plantilla descargada", color: "success" });
    } catch (e) {
      addToast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo descargar",
        color: "danger",
      });
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || readOnly) return;
    setUploading(true);
    setLastResult(null);
    try {
      const r = await adminApi.importManualInventory(propertyId, file, true);
      setLastResult(r);
      loadImports();
      onRefresh?.();
      addToast({
        title: r.status === "success" ? "Importación completada" : "Importación con incidencias",
        description:
          r.status === "success"
            ? `${r.rows_processed} filas procesadas.`
            : `Revisa el resumen de errores.`,
        color: r.status === "success" ? "success" : "warning",
      });
    } catch (err) {
      addToast({
        title: "Error al importar",
        description: err instanceof Error ? err.message : "Error desconocido",
        color: "danger",
      });
    } finally {
      setUploading(false);
    }
  }

  async function ensureRooms(rt: RoomTypeAdminSummary) {
    const raw = ensureCounts[rt.id] ?? String(rt.physical_rooms_count || 1);
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      addToast({ title: "Cantidad inválida", color: "danger" });
      return;
    }
    setEnsuringId(rt.id);
    try {
      const r = await adminApi.ensureRoomTypePhysicalRooms(propertyId, rt.id, {
        desired_count: n,
        label_prefix: rt.code?.slice(0, 8) || "U",
      });
      addToast({
        title: "Unidades actualizadas",
        description: `Creadas: ${r.created}. Total: ${r.current_count}.`,
        color: "success",
      });
      onRefresh?.();
    } catch (e) {
      addToast({
        title: "No se pudo ajustar",
        description: e instanceof Error ? e.message : "Error",
        color: "danger",
      });
    } finally {
      setEnsuringId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/15 border border-white/[0.1] flex items-center justify-center shrink-0">
          <Icon icon="solar:document-text-bold-duotone" className="text-emerald-300/90 text-lg" />
        </div>
        <p className="text-sm text-white/55 leading-relaxed flex-1 min-w-0">
          Para propiedades <strong className="text-white/85">sin PMS</strong>: sube el Excel de semanas (precio total
          por semana por unidad). Las fotos se gestionan en la galería de abajo. El formato está descrito en la plantilla.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/90">Cotizar solo semanas del Excel</p>
          <p className="text-xs text-white/50 mt-1">
            Actívalo para no mostrar precios en fechas que no aparecen en el archivo (evita abril u otros meses si no
            están en el Excel). Requiere volver a importar o tener reglas manuales por cada semana publicada.
          </p>
        </div>
        <Switch
          isSelected={restrictPricingToManualWeeks}
          isDisabled={readOnly || restrictSaving}
          classNames={{ base: "flex-shrink-0" }}
          onValueChange={async (v) => {
            setRestrictSaving(true);
            try {
              await onRestrictPricingChange(v);
              addToast({
                title: v ? "Solo tarifas del inventario manual" : "Tarifa base permitida fuera del Excel",
                color: "success",
              });
            } catch (e) {
              addToast({
                title: "No se pudo guardar",
                description: e instanceof Error ? e.message : "Error",
                color: "danger",
              });
            } finally {
              setRestrictSaving(false);
            }
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="flat"
          className="!text-white/85 bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.12]"
          startContent={<Icon icon="solar:download-minimalistic-bold-duotone" width={18} />}
          onPress={downloadTemplate}
        >
          Descargar plantilla Excel
        </Button>
        <label className={readOnly ? "pointer-events-none opacity-50" : "cursor-pointer"}>
          <input
            type="file"
            accept=".xlsx,.xlsm"
            className="hidden"
            disabled={readOnly || uploading}
            onChange={onFileChange}
          />
          <Button
            as="span"
            size="sm"
            className="btn-newayzi-primary font-semibold"
            isLoading={uploading}
            startContent={<Icon icon="solar:upload-minimalistic-bold-duotone" width={18} />}
          >
            Subir Excel
          </Button>
        </label>
      </div>

      {lastResult && (
        <div className={`rounded-2xl border p-4 text-sm space-y-3 ${
          lastResult.status === "success"
            ? "border-emerald-500/25 bg-emerald-500/[0.06]"
            : "border-amber-500/25 bg-amber-500/[0.06]"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              lastResult.status === "success"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}>
              {lastResult.status === "success" ? "Completado" : lastResult.status}
            </span>
            <span className="text-white/60 text-xs">{lastResult.original_filename}</span>
          </div>

          {/* Estadísticas clave */}
          {lastResult.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: "Filas procesadas", key: "rows_processed", value: lastResult.rows_processed, color: "text-white/90" },
                { label: "Tipos de hab.", key: "room_types_touched", value: (lastResult.stats as Record<string, number>).room_types_touched, color: "text-blue-300" },
                { label: "Slots de semana", key: "week_slots_created", value: (lastResult.stats as Record<string, number>).week_slots_created, color: "text-purple-300" },
                { label: "Reglas de precio", key: "pricing_rules_created", value: (lastResult.stats as Record<string, number>).pricing_rules_created, color: "text-emerald-300" },
                { label: "Sin precio (slots)", key: "no_price_chunks", value: (lastResult.stats as Record<string, number>).no_price_chunks, color: "text-amber-300" },
                { label: "Bloqueos (arrendado)", key: "blocks_created", value: (lastResult.stats as Record<string, number>).blocks_created, color: "text-red-300" },
              ].filter(s => s.value !== undefined && s.value !== null).map(s => (
                <div key={s.key} className="rounded-xl bg-white/[0.05] px-3 py-2">
                  <p className={`text-lg font-black ${s.color}`}>{s.value ?? 0}</p>
                  <p className="text-[10px] text-white/45">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Avisos de filas sin precio */}
          {((lastResult.stats as Record<string, number>)?.no_price_chunks ?? 0) > 0 && (
            <p className="text-xs text-amber-300/80 bg-amber-500/[0.08] rounded-xl px-3 py-2">
              ⚠️ {(lastResult.stats as Record<string, number>).no_price_chunks} periodos importados sin precio de arriendo.
              Las semanas y habitaciones están registradas, pero no aparecerán con tarifa hasta que se asignen precios manualmente o se reimporte el Excel con precios completos.
            </p>
          )}

          {/* Errores de parseo */}
          {Array.isArray(lastResult.error_summary) && lastResult.error_summary.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-300 mb-1">Errores de parseo ({lastResult.error_summary.length}):</p>
              <pre className="text-xs text-amber-200/80 overflow-x-auto max-h-40 whitespace-pre-wrap rounded-xl bg-amber-500/[0.06] px-3 py-2">
                {JSON.stringify(lastResult.error_summary.slice(0, 30), null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/40 mb-3">Historial reciente</p>
        {loadingImports ? (
          <Spinner
            size="sm"
            classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#9b74ff]" }}
          />
        ) : imports.length === 0 ? (
          <p className="text-sm text-white/38">Aún no hay importaciones.</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/70">
            {imports.map((im) => (
              <li key={im.id} className="flex flex-wrap gap-x-3 border-b border-white/[0.06] last:border-0 last:pb-0 pb-2">
                <span>{im.created_at?.replace("T", " ").slice(0, 19)}</span>
                <span className="text-white/80">{im.status}</span>
                <span>{im.rows_processed} filas</span>
                {im.original_filename && <span className="text-white/40 truncate max-w-[200px]">{im.original_filename}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {roomTypes.length > 0 && (
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/40 mb-3">
            Habitaciones físicas por tipo (solo aumentar cupo; v1 no reduce)
          </p>
          <div className="space-y-3">
            {roomTypes.map((rt) => (
              <div
                key={rt.id}
                className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3.5"
              >
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm text-white/85 font-medium">{rt.name}</p>
                  <p className="text-xs text-white/40">
                    Código {rt.code} — actuales: {rt.physical_rooms_count ?? 0}
                  </p>
                </div>
                <Input
                  size="sm"
                  label="Objetivo (unidades)"
                  type="number"
                  min={1}
                  value={ensureCounts[rt.id] ?? ""}
                  placeholder={String(Math.max(1, rt.physical_rooms_count || 1))}
                  onValueChange={(v) => setEnsureCounts((prev) => ({ ...prev, [rt.id]: v }))}
                  isDisabled={readOnly}
                  classNames={{
                    inputWrapper: inputDark,
                    input: "!text-white/95 placeholder:!text-white/35",
                    label: "!text-white/65",
                  }}
                  className="max-w-[160px]"
                />
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={readOnly}
                  isLoading={ensuringId === rt.id}
                  onPress={() => ensureRooms(rt)}
                  className="!text-white/88 bg-white/[0.08] border border-white/[0.12]"
                >
                  Asegurar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

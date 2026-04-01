"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Spinner, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  adminApi,
  type ManualInventoryImportRow,
  type RoomTypeAdminSummary,
} from "@/lib/admin-api";

const inputDark = "rounded-xl border";

export function ManualInventoryPanel({
  propertyId,
  roomTypes,
  readOnly,
  onRefresh,
}: {
  propertyId: number;
  roomTypes: RoomTypeAdminSummary[];
  readOnly: boolean;
  onRefresh?: () => void;
}) {
  const [imports, setImports] = useState<ManualInventoryImportRow[]>([]);
  const [loadingImports, setLoadingImports] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState<ManualInventoryImportRow | null>(null);
  const [ensureCounts, setEnsureCounts] = useState<Record<number, string>>({});
  const [ensuringId, setEnsuringId] = useState<number | null>(null);

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
      <p className="text-sm text-white/55">
        Para propiedades <strong className="text-white/80">sin PMS</strong>: sube el Excel de semanas (precio total
        por semana por unidad). Las fotos se gestionan en la galería inferior. Formato descrito en la plantilla.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="flat"
          className="!text-white/80 bg-white/[0.07] border border-white/[0.12]"
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
            className="btn-newayzi-primary"
            isLoading={uploading}
            startContent={<Icon icon="solar:upload-minimalistic-bold-duotone" width={18} />}
          >
            Subir Excel
          </Button>
        </label>
      </div>

      {lastResult && (
        <div className="rounded-xl border border-white/[0.1] bg-black/20 p-4 text-sm space-y-2">
          <p className="font-semibold text-white/85">Última importación</p>
          <p className="text-white/60">
            Estado: <span className="text-white/90">{lastResult.status}</span> — filas: {lastResult.rows_processed}{" "}
            (errores parseo: {lastResult.rows_failed})
          </p>
          {lastResult.stats && Object.keys(lastResult.stats).length > 0 && (
            <pre className="text-xs text-white/50 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(lastResult.stats, null, 2)}
            </pre>
          )}
          {Array.isArray(lastResult.error_summary) && lastResult.error_summary.length > 0 && (
            <pre className="text-xs text-amber-200/90 overflow-x-auto max-h-40 whitespace-pre-wrap">
              {JSON.stringify(lastResult.error_summary.slice(0, 30), null, 2)}
            </pre>
          )}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-white/50 mb-2">Historial reciente</p>
        {loadingImports ? (
          <Spinner size="sm" />
        ) : imports.length === 0 ? (
          <p className="text-sm text-white/35">Aún no hay importaciones.</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/65">
            {imports.map((im) => (
              <li key={im.id} className="flex flex-wrap gap-x-3 border-b border-white/[0.06] pb-2">
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
          <p className="text-xs font-semibold text-white/50 mb-3">
            Habitaciones físicas por tipo (solo aumentar cupo; v1 no reduce)
          </p>
          <div className="space-y-3">
            {roomTypes.map((rt) => (
              <div
                key={rt.id}
                className="flex flex-wrap items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
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
                    input: "!text-white/95",
                    label: "!text-white/50",
                  }}
                  className="max-w-[160px]"
                />
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={readOnly}
                  isLoading={ensuringId === rt.id}
                  onPress={() => ensureRooms(rt)}
                  className="!text-white/80"
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

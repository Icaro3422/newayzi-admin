"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Spinner, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type BookingComSyncRunRow } from "@/lib/admin-api";

const inputDark =
  "rounded-xl border border-white/[0.12] bg-white/[0.06] shadow-none data-[hover=true]:bg-white/[0.08]";

export function BookingComSyncPanel({
  propertyId,
  initialListingUrl,
  readOnly,
  onRefresh,
}: {
  propertyId: number;
  initialListingUrl?: string;
  readOnly: boolean;
  onRefresh?: () => void;
}) {
  const [url, setUrl] = useState(initialListingUrl ?? "");
  const [runs, setRuns] = useState<BookingComSyncRunRow[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    setUrl(initialListingUrl ?? "");
  }, [initialListingUrl]);

  const loadRuns = useCallback(() => {
    setLoadingRuns(true);
    adminApi
      .getBookingComSyncRuns(propertyId, 15)
      .then((r) => setRuns(r?.results ?? []))
      .catch(() => setRuns([]))
      .finally(() => setLoadingRuns(false));
  }, [propertyId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  async function startSync() {
    if (readOnly) return;
    const u = url.trim();
    if (!u) {
      addToast({ title: "Pega la URL del hotel en Booking.com", color: "warning" });
      return;
    }
    setStarting(true);
    try {
      const res = await adminApi.startBookingComSync(propertyId, {
        booking_url: u,
        save_url_on_property: true,
      });
      addToast({
        title: "Sincronización encolada",
        description: res.message ?? "Revisa el historial en unos minutos.",
        color: "success",
      });
      loadRuns();
      onRefresh?.();
    } catch (e) {
      addToast({
        title: "No se pudo iniciar",
        description: e instanceof Error ? e.message : "Error",
        color: "danger",
      });
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-white/50 leading-relaxed">
        Importa fotos, descripciones y amenidades desde la página pública del hotel en Booking.com y las
        asocia a tus tipos de habitación por similitud de nombre (código + nombre). Solo para
        establecimientos que representes y donde tengas derecho a reutilizar el contenido. Requiere Celery,
        Redis y Playwright instalados en el servidor (<code className="text-white/70">playwright install chromium</code>
        ).
      </p>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <Input
          label="URL del listado en Booking.com"
          placeholder="https://www.booking.com/hotel/..."
          value={url}
          onValueChange={setUrl}
          isReadOnly={readOnly}
          classNames={{ inputWrapper: inputDark, label: "text-white/60" }}
          className="flex-1"
        />
        <Button
          color="primary"
          className="font-semibold bg-[#5e2cec] shrink-0"
          onPress={startSync}
          isDisabled={readOnly || starting}
          startContent={starting ? <Spinner size="sm" color="white" /> : <Icon icon="solar:refresh-bold-duotone" width={20} />}
        >
          Sincronizar ahora
        </Button>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-white/50 mb-2">Historial reciente</h3>
        {loadingRuns ? (
          <Spinner size="sm" color="default" />
        ) : runs.length === 0 ? (
          <p className="text-xs text-white/35">Aún no hay ejecuciones.</p>
        ) : (
          <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {runs.map((r) => (
              <li
                key={r.id}
                className="text-xs rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-emerald-300/90 font-medium uppercase">{r.status}</span>
                  <span className="text-white/35">{r.created_at?.slice(0, 19)?.replace("T", " ")}</span>
                </div>
                {r.status === "failed" && r.error_message ? (
                  <p className="text-red-300/90 mt-1 break-words">{r.error_message}</p>
                ) : null}
                {r.status === "success" && r.summary && Object.keys(r.summary).length > 0 ? (
                  <pre className="mt-1 text-[10px] text-white/45 whitespace-pre-wrap break-words max-h-24 overflow-hidden">
                    {JSON.stringify(r.summary, null, 0).slice(0, 400)}
                    {(JSON.stringify(r.summary).length > 400 ? "…" : "")}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

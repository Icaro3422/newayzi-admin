"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, Textarea, Spinner, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type RoomTypeAdminDetail, type RoomTypePicture } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";
import { RoomTypeGalleryPanel } from "./RoomTypeGalleryPanel";

/** Importe tal como en BD/PMS: solo formato, sin conversión de moneda. */
function formatPmsMoney(amount: string | number, currencyCode: string): string {
  const raw =
    typeof amount === "number" ? amount : parseFloat(String(amount).replace(",", "."));
  if (!Number.isFinite(raw)) return `${amount} ${currencyCode}`;
  const c = (currencyCode || "").toUpperCase().slice(0, 3);
  if (!/^[A-Z]{3}$/.test(c)) return `${raw} ${currencyCode}`;
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: c,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(raw);
  } catch {
    return `${raw} ${currencyCode}`;
  }
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-5 sm:p-6 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}

const inputDark = "rounded-xl border";

export function RoomTypeEditClient() {
  const params = useParams();
  const router = useRouter();
  const propertyId = parseInt(String(params?.id ?? "0"), 10);
  const roomTypeId = parseInt(String(params?.roomTypeId ?? "0"), 10);
  const { canEditProperty, role } = useAdmin();
  const readOnly = !canEditProperty;
  const canUseRoomTypeAiCta = role === "super_admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingOriginalAi, setGeneratingOriginalAi] = useState(false);
  const [detail, setDetail] = useState<RoomTypeAdminDetail | null>(null);
  const [pictures, setPictures] = useState<RoomTypePicture[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [maxOccupancy, setMaxOccupancy] = useState("");
  const [numRooms, setNumRooms] = useState("");
  const [numBathrooms, setNumBathrooms] = useState("");
  const [areaSqm, setAreaSqm] = useState("");

  const load = useCallback(async () => {
    if (!propertyId || !roomTypeId) return;
    setLoading(true);
    try {
      const d = await adminApi.getRoomTypeAdmin(propertyId, roomTypeId);
      if (!d) {
        setDetail(null);
        return;
      }
      setDetail(d);
      setPictures(d.pictures ?? []);
      setName(d.name);
      setDescription(d.description ?? "");
      setCode(d.code);
      setMaxOccupancy(String(d.max_occupancy));
      setNumRooms(d.num_rooms != null ? String(d.num_rooms) : "");
      setNumBathrooms(d.num_bathrooms != null ? String(d.num_bathrooms) : "");
      setAreaSqm(d.area_sqm != null ? String(d.area_sqm) : "");
    } catch {
      setDetail(null);
      addToast({ title: "No se pudo cargar el tipo de habitación", color: "danger" });
    } finally {
      setLoading(false);
    }
  }, [propertyId, roomTypeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (readOnly || !detail) return;
    setSaving(true);
    try {
      const payload: Parameters<typeof adminApi.patchRoomTypeAdmin>[2] = {
        name: name.trim(),
        description: description.trim(),
        code: code.trim(),
        max_occupancy: Math.max(1, parseInt(maxOccupancy, 10) || 1),
      };
      const nr = numRooms.trim();
      const nrN = nr === "" ? NaN : parseInt(nr, 10);
      payload.num_rooms = nr === "" || Number.isNaN(nrN) ? null : nrN;
      const nb = numBathrooms.trim();
      const nbN = nb === "" ? NaN : parseInt(nb, 10);
      payload.num_bathrooms = nb === "" || Number.isNaN(nbN) ? null : nbN;
      const ar = areaSqm.trim();
      payload.area_sqm = ar === "" ? null : ar;

      const updated = await adminApi.patchRoomTypeAdmin(propertyId, roomTypeId, payload);
      setDetail(updated);
      setPictures(updated.pictures ?? []);
      addToast({ title: "Cambios guardados", color: "success" });
    } catch (e) {
      addToast({
        title: "Error al guardar",
        description: e instanceof Error ? e.message : "Intenta de nuevo.",
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateRoomTypeAi() {
    if (!detail || readOnly || generatingOriginalAi || !canUseRoomTypeAiCta) return;
    if (!detail.pms_ai?.available) {
      addToast({
        title: "Sin fuente PMS",
        description: "Este tipo de habitación no tiene mapeo PMS activo.",
        color: "warning",
      });
      return;
    }
    setGeneratingOriginalAi(true);
    try {
      await adminApi.generateRoomTypeAIDescription(propertyId, roomTypeId);
      const refreshed = await adminApi.getRoomTypeAdmin(propertyId, roomTypeId);
      if (refreshed) {
        setDetail(refreshed);
        setPictures(refreshed.pictures ?? []);
        setName(refreshed.name);
        setDescription(refreshed.description ?? "");
        setCode(refreshed.code);
        setMaxOccupancy(String(refreshed.max_occupancy));
        setNumRooms(refreshed.num_rooms != null ? String(refreshed.num_rooms) : "");
        setNumBathrooms(refreshed.num_bathrooms != null ? String(refreshed.num_bathrooms) : "");
        setAreaSqm(refreshed.area_sqm != null ? String(refreshed.area_sqm) : "");
      }
      addToast({
        title: "Descripción AI generada",
        description: "La descripción del tipo de habitación se actualizó desde la fuente original PMS.",
        color: "success",
      });
    } catch (e) {
      addToast({
        title: "No se pudo generar AI",
        description: e instanceof Error ? e.message : "Intenta de nuevo.",
        color: "danger",
      });
    } finally {
      setGeneratingOriginalAi(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" classNames={{ circle1: "border-b-[#b89a5e]", circle2: "border-b-[#b89a5e]" }} />
      </div>
    );
  }

  if (!detail) {
    return (
      <GlassCard className="text-center py-12">
        <p className="text-white/60">No se encontró este tipo de habitación.</p>
        <Button as={Link} href={`/admin/properties/${propertyId}`} className="mt-4" variant="flat">
          Volver a la propiedad
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white/45">
        <Link href="/admin/properties" className="hover:text-[#f0e6d2] transition-colors">
          Propiedades
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" className="text-white/25" width={14} />
        <Link href={`/admin/properties/${propertyId}`} className="hover:text-[#f0e6d2] transition-colors truncate max-w-[10rem] sm:max-w-xs">
          {detail.property_name}
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" className="text-white/25" width={14} />
        <span className="text-white/70 font-medium truncate max-w-[12rem] sm:max-w-md">{detail.name}</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-sora">{detail.name}</h1>
          <p className="text-sm text-white/45 mt-1 font-mono">{detail.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="flat"
            className="border border-white/10 text-white/80"
            onPress={() => router.push(`/admin/properties/${propertyId}`)}
            startContent={<Icon icon="solar:arrow-left-linear" width={18} />}
          >
            Volver
          </Button>
          {!readOnly && (
            <Button
              className="bg-[#b89a5e] text-white font-semibold"
              onPress={handleSave}
              isLoading={saving}
              startContent={!saving ? <Icon icon="solar:diskette-bold-duotone" width={18} /> : undefined}
            >
              Guardar cambios
            </Button>
          )}
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-white/10 flex items-center justify-center">
            <Icon icon="solar:bed-bold-duotone" className="text-teal-400 text-lg" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white/90">Datos del tipo de habitación</h2>
            <p className="text-xs text-white/45">Nombre, descripción y características físicas.</p>
          </div>
        </div>

        {detail.pms_ai?.available && (
          <div className="mb-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/45 font-semibold">PMS + AI (Habitación)</p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs text-white/55 font-medium">Descripción sincronizada (original PMS)</p>
                <Textarea
                  value={detail.pms_ai.source_original_description || "Sin descripción original detectada"}
                  isReadOnly
                  minRows={4}
                  classNames={{
                    inputWrapper: "rounded-xl border border-white/[0.1] bg-white/[0.02]",
                    input: "!text-white/85 text-xs",
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-white/55 font-medium">Descripción generada por AI</p>
                <Textarea
                  value={
                    detail.pms_ai.ai_description_es ||
                    detail.pms_ai.ai_description_en ||
                    "Aún no hay descripción AI"
                  }
                  isReadOnly
                  minRows={4}
                  classNames={{
                    inputWrapper: "rounded-xl border border-white/[0.1] bg-white/[0.02]",
                    input: "!text-white/85 text-xs",
                  }}
                />
                <p className="text-[11px] text-white/45">
                  Idiomas AI: {(detail.pms_ai.ai_languages || []).join(", ") || "sin idiomas"} · estado: {detail.pms_ai.ai_status || "n/a"}
                </p>
              </div>
            </div>
            {!readOnly && canUseRoomTypeAiCta && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-xl border border-[#b89a5e]/40 bg-[#b89a5e]/20 text-[#f0e6d2] font-medium"
                  isLoading={generatingOriginalAi}
                  isDisabled={generatingOriginalAi}
                  startContent={!generatingOriginalAi ? <Icon icon="solar:magic-stick-3-bold-duotone" width={17} /> : undefined}
                  onPress={handleGenerateRoomTypeAi}
                >
                  Generar descripción con AI desde original
                </Button>
                {detail.pms_ai.manual_original_generated_at ? (
                  <span className="text-[11px] text-emerald-300">
                    Última generación: {new Date(detail.pms_ai.manual_original_generated_at).toLocaleString("es-CO")}
                  </span>
                ) : (
                  <span className="text-[11px] text-white/45">Disponible para regenerar cuando lo necesites.</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre"
            value={name}
            onValueChange={setName}
            isReadOnly={readOnly}
            classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
          />
          <Input
            label="Código interno"
            value={code}
            onValueChange={setCode}
            isReadOnly={readOnly}
            description="Único dentro de la propiedad; puede venir del PMS."
            classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
          />
          <Textarea
            label="Descripción"
            value={description}
            onValueChange={setDescription}
            isReadOnly={readOnly}
            minRows={4}
            className="md:col-span-2"
            classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
          />
          <Input
            label="Ocupación máxima"
            type="number"
            min={1}
            value={maxOccupancy}
            onValueChange={setMaxOccupancy}
            isReadOnly={readOnly}
            classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
          />
          <Input
            label="Área (m²)"
            value={areaSqm}
            onValueChange={setAreaSqm}
            isReadOnly={readOnly}
            classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
          />
          <Input
            label="Nº dormitorios / habitaciones"
            type="number"
            min={0}
            value={numRooms}
            onValueChange={setNumRooms}
            isReadOnly={readOnly}
            classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
          />
          <Input
            label="Nº baños"
            type="number"
            min={0}
            value={numBathrooms}
            onValueChange={setNumBathrooms}
            isReadOnly={readOnly}
            classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
          />
        </div>
      </GlassCard>

      {detail.pms_mappings && detail.pms_mappings.length > 0 && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-white/80 mb-3">Sincronización PMS</h3>
          <ul className="space-y-2">
            {detail.pms_mappings.map((m) => (
              <li
                key={`${m.connection_id}-${m.pms_room_type_id}`}
                className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-sm text-white/75"
              >
                <span className="text-[#f0e6d2] font-medium">{m.connection_name}</span>
                <span className="text-white/40 mx-2">·</span>
                <span className="font-mono text-xs text-white/50">ID PMS: {m.pms_room_type_id}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      <GlassCard>
        <h3 className="text-sm font-semibold text-white/80 mb-3">Tarifas base (referencia)</h3>
        <p className="text-[0.7rem] text-white/40 -mt-2 mb-3 leading-snug">
          Moneda e importe según sincronización PMS (sin conversión en el panel). La fila de referencia usa el precio de
          la <span className="text-white/55">última noche del rango que sincronizó el PMS</span> (no se promedian días).
          En la web pública el cobro se calcula con el desglose por fechas del catálogo (tiers / mínimo de noches) más la
          comisión Almara en el motor de precios; puede diferir de esta referencia si las fechas del huésped no son esa
          última noche.
        </p>
        {detail.base_rates?.length ? (
          <ul className="space-y-1.5">
            {detail.base_rates.map((br, idx) => {
              const multiRate = (detail.base_rates?.length ?? 0) > 1;
              const formatted = formatPmsMoney(br.price_per_night, br.currency);
              return (
                <li
                  key={`${br.currency}-${idx}`}
                  className="flex flex-col gap-0.5 text-sm text-white/70 border-b border-white/[0.06] pb-1.5 last:border-0"
                >
                  {multiRate ? (
                    <span className="text-[0.65rem] font-medium text-white/45 tracking-wide">
                      Tarifa en {br.currency}
                    </span>
                  ) : null}
                  <div>
                    <span className="font-mono text-white/85">{formatted} / noche</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-white/35">Sin tarifas base registradas.</p>
        )}
        <p className="text-xs text-white/35 mt-3">
          La sincronización con el PMS puede actualizar precios. La edición de tarifas avanzada puede hacerse desde
          herramientas de backoffice si aplica.
        </p>
      </GlassCard>

      {detail.physical_rooms && detail.physical_rooms.length > 0 && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-white/80 mb-3">Unidades / habitaciones físicas</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {detail.physical_rooms.map((pr) => (
              <li key={pr.id} className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/70">
                {pr.label}
                {pr.floor != null && <span className="text-white/40 ml-2">· Piso {pr.floor}</span>}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#b89a5e]/20 border border-white/10 flex items-center justify-center">
            <Icon icon="solar:gallery-bold-duotone" className="text-[#d4b97a] text-lg" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white/90">Galería del tipo de habitación</h2>
            <p className="text-xs text-white/50">
              {readOnly ? "Imágenes de este tipo." : "Fotos específicas de esta categoría (independientes del alojamiento)."}
            </p>
          </div>
        </div>
        <RoomTypeGalleryPanel
          propertyId={propertyId}
          roomTypeId={roomTypeId}
          pictures={pictures}
          readOnly={readOnly}
          onPicturesChange={setPictures}
        />
      </div>
    </div>
  );
}

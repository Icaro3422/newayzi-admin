"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Switch,
  Spinner,
  Textarea,
  addToast,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  adminApi,
  LEVEL_OPTIONS,
  type LoyaltyDealItem,
  type LoyaltyLevelValue,
  type PropertyDetail,
  type PropertyFaq,
  type PropertyPicture,
} from "@/lib/admin-api";
import { normalizeImageUrl } from "@/lib/normalize-image-url";
import { useAdmin } from "@/contexts/AdminContext";
import { useRouter, useParams } from "next/navigation";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { PropertyCancellationPolicyPanel } from "./PropertyCancellationPolicyPanel";
import { PropertyGalleryPanel } from "./PropertyGalleryPanel";
import { ManualInventoryPanel } from "./ManualInventoryPanel";
import { BookingComSyncPanel } from "./BookingComSyncPanel";

/* ─── Primitivos de UI ─────────────────────────────────── */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, iconBg = "from-[#5e2cec]/20 to-[#9b74ff]/20", iconColor = "text-[#9b74ff]" }: {
  icon: string; title: string; subtitle?: string;
  iconBg?: string; iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${iconBg} border border-white/10 flex items-center justify-center flex-shrink-0`}>
        <Icon icon={icon} className={`${iconColor} text-lg`} />
      </div>
      <div>
        <h2 className="text-base font-bold text-white/90">{title}</h2>
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-white/45 font-sora">{label}</span>
      <span className="text-sm text-white/85">{value || <span className="text-white/30 italic">—</span>}</span>
    </div>
  );
}

const inputDark = "rounded-xl border";

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

/* ─── Componente principal ─────────────────────────────── */
export function PropertyEditClient() {
  const router = useRouter();
  const params = useParams();
  const propertyId = parseInt(String(params?.id ?? "0"), 10);
  const { canEditProperty } = useAdmin();

  // ── Datos base
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Campos editables: contenido principal
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");

  // ── Campos editables: visibilidad
  const [is_active, setIsActive] = useState(true);
  const [is_published, setIsPublished] = useState(true);

  // ── Campos editables: reglas
  const [pets_allowed, setPetsAllowed] = useState(false);
  const [smoking_allowed, setSmokingAllowed] = useState(false);
  const [children_allowed, setChildrenAllowed] = useState(true);
  const [parties_allowed, setPartiesAllowed] = useState(false);
  const [min_age, setMinAge] = useState<string>("");

  // ── Campos editables: contacto / ubicación
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("");

  // ── Campos editables: horarios
  const [check_in_from, setCheckInFrom] = useState("");
  const [check_in_until, setCheckInUntil] = useState("");
  const [check_out_from, setCheckOutFrom] = useState("");
  const [check_out_until, setCheckOutUntil] = useState("");

  // ── Campos editables: información adicional
  const [importantInfo, setImportantInfo] = useState<string[]>([]);
  const [newImportantInfo, setNewImportantInfo] = useState("");
  const [faqs, setFaqs] = useState<PropertyFaq[]>([]);
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  // ── Galería
  const [pictures, setPictures] = useState<PropertyPicture[]>([]);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [allProperties, setAllProperties] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedDealLevel, setSelectedDealLevel] = useState<LoyaltyLevelValue>("member");
  const [levelDeals, setLevelDeals] = useState<LoyaltyDealItem[]>([]);
  const [newDealPropertyId, setNewDealPropertyId] = useState("");
  const [newDealDiscount, setNewDealDiscount] = useState("0");
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsSaving, setDealsSaving] = useState(false);

  function isDescriptionEmpty(html: string): boolean {
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length === 0;
  }

  async function suggestDescriptionWithAi() {
    if (!property || !canEditProperty || aiSuggesting) return;
    setAiSuggesting(true);
    try {
      const am = Array.isArray(amenities) ? amenities : [];
      const res = await fetch("/api/suggest-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || property.name,
          cityName: property.city_name ?? "",
          address: address.trim(),
          propertyType: property.property_type,
          amenities: am,
          locale: "es",
        }),
      });
      const data = (await res.json()) as { description?: string; error?: string };
      if (!res.ok) {
        addToast({
          title: "No se pudo generar",
          description: data.error || "Intenta de nuevo más tarde",
          color: "danger",
        });
        return;
      }
      if (data.description) {
        setDescription(data.description);
        addToast({ title: "Descripción generada", description: "Revísala y guarda cuando esté lista.", color: "success" });
      }
    } catch {
      addToast({ title: "Error de red", color: "danger" });
    } finally {
      setAiSuggesting(false);
    }
  }

  const refreshProperty = useCallback(() => {
    adminApi.getProperty(propertyId).then((p) => setProperty(p ?? null));
  }, [propertyId]);

  useEffect(() => {
    if (Number.isNaN(propertyId) || propertyId <= 0) { setLoading(false); return; }
    let cancelled = false;
    adminApi.getProperty(propertyId).then((p) => {
      if (cancelled) return;
      setProperty(p ?? null);
      if (p) {
        setName(p.name);
        setDescription(p.description ?? "");
        setIsActive(p.is_active);
        setIsPublished(p.is_published);
        setPetsAllowed(p.pets_allowed);
        setSmokingAllowed(p.smoking_allowed ?? false);
        setChildrenAllowed(p.children_allowed ?? true);
        setPartiesAllowed(p.parties_allowed ?? false);
        setMinAge(p.min_age != null ? String(p.min_age) : "");
        setAddress(p.address ?? "");
        setPhone(p.phone ?? "");
        setTimezone(p.timezone ?? "");
        setCheckInFrom(p.check_in_from ?? "");
        setCheckInUntil(p.check_in_until ?? "");
        setCheckOutFrom(p.check_out_from ?? "");
        setCheckOutUntil(p.check_out_until ?? "");
        const am = Array.isArray(p.amenities) ? p.amenities : [];
        setAmenities([...new Set(am.map((a) => (typeof a === "string" ? a : (a as { name?: string })?.name ?? "")).filter(Boolean))]);
        setImportantInfo(Array.isArray(p.important_info) ? p.important_info : []);
        setFaqs(Array.isArray(p.faqs) ? p.faqs : []);
        setPictures(p.pictures ?? []);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [propertyId]);

  function addAmenity() {
    const v = newAmenity.trim();
    if (v && !amenities.includes(v)) setAmenities([...amenities, v]);
    setNewAmenity("");
  }

  function addImportantInfo() {
    const v = newImportantInfo.trim();
    if (v) setImportantInfo([...importantInfo, v]);
    setNewImportantInfo("");
  }

  function addFaq() {
    const q = newFaqQ.trim();
    const a = newFaqA.trim();
    if (q && a) { setFaqs([...faqs, { question: q, answer: a }]); setNewFaqQ(""); setNewFaqA(""); }
  }

  useEffect(() => {
    let cancelled = false;
    adminApi.getProperties().then((res) => {
      if (cancelled) return;
      const rows = (res?.results ?? []).map((p) => ({ id: p.id, name: p.name || `Propiedad ${p.id}` }));
      setAllProperties(rows);
    }).catch(() => {
      if (!cancelled) setAllProperties([]);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDealsLoading(true);
    adminApi
      .getPropertyLoyaltyDeals(selectedDealLevel)
      .then((res) => {
        if (cancelled) return;
        setLevelDeals(res?.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setLevelDeals([]);
      })
      .finally(() => {
        if (!cancelled) setDealsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDealLevel]);

  function normalizeDealsForSave(deals: LoyaltyDealItem[]) {
    return deals.map((d, index) => ({
      property_id: d.property_id,
      order: index,
      discount_percent: Number(d.discount_percent) || 0,
    }));
  }

  async function saveLoyaltyDeals(nextDeals: LoyaltyDealItem[]) {
    setDealsSaving(true);
    try {
      const payload = normalizeDealsForSave(nextDeals);
      const res = await adminApi.putPropertyLoyaltyDeals(selectedDealLevel, payload);
      setLevelDeals(res?.results ?? []);
      addToast({ title: "Deals loyalty guardados", color: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudieron guardar los deals loyalty.";
      addToast({ title: "Error al guardar deals", description: msg, color: "danger" });
    } finally {
      setDealsSaving(false);
    }
  }

  function removeDeal(propertyId: number) {
    const nextDeals = levelDeals.filter((d) => d.property_id !== propertyId);
    void saveLoyaltyDeals(nextDeals);
  }

  function moveDeal(propertyId: number, direction: -1 | 1) {
    const idx = levelDeals.findIndex((d) => d.property_id === propertyId);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= levelDeals.length) return;
    const nextDeals = [...levelDeals];
    const temp = nextDeals[idx];
    nextDeals[idx] = nextDeals[swapIdx];
    nextDeals[swapIdx] = temp;
    void saveLoyaltyDeals(nextDeals);
  }

  function updateDealDiscount(propertyId: number, nextDiscount: string) {
    const numeric = Number(nextDiscount);
    if (!Number.isFinite(numeric)) return;
    const clamped = Math.max(0, Math.min(100, numeric));
    const nextDeals = levelDeals.map((d) =>
      d.property_id === propertyId ? { ...d, discount_percent: clamped } : d
    );
    setLevelDeals(nextDeals);
  }

  async function persistDealDiscount(propertyId: number) {
    const nextDeals = levelDeals.map((d) =>
      d.property_id === propertyId
        ? { ...d, discount_percent: Math.max(0, Math.min(100, Number(d.discount_percent) || 0)) }
        : d
    );
    await saveLoyaltyDeals(nextDeals);
  }

  function addCurrentPropertyDeal() {
    if (!property) return;
    if (levelDeals.some((d) => d.property_id === property.id)) return;
    const nextDiscountNum = Math.max(0, Math.min(100, Number(newDealDiscount) || 0));
    const nextDeals: LoyaltyDealItem[] = [
      ...levelDeals,
      {
        property_id: property.id,
        order: levelDeals.length,
        discount_percent: nextDiscountNum,
        property_name: property.name,
        city_name: property.city_name,
      },
    ];
    void saveLoyaltyDeals(nextDeals);
  }

  function addSelectedPropertyDeal() {
    const pid = Number(newDealPropertyId);
    if (!Number.isFinite(pid) || pid <= 0) return;
    if (levelDeals.some((d) => d.property_id === pid)) return;
    const selectedProp = allProperties.find((p) => p.id === pid);
    const nextDiscountNum = Math.max(0, Math.min(100, Number(newDealDiscount) || 0));
    const nextDeals: LoyaltyDealItem[] = [
      ...levelDeals,
      {
        property_id: pid,
        order: levelDeals.length,
        discount_percent: nextDiscountNum,
        property_name: selectedProp?.name ?? `Propiedad ${pid}`,
      },
    ];
    void saveLoyaltyDeals(nextDeals);
  }

  async function handleSave() {
    if (!canEditProperty || !property) return;
    setSaving(true);
    try {
      const updated = await adminApi.patchProperty(propertyId, {
        name,
        description: description || undefined,
        is_active,
        is_published,
        pets_allowed,
        smoking_allowed,
        children_allowed,
        parties_allowed,
        min_age: min_age !== "" ? Number(min_age) : null,
        address,
        phone,
        timezone,
        check_in_from: check_in_from || null,
        check_in_until: check_in_until || null,
        check_out_from: check_out_from || null,
        check_out_until: check_out_until || null,
        amenities,
        important_info: importantInfo,
        faqs,
      });
      setProperty(updated);
      router.refresh();
      addToast({ title: "Cambios guardados", color: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      addToast({ title: "Error al guardar", description: msg, color: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canEditProperty || !property) return;
    setDeleting(true);
    try {
      await adminApi.deleteProperty(propertyId);
      addToast({ title: "Propiedad eliminada", color: "success" });
      router.push("/admin/properties");
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al eliminar";
      addToast({ title: "Error al eliminar", description: msg, color: "danger" });
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  }

  if (loading) {
    return (
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
      </GlassCard>
    );
  }

  if (!property) {
    return (
      <GlassCard>
        <p className="text-white/70 font-sora">Propiedad no encontrada.</p>
      </GlassCard>
    );
  }

  const readOnly = !canEditProperty;

  const SaveButton = () => (
    <div className="flex gap-2 pt-2">
      <Button
        className="btn-newayzi-primary rounded-xl"
        onPress={handleSave}
        isLoading={saving}
        startContent={!saving ? <Icon icon="solar:diskette-outline" width={18} /> : undefined}
      >
        Guardar cambios
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          as={Link}
          href="/admin/properties"
          variant="flat"
          className="text-white/90 hover:bg-white/[0.1] border border-white/[0.15] rounded-xl font-medium bg-white/[0.06]"
          startContent={<Icon icon="solar:arrow-left-outline" width={18} />}
        >
          Volver
        </Button>
        {canEditProperty && (
          <Button
            variant="flat"
            color="danger"
            className="rounded-xl font-medium"
            startContent={<Icon icon="solar:trash-bin-trash-outline" width={18} />}
            onPress={() => setDeleteModalOpen(true)}
          >
            Eliminar propiedad
          </Button>
        )}
      </div>

      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen} placement="center">
        <ModalContent>
          <ModalHeader>Eliminar propiedad</ModalHeader>
          <ModalBody>
            <p>¿Estás seguro de que deseas eliminar la propiedad &quot;{property?.name}&quot;? Esta acción no se puede deshacer.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setDeleteModalOpen(false)}>Cancelar</Button>
            <Button color="danger" onPress={handleDelete} isLoading={deleting} startContent={!deleting ? <Icon icon="solar:trash-bin-trash-outline" width={18} /> : undefined}>
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── 1. Contenido principal ── */}
      <GlassCard>
        <SectionHeader icon="solar:buildings-2-bold-duotone" title="Información principal" subtitle="Nombre, descripción y amenidades del alojamiento." />
        <div className="flex flex-col gap-6">
          <Input
            label="Nombre"
            value={name}
            onValueChange={readOnly ? undefined : setName}
            fullWidth
            isReadOnly={readOnly}
            classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38", label: "!text-white/65" }}
          />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-sm font-semibold text-white/75 block font-sora">Descripción</label>
              {!readOnly && isDescriptionEmpty(description) && (
                <Button
                  size="sm"
                  variant="flat"
                  className="rounded-xl border border-[#5e2cec]/40 bg-[#5e2cec]/20 text-[#d4c4ff] font-medium"
                  isLoading={aiSuggesting}
                  startContent={!aiSuggesting ? <Icon icon="solar:magic-stick-3-bold-duotone" width={18} /> : undefined}
                  onPress={suggestDescriptionWithAi}
                >
                  Sugerir con IA
                </Button>
              )}
            </div>
            {isDescriptionEmpty(description) && (
              <p className="text-xs text-white/45 mb-2 font-sora">
                Si la propiedad viene sin texto del PMS, puedes generar un borrador según nombre, ciudad, tipo y amenidades (requiere{" "}
                <code className="text-white/55">OPENAI_API_KEY</code> en el servidor).
              </p>
            )}
            <RichTextEditor
              value={description}
              onChange={readOnly ? () => {} : setDescription}
              placeholder="Describe la propiedad, ubicación, servicios y características..."
              minHeight="220px"
              variant="dark"
              disabled={readOnly}
            />
          </div>

          {/* Amenidades */}
          <div>
            <label className="text-sm font-semibold text-white/75 mb-2 block font-sora">Amenidades</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {amenities.length === 0 && <span className="text-sm text-white/30 italic">Sin amenidades registradas</span>}
              {amenities.map((a, idx) => (
                <span key={`amenity-${idx}-${a}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2cec]/25 border border-[#5e2cec]/30 px-3 py-1.5 text-sm font-medium text-[#b89eff]">
                  {a}
                  {!readOnly && (
                    <button type="button" onClick={() => setAmenities(amenities.filter((x) => x !== a))} className="hover:bg-[#5e2cec]/30 rounded-full p-0.5 transition-colors text-white/80">
                      <Icon icon="solar:close-circle-outline" width={16} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  value={newAmenity}
                  onValueChange={setNewAmenity}
                  placeholder="WiFi, Aire acondicionado, Cocina..."
                  fullWidth
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())}
                  classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38" }}
                />
                <Button size="sm" className="btn-newayzi-primary rounded-xl" onPress={addAmenity}>Añadir</Button>
              </div>
            )}
          </div>

          {!readOnly && <SaveButton />}
        </div>
      </GlassCard>

      {/* ── 2. Visibilidad y estado ── */}
      <GlassCard>
        <SectionHeader icon="solar:eye-bold-duotone" title="Visibilidad" subtitle="Controla si el alojamiento está activo y visible en el buscador." iconBg="from-green-500/20 to-emerald-600/20" iconColor="text-emerald-400" />
        <div className="flex flex-wrap gap-8">
          <Switch isSelected={is_active} onValueChange={readOnly ? () => {} : setIsActive} color="primary" isDisabled={readOnly}>
            <span className="text-sm font-medium text-white/85 font-sora">Activo (sistema)</span>
          </Switch>
          <Switch isSelected={is_published} onValueChange={readOnly ? () => {} : setIsPublished} color="primary" isDisabled={readOnly}>
            <span className="text-sm font-medium text-white/85 font-sora">Publicado (visible en frontend)</span>
          </Switch>
        </div>
        {!readOnly && <div className="mt-5"><SaveButton /></div>}
      </GlassCard>

      {/* ── 3. Loyalty deals por nivel ── */}
      <GlassCard>
        <SectionHeader
          icon="solar:gift-bold-duotone"
          title="Loyalty deals por nivel"
          subtitle="Configura orden y descuento por nivel para recomendaciones y ofertas loyalty."
          iconBg="from-violet-500/20 to-fuchsia-600/20"
          iconColor="text-fuchsia-300"
        />
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-white/90"
              value={selectedDealLevel}
              onChange={(e) => setSelectedDealLevel(e.target.value as LoyaltyLevelValue)}
              disabled={dealsSaving || readOnly}
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="text-black">
                  {opt.label}
                </option>
              ))}
            </select>
            <Input
              label="Descuento (%)"
              type="number"
              min={0}
              max={100}
              value={newDealDiscount}
              onValueChange={setNewDealDiscount}
              isDisabled={dealsSaving || readOnly}
              classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
            />
            <Button
              className="btn-newayzi-primary rounded-xl"
              onPress={addCurrentPropertyDeal}
              isDisabled={dealsSaving || readOnly || !property}
              startContent={<Icon icon="solar:add-circle-bold-duotone" width={18} />}
            >
              Añadir esta propiedad al nivel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <select
              className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-white/90"
              value={newDealPropertyId}
              onChange={(e) => setNewDealPropertyId(e.target.value)}
              disabled={dealsSaving || readOnly}
            >
              <option value="" className="text-black">Selecciona otra propiedad…</option>
              {allProperties.map((p) => (
                <option key={p.id} value={p.id} className="text-black">
                  {p.name}
                </option>
              ))}
            </select>
            <Button
              variant="flat"
              className="rounded-xl border border-white/[0.12] bg-white/[0.06] text-white/90"
              onPress={addSelectedPropertyDeal}
              isDisabled={dealsSaving || readOnly || !newDealPropertyId}
            >
              Agregar seleccionada
            </Button>
          </div>

          {dealsLoading ? (
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Spinner size="sm" />
              Cargando deals loyalty…
            </div>
          ) : levelDeals.length === 0 ? (
            <p className="text-sm text-white/45">No hay deals configurados para este nivel.</p>
          ) : (
            <div className="space-y-2">
              {levelDeals.map((deal, idx) => (
                <div
                  key={`${deal.property_id}-${idx}`}
                  className="rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-2 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-2 items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/90 font-medium truncate">
                      #{idx + 1} · {deal.property_name || `Propiedad ${deal.property_id}`}
                    </p>
                    <p className="text-xs text-white/45">{deal.city_name || "—"} · ID {deal.property_id}</p>
                  </div>
                  <Input
                    label="Desc. %"
                    type="number"
                    min={0}
                    max={100}
                    value={String(deal.discount_percent ?? 0)}
                    onValueChange={(v) => updateDealDiscount(deal.property_id, v)}
                    onBlur={() => void persistDealDiscount(deal.property_id)}
                    isDisabled={dealsSaving || readOnly}
                    classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="flat"
                      className="rounded-lg border border-white/[0.12] bg-white/[0.05] text-white/85"
                      isDisabled={dealsSaving || readOnly || idx === 0}
                      onPress={() => moveDeal(deal.property_id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="rounded-lg border border-white/[0.12] bg-white/[0.05] text-white/85"
                      isDisabled={dealsSaving || readOnly || idx === levelDeals.length - 1}
                      onPress={() => moveDeal(deal.property_id, 1)}
                    >
                      ↓
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    className="rounded-lg"
                    isDisabled={dealsSaving || readOnly}
                    onPress={() => removeDeal(deal.property_id)}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── 4. Contacto y ubicación ── */}
      <GlassCard>
        <SectionHeader icon="solar:map-point-bold-duotone" title="Contacto y ubicación" subtitle="Dirección, teléfono, ciudad y zona horaria." iconBg="from-blue-500/20 to-cyan-600/20" iconColor="text-cyan-400" />

        {/* Datos de solo lectura */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
          <InfoRow label="Ciudad" value={property.city_name} />
          <InfoRow label="Tipo de propiedad" value={property.property_type} />
          <InfoRow label="Moneda" value={property.currency} />
          {property.location && (
            <InfoRow label="Coordenadas" value={`${property.location.lat.toFixed(5)}, ${property.location.lng.toFixed(5)}`} />
          )}
          {property.operator_name && <InfoRow label="Operador" value={property.operator_name} />}
          {property.pms_connections && property.pms_connections.length > 0 && (
            <div className="col-span-full flex flex-col gap-0.5">
              <span className="text-xs text-white/45 font-sora">Conexiones PMS</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {property.pms_connections.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-[#5e2cec]/20 border border-[#5e2cec]/25 px-3 py-1 text-xs text-[#b89eff]">
                    <Icon icon="solar:plug-circle-bold" width={12} />
                    {c.name} <span className="text-white/40">({c.pms_type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Datos editables */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Dirección"
            value={address}
            onValueChange={readOnly ? undefined : setAddress}
            isReadOnly={readOnly}
            fullWidth
            classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38", label: "!text-white/65" }}
          />
          <Input
            label="Teléfono de contacto"
            value={phone}
            onValueChange={readOnly ? undefined : setPhone}
            isReadOnly={readOnly}
            fullWidth
            classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38", label: "!text-white/65" }}
          />
          <Input
            label="Zona horaria"
            value={timezone}
            onValueChange={readOnly ? undefined : setTimezone}
            isReadOnly={readOnly}
            placeholder="America/Bogota"
            fullWidth
            className="sm:col-span-2"
            classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38", label: "!text-white/65" }}
          />
        </div>
        {!readOnly && <div className="mt-5"><SaveButton /></div>}
      </GlassCard>

      {/* ── 4. Horarios ── */}
      <GlassCard>
        <SectionHeader icon="solar:clock-circle-bold-duotone" title="Horarios de check-in / check-out" subtitle="Ventanas horarias para la llegada y salida de huéspedes." iconBg="from-amber-500/20 to-orange-500/20" iconColor="text-amber-400" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Check-in desde", value: check_in_from, set: setCheckInFrom },
            { label: "Check-in hasta", value: check_in_until, set: setCheckInUntil },
            { label: "Check-out desde", value: check_out_from, set: setCheckOutFrom },
            { label: "Check-out hasta", value: check_out_until, set: setCheckOutUntil },
          ].map(({ label, value, set }) => (
            <Input
              key={label}
              label={label}
              type="time"
              value={value ?? ""}
              onValueChange={readOnly ? undefined : set}
              isReadOnly={readOnly}
              fullWidth
              classNames={{ inputWrapper: inputDark, input: "!text-white/95", label: "!text-white/65" }}
            />
          ))}
        </div>
        {!readOnly && <div className="mt-5"><SaveButton /></div>}
      </GlassCard>

      {/* ── 5. Reglas del alojamiento ── */}
      <GlassCard>
        <SectionHeader icon="solar:list-check-bold-duotone" title="Reglas del alojamiento" subtitle="Normas y restricciones para los huéspedes." iconBg="from-rose-500/20 to-pink-600/20" iconColor="text-rose-400" />
        <div className="flex flex-wrap gap-8 mb-5">
          {[
            { label: "Mascotas permitidas", val: pets_allowed, set: setPetsAllowed, icon: "solar:cat-bold-duotone" },
            { label: "Se permite fumar", val: smoking_allowed, set: setSmokingAllowed, icon: "solar:danger-circle-bold-duotone" },
            { label: "Se permiten niños", val: children_allowed, set: setChildrenAllowed, icon: "solar:user-heart-bold-duotone" },
            { label: "Se permiten fiestas", val: parties_allowed, set: setPartiesAllowed, icon: "solar:confetti-bold-duotone" },
          ].map(({ label, val, set }) => (
            <Switch key={label} isSelected={val} onValueChange={readOnly ? () => {} : set} color="primary" isDisabled={readOnly}>
              <span className="text-sm font-medium text-white/85 font-sora">{label}</span>
            </Switch>
          ))}
        </div>
        <div className="max-w-[200px]">
          <Input
            label="Edad mínima"
            type="number"
            min={0}
            max={99}
            value={min_age}
            onValueChange={readOnly ? undefined : (v) => setMinAge(v.replace(/\D/g, ""))}
            isReadOnly={readOnly}
            placeholder="Sin restricción"
            description="Dejar vacío si no aplica"
            classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38", label: "!text-white/65", description: "text-white/40" }}
          />
        </div>
        {!readOnly && <div className="mt-5"><SaveButton /></div>}
      </GlassCard>

      {/* ── 6. Información importante ── */}
      <GlassCard>
        <SectionHeader icon="solar:info-circle-bold-duotone" title="Información importante" subtitle="Puntos clave que el huésped debe saber antes de llegar." iconBg="from-sky-500/20 to-blue-600/20" iconColor="text-sky-400" />
        <ul className="space-y-2 mb-4">
          {importantInfo.length === 0 && <li className="text-sm text-white/30 italic">Sin puntos registrados</li>}
          {importantInfo.map((item, i) => (
            <li key={i} className="flex items-start gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5">
              <Icon icon="solar:check-circle-bold-duotone" className="text-sky-400 flex-shrink-0 mt-0.5" width={16} />
              <span className="text-sm text-white/85 flex-1">{item}</span>
              {!readOnly && (
                <button onClick={() => setImportantInfo(importantInfo.filter((_, j) => j !== i))} className="text-white/30 hover:text-rose-400 transition-colors flex-shrink-0">
                  <Icon icon="solar:trash-bin-trash-bold" width={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {!readOnly && (
          <div className="flex gap-2">
            <Input
              value={newImportantInfo}
              onValueChange={setNewImportantInfo}
              placeholder="Ej: El acceso es mediante código de caja de seguridad..."
              fullWidth
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImportantInfo())}
              classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38" }}
            />
            <Button size="sm" className="btn-newayzi-primary rounded-xl" onPress={addImportantInfo}>Añadir</Button>
          </div>
        )}
        {!readOnly && <div className="mt-5"><SaveButton /></div>}
      </GlassCard>

      {/* ── 7. Preguntas frecuentes ── */}
      <GlassCard>
        <SectionHeader icon="solar:question-circle-bold-duotone" title="Preguntas frecuentes" subtitle="Respuestas a las dudas más comunes de los huéspedes." iconBg="from-violet-500/20 to-purple-600/20" iconColor="text-violet-400" />
        <div className="space-y-3 mb-4">
          {faqs.length === 0 && <p className="text-sm text-white/30 italic">Sin preguntas registradas</p>}
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white/90">{faq.question}</p>
                {!readOnly && (
                  <button onClick={() => setFaqs(faqs.filter((_, j) => j !== i))} className="text-white/30 hover:text-rose-400 transition-colors flex-shrink-0 mt-0.5">
                    <Icon icon="solar:trash-bin-trash-bold" width={15} />
                  </button>
                )}
              </div>
              <p className="text-sm text-white/60">{faq.answer}</p>
            </div>
          ))}
        </div>
        {!readOnly && (
          <div className="space-y-2">
            <Input
              value={newFaqQ}
              onValueChange={setNewFaqQ}
              placeholder="Pregunta..."
              fullWidth
              classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38" }}
            />
            <Textarea
              value={newFaqA}
              onValueChange={setNewFaqA}
              placeholder="Respuesta..."
              minRows={2}
              fullWidth
              classNames={{ inputWrapper: inputDark, input: "!text-white/95 placeholder:!text-white/38" }}
            />
            <Button size="sm" className="btn-newayzi-primary rounded-xl" onPress={addFaq} isDisabled={!newFaqQ.trim() || !newFaqA.trim()}>
              <Icon icon="solar:add-circle-bold" width={15} className="mr-1" />
              Añadir pregunta
            </Button>
          </div>
        )}
        {!readOnly && <div className="mt-5"><SaveButton /></div>}
      </GlassCard>

      {/* ── 8. Tipos de habitación ── */}
      {property.room_types?.length ? (
        <GlassCard>
          <SectionHeader
            icon="solar:bed-bold-duotone"
            title="Tipos de habitación"
            subtitle="Todos los tipos sincronizados; abre cada uno para editar texto, datos y galería."
            iconBg="from-teal-500/20 to-green-600/20"
            iconColor="text-teal-400"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {property.room_types.map((rt) => (
              <div
                key={rt.id}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] overflow-hidden flex flex-col"
              >
                <div className="aspect-video bg-white/[0.06] relative shrink-0">
                  {rt.primary_picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={normalizeImageUrl(rt.primary_picture_url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon icon="solar:bed-bold-duotone" className="text-4xl text-white/20" />
                    </div>
                  )}
                  {rt.pms && (
                    <span className="absolute top-2 left-2 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full bg-[#5e2cec]/85 text-white border border-white/20">
                      PMS
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2 min-w-0">
                  <div>
                    <h3 className="font-sora font-semibold text-white text-sm leading-snug">{rt.name}</h3>
                    <p className="text-[0.7rem] font-mono text-white/45 truncate">{rt.code}</p>
                  </div>
                  {rt.description_preview ? (
                    <p className="text-xs text-white/50 line-clamp-2">{rt.description_preview}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] text-white/55">
                    <span>Hasta {rt.max_occupancy} pers.</span>
                    {rt.physical_rooms_count != null && rt.physical_rooms_count > 0 && (
                      <span>{rt.physical_rooms_count} unidad{rt.physical_rooms_count !== 1 ? "es" : ""}</span>
                    )}
                    {rt.area_sqm != null && <span>{rt.area_sqm} m²</span>}
                    {rt.base_rates?.[0] && (
                      <span className="text-[#b89eff]">
                        {formatPmsMoney(rt.base_rates[0].price_per_night, rt.base_rates[0].currency)}/noche
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-3">
                    <Button
                      as={Link}
                      href={`/admin/properties/${propertyId}/room-types/${rt.id}`}
                      className="w-full font-semibold bg-[#5e2cec]/30 border border-[#5e2cec]/50 text-[#e8deff]"
                      size="sm"
                      startContent={<Icon icon="solar:pen-new-round-bold-duotone" width={18} />}
                    >
                      Ver y editar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/40">
            Las tarifas base se muestran como referencia; la sincronización PMS puede actualizarlas.
          </p>
        </GlassCard>
      ) : null}

      {/* ── Sincronización desde Booking.com ── */}
      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6">
        <SectionHeader
          icon="solar:bed-bold-duotone"
          title="Sincronizar desde Booking.com"
          subtitle="Fotos, descripciones y amenidades por tipo de habitación (emparejamiento automático)."
          iconBg="from-sky-500/20 to-blue-600/20"
          iconColor="text-sky-300"
        />
        <BookingComSyncPanel
          propertyId={propertyId}
          initialListingUrl={property.booking_com_listing_url}
          readOnly={readOnly}
          onRefresh={refreshProperty}
        />
      </div>

      {/* ── Inventario manual (sin PMS) ── */}
      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6">
        <SectionHeader
          icon="solar:database-bold-duotone"
          title="Inventario manual"
          subtitle="Excel de semanas y unidades físicas cuando no hay conexión PMS."
          iconBg="from-emerald-500/20 to-teal-500/20"
          iconColor="text-emerald-300"
        />
        <ManualInventoryPanel
          propertyId={propertyId}
          roomTypes={property.room_types ?? []}
          readOnly={readOnly}
          onRefresh={refreshProperty}
          restrictPricingToManualWeeks={property.restrict_pricing_to_manual_weeks ?? false}
          onRestrictPricingChange={async (v) => {
            const updated = await adminApi.patchProperty(propertyId, {
              restrict_pricing_to_manual_weeks: v,
            });
            setProperty(updated);
          }}
        />
      </div>

      {/* ── 9. Galería de imágenes ── */}
      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6">
        <SectionHeader
          icon="solar:gallery-bold-duotone"
          title="Galería de imágenes"
          subtitle={readOnly ? "Imágenes del alojamiento." : "Sube y gestiona las fotos. La imagen marcada como portada aparece primero."}
        />
        <PropertyGalleryPanel propertyId={propertyId} pictures={pictures} readOnly={readOnly} onPicturesChange={setPictures} />
      </div>

      {/* ── 10. Política de cancelación ── */}
      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6">
        <SectionHeader icon="solar:shield-minimalistic-bold-duotone" title="Política de Cancelación" subtitle="Reglas de reembolso vinculadas al contrato del operador." iconBg="from-orange-500/20 to-red-500/20" iconColor="text-orange-400" />
        <PropertyCancellationPolicyPanel propertyId={propertyId} readOnly={readOnly} />
      </div>
    </div>
  );
}

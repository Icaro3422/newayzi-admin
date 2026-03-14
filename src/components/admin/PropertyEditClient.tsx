"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Switch,
  Spinner,
  Textarea,
  addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type PropertyDetail, type PropertyPicture, type PropertyFaq } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";
import { useRouter, useParams } from "next/navigation";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { PropertyCancellationPolicyPanel } from "./PropertyCancellationPolicyPanel";
import { PropertyGalleryPanel } from "./PropertyGalleryPanel";

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
      <Button
        as={Link}
        href="/admin/properties"
        variant="flat"
        className="text-white/90 hover:bg-white/[0.1] border border-white/[0.15] rounded-xl font-medium bg-white/[0.06]"
        startContent={<Icon icon="solar:arrow-left-outline" width={18} />}
      >
        Volver
      </Button>

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
            <label className="text-sm font-semibold text-white/75 mb-2 block font-sora">Descripción</label>
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
              {amenities.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2cec]/25 border border-[#5e2cec]/30 px-3 py-1.5 text-sm font-medium text-[#b89eff]">
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

      {/* ── 3. Contacto y ubicación ── */}
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
          <SectionHeader icon="solar:bed-bold-duotone" title="Tipos de habitación" iconBg="from-teal-500/20 to-green-600/20" iconColor="text-teal-400" />
          <ul className="space-y-2">
            {property.room_types.map((rt) => (
              <li key={rt.id} className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-2.5 text-sm text-white/85 font-sora">
                <Icon icon="solar:bed-outline" className="text-teal-400 flex-shrink-0" width={18} />
                {rt.name}
                <span className="text-xs text-white/50 font-mono">({rt.code})</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-white/40">
            Los precios y descuentos por tipo de habitación se gestionan desde el backend.
          </p>
        </GlassCard>
      ) : null}

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

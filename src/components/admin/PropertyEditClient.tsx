"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Switch,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type PropertyDetail } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";
import { useRouter, useParams } from "next/navigation";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

/* ─── Primitivos (línea visual) ───────────────────────── */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

// Clases base que complementan los estilos globales en globals.css (.admin-panel)
const inputDark = "rounded-xl border";

export function PropertyEditClient() {
  const router = useRouter();
  const params = useParams();
  const propertyId = parseInt(String(params?.id ?? "0"), 10);
  const { canEditProperty } = useAdmin();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [is_active, setIsActive] = useState(true);
  const [is_published, setIsPublished] = useState(true);
  const [pets_allowed, setPetsAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");

  useEffect(() => {
    if (Number.isNaN(propertyId) || propertyId <= 0) {
      setLoading(false);
      return;
    }
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
        const am = Array.isArray(p.amenities) ? p.amenities : [];
        const parsed = am.map((a) => (typeof a === "string" ? a : (a as { name?: string })?.name ?? "")).filter(Boolean);
        setAmenities([...new Set(parsed)]);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const initial = property;

  function addAmenity() {
    const v = newAmenity.trim();
    if (v && !amenities.includes(v)) setAmenities([...amenities, v]);
    setNewAmenity("");
  }

  function removeAmenity(a: string) {
    setAmenities(amenities.filter((x) => x !== a));
  }

  async function handleSave() {
    if (!canEditProperty || !initial) return;
    setSaving(true);
    try {
      await adminApi.patchProperty(propertyId, {
        name,
        description: description || undefined,
        is_active,
        is_published,
        pets_allowed,
        amenities,
      });
        setProperty((prev) => prev ? { ...prev, name, description, is_active, is_published, pets_allowed, amenities } : null);
        router.refresh();
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
  if (!canEditProperty) {
    return (
      <GlassCard>
        <p className="text-white/70 font-sora">No tienes permiso para editar esta propiedad.</p>
      </GlassCard>
    );
  }

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

      <GlassCard>
        <div className="flex flex-col gap-6">
          <Input
            label="Nombre"
            value={name}
            onValueChange={setName}
            fullWidth
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95 placeholder:!text-white/38",
              label: "!text-white/65",
            }}
          />

          <div>
            <label className="text-sm font-semibold text-white/75 mb-2 block font-sora">
              Descripción
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Describe la propiedad, ubicación, servicios y características..."
              minHeight="220px"
              variant="dark"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/75 mb-2 block font-sora">
              Amenidades
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {amenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2cec]/25 border border-[#5e2cec]/30 px-3 py-1.5 text-sm font-medium text-[#b89eff]"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => removeAmenity(a)}
                    className="hover:bg-[#5e2cec]/30 rounded-full p-0.5 transition-colors text-white/80"
                    aria-label="Quitar"
                  >
                    <Icon icon="solar:close-circle-outline" width={16} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAmenity}
                onValueChange={setNewAmenity}
                placeholder="WiFi, Aire acondicionado, Cocina..."
                fullWidth
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())}
                classNames={{
                  inputWrapper: inputDark,
                  input: "!text-white/95 placeholder:!text-white/38",
                }}
              />
              <Button
                size="sm"
                className="btn-newayzi-primary rounded-xl"
                onPress={addAmenity}
              >
                Añadir
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 pt-2">
            <Switch
              isSelected={is_active}
              onValueChange={setIsActive}
              color="primary"
            >
              <span className="text-sm font-medium text-white/85 font-sora">
                Activo (sistema)
              </span>
            </Switch>
            <Switch
              isSelected={is_published}
              onValueChange={setIsPublished}
              color="primary"
            >
              <span className="text-sm font-medium text-white/85 font-sora">
                Publicado (visible en frontend)
              </span>
            </Switch>
            <Switch
              isSelected={pets_allowed}
              onValueChange={setPetsAllowed}
              color="primary"
            >
              <span className="text-sm font-medium text-white/85 font-sora">
                Mascotas permitidas
              </span>
            </Switch>
          </div>

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
        </div>
      </GlassCard>

      {property.room_types?.length ? (
        <GlassCard>
          <h3 className="font-sora text-lg font-bold text-white mb-3">
            Tipos de habitación
          </h3>
          <ul className="space-y-2">
            {property.room_types.map((rt) => (
              <li
                key={rt.id}
                className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-2.5 text-sm text-white/85 font-sora"
              >
                <Icon icon="solar:bed-outline" className="text-[#9b74ff] flex-shrink-0" width={18} />
                {rt.name}
                <span className="text-xs text-white/50 font-mono">({rt.code})</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-white/50">
            Los precios por temporada y descuentos por estancia se gestionan desde el backend (RoomTypeBaseRate, DynamicPricingRule, LengthOfStayDiscount).
          </p>
        </GlassCard>
      ) : null}
    </div>
  );
}

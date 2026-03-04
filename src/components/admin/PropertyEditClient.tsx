"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
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
      <div className="flex justify-center py-12">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }
  const CARD_STYLE =
    "border border-gray-200/60 rounded-[28px] shadow-md bg-white/90 backdrop-blur-sm hover:shadow-lg transition-shadow duration-300";

  if (!property) {
    return (
      <Card className={CARD_STYLE}>
        <CardBody>
          <p className="text-gray-500 font-sora">Propiedad no encontrada.</p>
        </CardBody>
      </Card>
    );
  }
  if (!canEditProperty) {
    return (
      <Card className={CARD_STYLE}>
        <CardBody>
          <p className="text-gray-500 font-sora">No tienes permiso para editar esta propiedad.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        as={Link}
        href="/admin/properties"
        variant="flat"
        className="text-newayzi-jet hover:bg-gray-100 border border-gray-200/60 rounded-xl font-medium"
        startContent={<Icon icon="solar:arrow-left-outline" width={18} />}
      >
        Volver
      </Button>

      <Card className={CARD_STYLE}>
        <CardBody className="gap-6 p-6">
          <Input
            label="Nombre"
            value={name}
            onValueChange={setName}
            fullWidth
            classNames={{
              inputWrapper: "rounded-xl border-gray-200/80",
            }}
          />

          <div>
            <label className="text-sm font-semibold text-newayzi-jet mb-2 block font-sora">
              Descripción
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Describe la propiedad, ubicación, servicios y características..."
              minHeight="220px"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-newayzi-jet mb-2 block font-sora">
              Amenidades
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {amenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-newayzi-han-purple/15 to-newayzi-majorelle/10 border border-newayzi-majorelle/20 px-3 py-1.5 text-sm font-medium text-newayzi-jet"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => removeAmenity(a)}
                    className="hover:bg-newayzi-majorelle/20 rounded-full p-0.5 transition-colors"
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
                  inputWrapper: "rounded-xl border-gray-200/80",
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
              <span className="text-sm font-medium text-newayzi-jet font-sora">
                Activo (sistema)
              </span>
            </Switch>
            <Switch
              isSelected={is_published}
              onValueChange={setIsPublished}
              color="primary"
            >
              <span className="text-sm font-medium text-newayzi-jet font-sora">
                Publicado (visible en frontend)
              </span>
            </Switch>
            <Switch
              isSelected={pets_allowed}
              onValueChange={setPetsAllowed}
              color="primary"
            >
              <span className="text-sm font-medium text-newayzi-jet font-sora">
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
        </CardBody>
      </Card>

      {property.room_types?.length ? (
        <Card className={CARD_STYLE}>
          <CardBody className="p-6">
            <h3 className="font-sora text-lg font-bold text-newayzi-jet mb-3">
              Tipos de habitación
            </h3>
            <ul className="space-y-2">
              {property.room_types.map((rt) => (
                <li
                  key={rt.id}
                  className="flex items-center gap-2 rounded-xl bg-gray-50/80 border border-gray-200/50 px-4 py-2.5 text-sm text-newayzi-jet font-sora"
                >
                  <Icon icon="solar:bed-outline" className="text-newayzi-majorelle flex-shrink-0" width={18} />
                  {rt.name}
                  <span className="text-xs text-gray-500 font-mono">({rt.code})</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              Los precios por temporada y descuentos por estancia se gestionan desde el backend (RoomTypeBaseRate, DynamicPricingRule, LengthOfStayDiscount).
            </p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

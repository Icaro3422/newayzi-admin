"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Switch,
  Spinner,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type PropertyDetail } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";
import { useRouter, useParams } from "next/navigation";

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
  if (!property) {
    return (
      <Card className="border border-semantic-surface-border">
        <CardBody>
          <p className="text-semantic-text-muted">Propiedad no encontrada.</p>
        </CardBody>
      </Card>
    );
  }
  if (!canEditProperty) {
    return (
      <Card className="border border-semantic-surface-border">
        <CardBody>
          <p className="text-semantic-text-muted">No tienes permiso para editar esta propiedad.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button as={Link} href="/admin/properties" variant="flat" startContent={<Icon icon="solar:arrow-left-outline" width={18} />}>
          Volver
        </Button>
      </div>
      <Card className="border border-semantic-surface-border">
        <CardBody className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onValueChange={setName}
            fullWidth
          />
          <Textarea
            label="Descripción"
            value={description}
            onValueChange={setDescription}
            minRows={3}
            fullWidth
          />
          <div>
            <label className="text-sm font-medium text-default-700 mb-2 block">Amenidades</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {amenities.map((a) => (
                <Chip key={a} onClose={() => removeAmenity(a)} variant="flat" size="sm">
                  {a}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAmenity}
                onValueChange={setNewAmenity}
                placeholder="WiFi, Aire acondicionado, Cocina..."
                fullWidth
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())}
              />
              <Button size="sm" variant="flat" onPress={addAmenity}>
                Añadir
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <Switch isSelected={is_active} onValueChange={setIsActive}>
              Activo (sistema)
            </Switch>
            <Switch isSelected={is_published} onValueChange={setIsPublished}>
              Publicado (visible en frontend)
            </Switch>
            <Switch isSelected={pets_allowed} onValueChange={setPetsAllowed}>
              Mascotas permitidas
            </Switch>
          </div>
          <div className="flex gap-2 pt-2">
            <Button color="primary" onPress={handleSave} isLoading={saving} startContent={!saving ? <Icon icon="solar:diskette-outline" width={18} /> : undefined}>
              Guardar cambios
            </Button>
          </div>
        </CardBody>
      </Card>
      {property.room_types?.length ? (
        <Card className="border border-semantic-surface-border">
          <CardBody>
            <h3 className="font-sora font-medium text-newayzi-jet mb-2">Tipos de habitación</h3>
            <ul className="list-disc list-inside text-sm text-semantic-text-muted">
              {property.room_types.map((rt) => (
                <li key={rt.id}>{rt.name} ({rt.code})</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-semantic-text-muted">
              Los precios por temporada y descuentos por estancia se gestionan desde el backend (RoomTypeBaseRate, DynamicPricingRule, LengthOfStayDiscount).
            </p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Textarea,
  addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  adminApi,
  type AdminCitySearchRow,
  type AdminRole,
  type Operator,
} from "@/lib/admin-api";

const inputDark = "rounded-xl border";

const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Casa" },
  { value: "villa", label: "Villa" },
  { value: "resort", label: "Resort" },
];

const CURRENCIES = ["COP", "USD", "EUR", "MXN", "CLP", "BRL"] as const;

const TIMEZONES = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Santiago",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
] as const;

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  role: AdminRole | null;
};

export function CreatePropertyModal({ isOpen, onOpenChange, role }: Props) {
  const router = useRouter();
  const needsOperator = role === "super_admin" || role === "comercial";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<AdminCitySearchRow[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [pickedCity, setPickedCity] = useState<AdminCitySearchRow | null>(null);
  const [timezone, setTimezone] = useState<string>("America/Bogota");
  const [currency, setCurrency] = useState<string>("COP");
  const [propertyType, setPropertyType] = useState<string>("hotel");
  const [operatorId, setOperatorId] = useState<string>("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setName("");
    setDescription("");
    setCityQuery("");
    setCityResults([]);
    setPickedCity(null);
    setTimezone("America/Bogota");
    setCurrency("COP");
    setPropertyType("hotel");
    setOperatorId("");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }
    if (needsOperator) {
      setLoadingOps(true);
      adminApi
        .getOperators()
        .then((r) => setOperators((r?.results ?? []).filter((o) => o.is_active)))
        .catch(() => setOperators([]))
        .finally(() => setLoadingOps(false));
    }
  }, [isOpen, needsOperator, reset]);

  useEffect(() => {
    if (!isOpen || pickedCity) {
      return;
    }
    const q = cityQuery.trim();
    if (q.length < 2) {
      setCityResults([]);
      return;
    }
    const t = setTimeout(() => {
      setCityLoading(true);
      adminApi
        .searchAdminCities(q)
        .then((res) => setCityResults(res?.results ?? []))
        .catch(() => setCityResults([]))
        .finally(() => setCityLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [cityQuery, isOpen, pickedCity]);

  async function handleSubmit() {
    const n = name.trim();
    if (n.length < 2) {
      addToast({ title: "Indica el nombre del alojamiento", color: "warning" });
      return;
    }
    if (!pickedCity) {
      addToast({ title: "Busca y selecciona una ciudad", color: "warning" });
      return;
    }
    if (needsOperator) {
      const oid = parseInt(operatorId, 10);
      if (!Number.isFinite(oid)) {
        addToast({ title: "Selecciona un operador", color: "warning" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const created = await adminApi.createProperty({
        name: n,
        city_id: pickedCity.id,
        timezone,
        currency,
        property_type: propertyType,
        description: description.trim() || undefined,
        ...(needsOperator ? { operator_id: parseInt(operatorId, 10) } : {}),
      });
      addToast({
        title: "Propiedad creada",
        description: "Puedes cargar inventario manual y fotos en la ficha.",
        color: "success",
      });
      onOpenChange(false);
      router.push(`/admin/properties/${created.id}`);
    } catch (e) {
      addToast({
        title: "No se pudo crear",
        description: e instanceof Error ? e.message : "Error desconocido",
        color: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
      scrollBehavior="inside"
      classNames={{ base: "bg-[#0f1220] border border-white/[0.1]" }}
    >
      <ModalContent>
        <ModalHeader className="text-white font-sora flex flex-col gap-1">
          <span>Nueva propiedad (manual)</span>
          <span className="text-xs font-normal text-white/45 font-sans">
            Sin PMS: luego usa Inventario manual en la ficha para el Excel de semanas y la galería para fotos.
          </span>
        </ModalHeader>
        <ModalBody className="gap-4">
          {needsOperator && (
            <div>
              {loadingOps ? (
                <Spinner size="sm" />
              ) : (
                <Select
                  label="Operador"
                  placeholder="Asignar a operador"
                  selectedKeys={operatorId ? [operatorId] : []}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0];
                    setOperatorId(v != null ? String(v) : "");
                  }}
                  classNames={{
                    trigger: inputDark,
                    label: "!text-white/65",
                    value: "!text-white/92",
                    popoverContent: "bg-[#0f1220] border border-white/[0.1]",
                  }}
                >
                  {operators.map((o) => (
                    <SelectItem key={String(o.id)} className="text-white">
                      {o.name}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </div>
          )}

          <Input
            label="Nombre del alojamiento"
            placeholder="Ej. Hotel Santa Clara"
            value={name}
            onValueChange={setName}
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95",
              label: "!text-white/65",
            }}
          />

          <div className="space-y-2">
            <p className="text-xs text-white/50">Ciudad</p>
            {pickedCity ? (
              <div className="flex items-center gap-2 flex-wrap rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <Icon icon="solar:map-point-bold-duotone" className="text-emerald-400 shrink-0" width={20} />
                <span className="text-sm text-white/90 flex-1">
                  {pickedCity.name}
                  {pickedCity.country_name ? (
                    <span className="text-white/50"> · {pickedCity.country_name}</span>
                  ) : null}
                </span>
                <Button
                  size="sm"
                  variant="light"
                  className="!text-white/60"
                  onPress={() => {
                    setPickedCity(null);
                    setCityQuery("");
                    setCityResults([]);
                  }}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Escribe al menos 2 letras para buscar"
                  value={cityQuery}
                  onValueChange={setCityQuery}
                  startContent={<Icon icon="solar:magnifer-bold-duotone" className="text-white/35" width={18} />}
                  classNames={{
                    inputWrapper: inputDark,
                    input: "!text-white/95",
                  }}
                />
                {cityLoading && (
                  <div className="flex justify-center py-2">
                    <Spinner size="sm" />
                  </div>
                )}
                {!cityLoading && cityResults.length > 0 && (
                  <ul className="max-h-44 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/30 divide-y divide-white/[0.06]">
                    {cityResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm text-white/85 hover:bg-white/[0.06] transition-colors"
                          onClick={() => {
                            setPickedCity(c);
                            setCityQuery("");
                            setCityResults([]);
                          }}
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.country_name ? (
                            <span className="text-white/45"> — {c.country_name}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Zona horaria"
              selectedKeys={[timezone]}
              onSelectionChange={(s) => {
                const v = Array.from(s)[0];
                if (v) setTimezone(String(v));
              }}
              classNames={{
                trigger: inputDark,
                label: "!text-white/65",
                value: "!text-white/92",
                popoverContent: "bg-[#0f1220] border border-white/[0.1]",
              }}
            >
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} className="text-white">
                  {tz}
                </SelectItem>
              ))}
            </Select>
            <Select
              label="Moneda"
              selectedKeys={[currency]}
              onSelectionChange={(s) => {
                const v = Array.from(s)[0];
                if (v) setCurrency(String(v));
              }}
              classNames={{
                trigger: inputDark,
                label: "!text-white/65",
                value: "!text-white/92",
                popoverContent: "bg-[#0f1220] border border-white/[0.1]",
              }}
            >
              {CURRENCIES.map((c) => (
                <SelectItem key={c} className="text-white">
                  {c}
                </SelectItem>
              ))}
            </Select>
          </div>

          <Select
            label="Tipo de alojamiento"
            selectedKeys={[propertyType]}
            onSelectionChange={(s) => {
              const v = Array.from(s)[0];
              if (v) setPropertyType(String(v));
            }}
            classNames={{
              trigger: inputDark,
              label: "!text-white/65",
              value: "!text-white/92",
              popoverContent: "bg-[#0f1220] border border-white/[0.1]",
            }}
          >
            {PROPERTY_TYPES.map((pt) => (
              <SelectItem key={pt.value} className="text-white">
                {pt.label}
              </SelectItem>
            ))}
          </Select>

          <Textarea
            label="Descripción (opcional)"
            minRows={2}
            value={description}
            onValueChange={setDescription}
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95",
              label: "!text-white/65",
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" className="!text-white/70" onPress={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="btn-newayzi-primary"
            isLoading={submitting}
            onPress={handleSubmit}
          >
            Crear y abrir ficha
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

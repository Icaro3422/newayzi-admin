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

/** Alineado con ConnectionCreateButton / globals `.admin-modal-dark` */
const inputDark = "rounded-xl border border-white/[0.12] bg-white/[0.06] shadow-none";

const modalClassNames = {
  base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/50 max-h-[90vh] overflow-hidden flex flex-col",
  header: "border-b border-white/[0.08] !text-white shrink-0 flex flex-col gap-1 !py-5 !px-6",
  body: "!text-white/95 !bg-transparent overflow-y-auto !px-6 !py-5 gap-5",
  footer: "border-t border-white/[0.08] !bg-transparent gap-3 shrink-0 !px-6 !py-4",
  closeButton:
    "!text-white/70 hover:!bg-white/10 hover:!text-white rounded-xl top-4 right-4",
  backdrop: "!bg-black/70 backdrop-blur-md",
  wrapper: "!bg-transparent",
};

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

const fieldClassNames = {
  inputWrapper: inputDark,
  input: "!text-white/95 placeholder:!text-white/38",
  label: "!text-white/70 font-medium",
};

const selectClassNames = {
  trigger: inputDark,
  label: "!text-white/70 font-medium",
  value: "!text-white/92 font-medium",
  innerWrapper: "!text-white",
  selectorIcon: "!text-white/50",
  popoverContent: "bg-[#0f1220] border border-white/[0.12] rounded-xl",
};

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
      backdrop="blur"
      classNames={modalClassNames}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-start gap-3 w-full pr-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5e2cec]/35 to-[#9430cf]/25 border border-white/[0.12] flex items-center justify-center shrink-0">
              <Icon icon="solar:buildings-2-bold-duotone" className="text-[#b89eff] text-xl" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-sora font-bold text-lg text-white tracking-tight">Nueva propiedad (manual)</h2>
              <p className="text-[0.8125rem] text-white/50 mt-1.5 leading-relaxed">
                Sin PMS: en la ficha usa <span className="text-emerald-300/90">Inventario manual</span> para el Excel
                de semanas y la galería para fotos.
              </p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {needsOperator && (
            <div>
              {loadingOps ? (
                <div className="flex items-center gap-2 text-white/50 text-sm py-2">
                  <Spinner size="sm" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#9b74ff]" }} />
                  Cargando operadores…
                </div>
              ) : (
                <Select
                  label="Operador"
                  placeholder="Asignar a operador"
                  selectedKeys={operatorId ? [operatorId] : []}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0];
                    setOperatorId(v != null ? String(v) : "");
                  }}
                  classNames={selectClassNames}
                >
                  {operators.map((o) => (
                    <SelectItem key={String(o.id)} className="text-white data-[hover=true]:bg-white/10">
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
            classNames={fieldClassNames}
          />

          <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Icon icon="solar:map-point-bold-duotone" className="text-[#9b74ff] shrink-0" width={18} />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/45">Ubicación</span>
            </div>
            {pickedCity ? (
              <div className="flex items-center gap-2 flex-wrap rounded-xl border border-emerald-500/35 bg-emerald-500/[0.12] px-3 py-2.5">
                <Icon icon="solar:check-circle-bold-duotone" className="text-emerald-400 shrink-0" width={20} />
                <span className="text-sm text-white/90 flex-1">
                  {pickedCity.name}
                  {pickedCity.country_name ? (
                    <span className="text-white/45"> · {pickedCity.country_name}</span>
                  ) : null}
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  className="!text-white/85 bg-white/[0.08] border border-white/[0.12]"
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
                  label="Buscar ciudad"
                  placeholder="Escribe al menos 2 letras"
                  value={cityQuery}
                  onValueChange={setCityQuery}
                  startContent={<Icon icon="solar:magnifer-bold-duotone" className="text-white/40" width={18} />}
                  classNames={fieldClassNames}
                />
                {cityLoading && (
                  <div className="flex justify-center py-2">
                    <Spinner
                      size="sm"
                      classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#9b74ff]" }}
                    />
                  </div>
                )}
                {!cityLoading && cityResults.length > 0 && (
                  <ul className="max-h-44 overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0a0c14] divide-y divide-white/[0.06]">
                    {cityResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm text-white/88 hover:bg-[#5e2cec]/15 transition-colors"
                          onClick={() => {
                            setPickedCity(c);
                            setCityQuery("");
                            setCityResults([]);
                          }}
                        >
                          <span className="font-medium text-white">{c.name}</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Zona horaria"
              selectedKeys={[timezone]}
              onSelectionChange={(s) => {
                const v = Array.from(s)[0];
                if (v) setTimezone(String(v));
              }}
              classNames={selectClassNames}
            >
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} className="text-white data-[hover=true]:bg-white/10">
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
              classNames={selectClassNames}
            >
              {CURRENCIES.map((c) => (
                <SelectItem key={c} className="text-white data-[hover=true]:bg-white/10">
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
            classNames={selectClassNames}
          >
            {PROPERTY_TYPES.map((pt) => (
              <SelectItem key={pt.value} className="text-white data-[hover=true]:bg-white/10">
                {pt.label}
              </SelectItem>
            ))}
          </Select>

          <Textarea
            label="Descripción (opcional)"
            minRows={3}
            value={description}
            onValueChange={setDescription}
            placeholder="Breve descripción para la ficha; puedes ampliarla después."
            classNames={{
              ...fieldClassNames,
              input: "!text-white/95 placeholder:!text-white/35 min-h-[88px]",
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            onPress={() => onOpenChange(false)}
            className="!text-white/85 hover:bg-white/[0.12] bg-white/[0.08] border border-white/[0.14]"
          >
            Cancelar
          </Button>
          <Button className="btn-newayzi-primary font-semibold" isLoading={submitting} onPress={handleSubmit}>
            Crear y abrir ficha
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

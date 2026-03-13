"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/react";
import { adminApi, type PMSConnectionType, type Operator } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

const inputDark = "rounded-xl border";

const PMS_ICONS: Record<string, string> = {
  kunas: "solar:buildings-bold-duotone",
  cloudbeds: "solar:cloud-bold-duotone",
  stays: "solar:home-smile-bold-duotone",
  generic: "solar:link-circle-bold-duotone",
};

const PMS_DESCRIPTIONS: Record<string, string> = {
  kunas: "OTASync — integración directa con Kunas",
  cloudbeds: "Plataforma de gestión hotelera CloudBeds",
  stays: "Sistema de reservas Stays",
  generic: "Cualquier PMS vía API genérica (Booking, OTAs propias, etc.)",
};

/** Campos de credenciales requeridos por cada tipo de PMS */
const PMS_CONFIG_FIELDS: Record<
  string,
  { key: string; label: string; type?: string; required?: boolean; placeholder?: string; description?: string }[]
> = {
  kunas: [
    { key: "token", label: "Token OTASync", required: true, placeholder: "Tu token de OTASync" },
    { key: "key", label: "Key OTASync", required: true, placeholder: "Tu key de OTASync", type: "password" },
    { key: "id_properties", label: "ID de propiedades", required: true, placeholder: "Ej: 12345", description: "ID de la propiedad en Kunas/OTASync" },
  ],
  cloudbeds: [
    { key: "api_key", label: "API Key / Access Token", required: true, placeholder: "Token de CloudBeds", type: "password", description: "Obtén tu token en CloudBeds API" },
    { key: "property_id", label: "Property ID (opcional)", required: false, placeholder: "ID del hotel en CloudBeds" },
  ],
  stays: [
    { key: "base_url", label: "URL de la API", required: true, placeholder: "https://partner.stays.net", type: "url", description: "URL base del endpoint Stays" },
    { key: "username", label: "Usuario", required: true, placeholder: "Email o usuario API" },
    { key: "password", label: "Contraseña", required: true, placeholder: "Contraseña API", type: "password" },
  ],
  generic: [
    { key: "base_url", label: "URL de la API", required: true, placeholder: "https://api.ejemplo.com", type: "url" },
    { key: "username", label: "Usuario", required: true, placeholder: "Usuario o API key" },
    { key: "password", label: "Contraseña", required: true, placeholder: "Contraseña o API secret", type: "password" },
  ],
};

export function ConnectionCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess, role } = useAdmin();
  const isOperador = role === "operador";

  const [open, setOpen] = useState(false);
  // Para operador: paso 1 = catálogo, paso 2 = credenciales
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [pmsType, setPmsType] = useState("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [connectionTypes, setConnectionTypes] = useState<PMSConnectionType[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    if (open) {
      adminApi.getConnectionTypes().then((r) => setConnectionTypes(r?.results ?? []));
      if (!isOperador) {
        adminApi.getOperators().then((r) => setOperators(r?.results ?? []));
      }
    }
  }, [open, isOperador]);

  const selectedType = connectionTypes.find((t) => t.code === pmsType);

  function resetForm() {
    setName("");
    setPmsType("");
    setOperatorId("");
    setConfigValues({});
    setStep(1);
  }

  const fields = PMS_CONFIG_FIELDS[pmsType] ?? [];
  const allRequiredFilled = fields
    .filter((f) => f.required)
    .every((f) => (configValues[f.key] ?? "").trim());

  if (!canAccess("connections")) return null;

  async function handleCreate() {
    if (!pmsType.trim()) return;
    if (!allRequiredFilled) return;

    setSaving(true);
    try {
      const config: Record<string, string> = {};
      for (const f of fields) {
        const v = (configValues[f.key] ?? "").trim();
        if (v) config[f.key] = v;
      }
      // CloudBeds acepta api_key o access_token
      if (pmsType === "cloudbeds" && config.api_key) {
        config.access_token = config.api_key;
      }

      const payload = {
        name: name.trim() || undefined,
        pms_type: pmsType.trim(),
        operator_id: operatorId && operatorId !== "none" ? parseInt(operatorId, 10) : undefined,
        config: Object.keys(config).length ? config : undefined,
      };
      await adminApi.createConnection(payload);
      setOpen(false);
      resetForm();
      onCreated?.();
      addToast({
        title: "Conexión creada",
        description: "La conexión PMS se creó correctamente.",
        color: "success",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al crear la conexión.";
      let detail = msg.replace(/^API \d+:\s*/, "");
      try {
        const parsed = JSON.parse(detail);
        if (typeof parsed?.detail === "string") detail = parsed.detail;
      } catch {
        const m = detail.match(/"detail"\s*:\s*"([^"]+)"/);
        if (m) detail = m[1];
      }
      addToast({
        title: "Error al crear conexión",
        description: detail || "Revisa los campos e intenta de nuevo.",
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = pmsType.trim() && allRequiredFilled;

  const modalClassNames = {
    base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/50 max-h-[90vh] overflow-hidden flex flex-col",
    header: "border-b border-white/[0.08] !text-white font-sora font-bold text-lg shrink-0",
    body: "!text-white/95 !bg-transparent overflow-y-auto",
    footer: "border-t border-white/[0.08] !bg-transparent gap-2 shrink-0",
    closeButton: "!text-white/90 hover:!bg-white/10 hover:!text-white rounded-full",
    backdrop: "!bg-black/70 backdrop-blur-md",
    wrapper: "!bg-transparent",
  };

  return (
    <>
      <Button
        className="btn-newayzi-primary"
        onPress={() => setOpen(true)}
        startContent={<Icon icon="solar:add-circle-outline" width={20} />}
      >
        Nueva conexión
      </Button>

      <Modal
        isOpen={open}
        onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}
        size="2xl"
        backdrop="blur"
        classNames={modalClassNames}
      >
        <ModalContent>
          {/* ── PASO 1 (solo operador): Catálogo de PMS disponibles ── */}
          {isOperador && step === 1 ? (
            <>
              <ModalHeader>Conectar un PMS</ModalHeader>
              <ModalBody className="space-y-3">
                <p className="text-white/60 text-[0.82rem]">
                  Elige el sistema de gestión (PMS) que utilizas. Solo verás los tipos disponibles en Newayzi — tus credenciales son propias y nunca se comparten con otros operadores.
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {connectionTypes.map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => { setPmsType(t.code); setStep(2); }}
                      className="flex items-center gap-4 rounded-2xl border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.10] hover:border-[#9b74ff]/50 transition-all px-4 py-3.5 text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#5e2cec]/20 flex items-center justify-center shrink-0 group-hover:bg-[#5e2cec]/35 transition-colors">
                        <Icon
                          icon={PMS_ICONS[t.code] ?? "solar:link-circle-bold-duotone"}
                          className="text-[#9b74ff] text-xl"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sora font-bold text-white text-sm leading-tight">{t.label}</p>
                        <p className="text-white/50 text-[0.72rem] mt-0.5 truncate">
                          {PMS_DESCRIPTIONS[t.code] ?? t.label}
                        </p>
                      </div>
                      {(t.operator_count ?? 0) > 0 && (
                        <span className="shrink-0 text-[0.65rem] text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
                          {t.operator_count} {t.operator_count === 1 ? "operador" : "operadores"} en Newayzi
                        </span>
                      )}
                      <Icon icon="solar:arrow-right-bold" className="text-white/25 text-sm group-hover:text-[#9b74ff] transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  onPress={() => { setOpen(false); resetForm(); }}
                  className="!text-white hover:bg-white/[0.12] bg-white/[0.1] border border-white/[0.2]"
                >
                  Cancelar
                </Button>
              </ModalFooter>
            </>
          ) : (
            /* ── PASO 2 (todos) o flujo único (super_admin): Formulario de credenciales ── */
            <>
              <ModalHeader>
                <div className="flex items-center gap-3">
                  {isOperador && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <Icon icon="solar:arrow-left-bold" className="text-white/70 text-sm" />
                    </button>
                  )}
                  <span>
                    {isOperador && selectedType
                      ? `Conectar ${selectedType.label}`
                      : "Nueva conexión PMS"}
                  </span>
                </div>
              </ModalHeader>
              <ModalBody className="space-y-4">
                {/* Selector de tipo — solo visible para super_admin (operador ya eligió en paso 1) */}
                {!isOperador && (
                  <Select
                    label="Tipo de conexión"
                    selectedKeys={pmsType ? [pmsType] : []}
                    onSelectionChange={(s) => setPmsType(Array.from(s)[0] as string ?? "")}
                    isRequired
                    items={connectionTypes}
                    description={
                      pmsType === "generic"
                        ? "API genérica: integra cualquier PMS con URL, usuario y contraseña (Booking, OTAs, etc.)"
                        : undefined
                    }
                    classNames={{
                      trigger: inputDark,
                      label: "!text-white/70",
                      value: "!text-white/92 font-medium",
                      innerWrapper: "!text-white",
                      selectorIcon: "!text-white/50",
                      description: "!text-white/50",
                      popoverContent: "bg-[#0f1220] border border-white/[0.1]",
                    }}
                  >
                    {(item) => <SelectItem key={item.code} className="text-white">{item.label}</SelectItem>}
                  </Select>
                )}

                {/* Credenciales según tipo de PMS */}
                {fields.length > 0 && (
                  <div className="rounded-xl border border-white/[0.1] bg-white/[0.05] p-4 space-y-4">
                    <p className="text-sm font-medium text-white/80">
                      Credenciales {selectedType ? `para ${selectedType.label}` : "de la API"}
                    </p>
                    {fields.map((f) => (
                      <Input
                        key={f.key}
                        label={f.label}
                        placeholder={f.placeholder}
                        value={configValues[f.key] ?? ""}
                        onValueChange={(v) => setConfigValues((prev) => ({ ...prev, [f.key]: v }))}
                        isRequired={f.required}
                        type={f.type ?? "text"}
                        description={f.description}
                        autoComplete={f.key === "password" ? "new-password" : f.key === "username" ? "username" : "off"}
                        classNames={{
                          inputWrapper: inputDark,
                          input: "!text-white/95 placeholder:!text-white/38",
                          label: "!text-white/70",
                          description: "!text-white/50",
                        }}
                      />
                    ))}
                  </div>
                )}

                <Input
                  label="Nombre (opcional)"
                  placeholder={selectedType ? `Ej: Mi conexión ${selectedType.label}` : "Ej: Mi conexión"}
                  value={name}
                  onValueChange={setName}
                  classNames={{
                    inputWrapper: inputDark,
                    input: "!text-white/95 placeholder:!text-white/38",
                    label: "!text-white/70",
                  }}
                />

                {/* Selector de operador: solo super_admin */}
                {!isOperador && (
                  <Select
                    label="Operador (opcional)"
                    items={[{ id: "none", name: "Sin asignar" }, ...operators]}
                    selectedKeys={operatorId ? [operatorId] : ["none"]}
                    onSelectionChange={(s) => {
                      const v = Array.from(s)[0] as string;
                      setOperatorId(v === "none" ? "" : v ?? "");
                    }}
                    placeholder="Sin asignar"
                    classNames={{
                      trigger: inputDark,
                      label: "!text-white/70",
                      value: "!text-white/92 font-medium",
                      innerWrapper: "!text-white",
                      selectorIcon: "!text-white/50",
                      popoverContent: "bg-[#0f1220] border border-white/[0.1]",
                    }}
                  >
                    {(item) => (
                      <SelectItem key={String(item.id)} className="text-white">{item.name}</SelectItem>
                    )}
                  </Select>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  onPress={() => { setOpen(false); resetForm(); }}
                  className="!text-white hover:bg-white/[0.12] bg-white/[0.1] border border-white/[0.2]"
                >
                  Cancelar
                </Button>
                <Button
                  className="btn-newayzi-primary"
                  onPress={handleCreate}
                  isLoading={saving}
                  isDisabled={!canSubmit}
                >
                  Crear conexión
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

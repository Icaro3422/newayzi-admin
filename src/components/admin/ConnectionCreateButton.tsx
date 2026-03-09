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
import { adminApi, type PMSConnectionType, type Operator } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

// Clases base complementadas por los estilos globales de globals.css (.admin-modal-dark)
const inputDark = "rounded-xl border";

export function ConnectionCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess } = useAdmin();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pmsType, setPmsType] = useState("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [connectionTypes, setConnectionTypes] = useState<PMSConnectionType[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    if (open) {
      adminApi.getConnectionTypes().then((r) => setConnectionTypes(r?.results ?? []));
      adminApi.getOperators().then((r) => setOperators(r?.results ?? []));
    }
  }, [open]);

  const isGeneric = pmsType === "generic";

  function resetForm() {
    setName("");
    setPmsType("");
    setOperatorId("");
    setBaseUrl("");
    setUsername("");
    setPassword("");
  }

  if (!canAccess("connections")) return null;

  async function handleCreate() {
    if (!pmsType.trim()) return;
    if (isGeneric && (!baseUrl.trim() || !username.trim() || !password)) return;

    setSaving(true);
    try {
      const payload: {
        name?: string;
        pms_type: string;
        operator_id?: number;
        config?: { base_url: string; username: string; password: string };
      } = {
        name: name.trim() || undefined,
        pms_type: pmsType.trim(),
        operator_id: operatorId && operatorId !== "none" ? parseInt(operatorId, 10) : undefined,
      };
      if (isGeneric) {
        payload.config = {
          base_url: baseUrl.trim(),
          username: username.trim(),
          password,
        };
      }
      await adminApi.createConnection(payload);
      setOpen(false);
      resetForm();
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    pmsType.trim() &&
    (!isGeneric || (baseUrl.trim() && username.trim() && password));

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
        onOpenChange={(o) => (setOpen(o), !o && resetForm())}
        size="2xl"
        backdrop="blur"
        classNames={{
          base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/50 max-h-[90vh] overflow-hidden flex flex-col",
          header: "border-b border-white/[0.08] !text-white font-sora font-bold text-lg shrink-0",
          body: "!text-white/95 !bg-transparent overflow-y-auto",
          footer: "border-t border-white/[0.08] !bg-transparent gap-2 shrink-0",
          closeButton: "!text-white/90 hover:!bg-white/10 hover:!text-white rounded-full",
          backdrop: "!bg-black/70 backdrop-blur-md",
          wrapper: "!bg-transparent",
        }}
      >
        <ModalContent>
          <ModalHeader>Nueva conexión PMS</ModalHeader>
          <ModalBody className="space-y-4">
            <Select
              label="Tipo de conexión"
              selectedKeys={pmsType ? [pmsType] : []}
              onSelectionChange={(s) => setPmsType(Array.from(s)[0] as string ?? "")}
              isRequired
              items={connectionTypes}
              description={
                isGeneric
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

            {isGeneric && (
              <div className="rounded-xl border border-white/[0.1] bg-white/[0.05] p-4 space-y-4">
                <p className="text-sm font-medium text-white/80">
                  Credenciales de la API
                </p>
                <Input
                  label="URL de la API"
                  placeholder="https://api.ejemplo.com"
                  value={baseUrl}
                  onValueChange={setBaseUrl}
                  isRequired
                  type="url"
                  description="URL base del endpoint de la API (ej: https://api.booking.com/v1)"
                  classNames={{
                    inputWrapper: inputDark,
                    input: "!text-white/95 placeholder:!text-white/38",
                    label: "!text-white/70",
                    description: "!text-white/50",
                  }}
                />
                <Input
                  label="Usuario"
                  placeholder="Usuario o API key"
                  value={username}
                  onValueChange={setUsername}
                  isRequired
                  autoComplete="username"
                  classNames={{
                    inputWrapper: inputDark,
                    input: "!text-white/95 placeholder:!text-white/38",
                    label: "!text-white/70",
                  }}
                />
                <Input
                  label="Contraseña"
                  placeholder="Contraseña o API secret"
                  value={password}
                  onValueChange={setPassword}
                  isRequired
                  type="password"
                  autoComplete="new-password"
                  description="Se almacena de forma segura. No se mostrará después de guardar."
                  classNames={{
                    inputWrapper: inputDark,
                    input: "!text-white/95 placeholder:!text-white/38",
                    label: "!text-white/70",
                    description: "!text-white/50",
                  }}
                />
              </div>
            )}

            <Input
              label="Nombre (opcional)"
              placeholder={
                isGeneric
                  ? "Ej: Booking.com - Hotel Central"
                  : "Ej: Mi conexión Kunas"
              }
              value={name}
              onValueChange={setName}
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
              }}
            />

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
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setOpen(false)}
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
        </ModalContent>
      </Modal>
    </>
  );
}

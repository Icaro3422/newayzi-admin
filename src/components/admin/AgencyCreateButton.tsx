"use client";

import { useState } from "react";
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
import { adminApi, LEVEL_OPTIONS } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

const inputDark = "rounded-xl border";

export function AgencyCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess } = useAdmin();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmailSent, setSuccessEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [initialLevel, setInitialLevel] = useState("member");
  const [initialPoints, setInitialPoints] = useState("0");
  const [saving, setSaving] = useState(false);

  if (!canAccess("agents")) return null;

  function resetForm() {
    setName("");
    setContactEmail("");
    setContactPhone("");
    setInitialLevel("member");
    setInitialPoints("0");
    setError(null);
  }

  async function handleCreate() {
    if (!name.trim() || !contactEmail.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const points = parseFloat(initialPoints) || 0;
      const res = await adminApi.createAgency({
        name: name.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim() || undefined,
        initial_level: initialLevel,
        initial_points: points > 0 ? points : undefined,
      });
      setOpen(false);
      resetForm();
      onCreated?.();
      setShowSuccess(true);
      setSuccessEmailSent(!!res.email_sent);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al crear el agente";
      try {
        const jsonMatch = msg.match(/\{.*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]) as { detail?: string };
          if (json.detail) {
            setError(json.detail);
            return;
          }
        }
      } catch {
        /* ignore parse errors */
      }
      setError(msg.replace(/^API \d+: /, "").slice(0, 200) || "Error al crear el agente");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = name.trim().length > 0 && contactEmail.trim().length > 0;

  const modalClassNames = {
    base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/50 max-h-[90vh] overflow-hidden flex flex-col",
    header: "border-b border-white/[0.08] !text-white font-sora font-bold text-lg shrink-0",
    body: "!text-white/95 !bg-transparent overflow-y-auto",
    footer: "border-t border-white/[0.08] !bg-transparent gap-2 shrink-0",
    closeButton: "!text-white/90 hover:!bg-white/10 hover:!text-white rounded-full",
    backdrop: "!bg-black/70 backdrop-blur-md",
    wrapper: "!bg-transparent",
  };

  const selectDark = {
    trigger: "rounded-xl border border-white/20 bg-white/5 !text-white/90 hover:border-white/40",
    value: "!text-white/90",
    label: "!text-white/70",
    popoverContent: "!bg-[#181c2e] border border-white/10 rounded-xl",
  };

  return (
    <>
      <Button
        className="btn-newayzi-primary"
        onPress={() => setOpen(true)}
        startContent={<Icon icon="solar:add-circle-outline" width={20} />}
      >
        Invitar agente
      </Button>

      <Modal
        isOpen={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
        size="lg"
        backdrop="blur"
        classNames={modalClassNames}
      >
        <ModalContent>
          <ModalHeader>Invitar agente</ModalHeader>
          <ModalBody className="space-y-4 py-4">
            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-400/30 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Información básica */}
            <p className="text-xs text-white/50 uppercase tracking-wider font-medium">
              Información básica
            </p>
            <Input
              label="Nombre del agente / agencia"
              value={name}
              onValueChange={setName}
              isRequired
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
              }}
            />
            <Input
              label="Email de contacto"
              value={contactEmail}
              onValueChange={setContactEmail}
              type="email"
              isRequired
              description="Obligatorio para enviar la invitación"
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
                description: "!text-white/50",
              }}
            />
            <Input
              label="Teléfono de contacto"
              value={contactPhone}
              onValueChange={setContactPhone}
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
              }}
            />

            {/* Newayzi Rewards */}
            <div className="border-t border-white/[0.08] pt-4">
              <p className="text-xs text-white/50 uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
                <Icon icon="solar:star-bold" width={14} className="text-[#b89eff]" />
                Newayzi Rewards — configuración inicial
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Nivel inicial"
                  selectedKeys={[initialLevel]}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0] as string;
                    if (val) setInitialLevel(val);
                  }}
                  classNames={selectDark}
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      classNames={{ base: "!text-white/90 hover:!bg-white/10" }}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </Select>
                <Input
                  label="Puntos iniciales"
                  value={initialPoints}
                  onValueChange={setInitialPoints}
                  type="number"
                  min="0"
                  description="0 = sin puntos de bienvenida"
                  classNames={{
                    inputWrapper: inputDark,
                    input: "!text-white/95 placeholder:!text-white/38",
                    label: "!text-white/70",
                    description: "!text-white/50",
                  }}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => { setOpen(false); resetForm(); }}
              className="!text-white hover:!bg-white/[0.12] !bg-white/[0.1] border border-white/[0.2]"
            >
              Cancelar
            </Button>
            <Button
              className="btn-newayzi-primary"
              onPress={handleCreate}
              isLoading={saving}
              isDisabled={!canSubmit}
            >
              Crear e invitar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de éxito */}
      <Modal
        isOpen={showSuccess}
        onOpenChange={setShowSuccess}
        backdrop="blur"
        classNames={{
          base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/50",
          body: "!text-white/95 !bg-transparent",
          closeButton: "!text-white/90 hover:!bg-white/10 hover:!text-white rounded-full",
          backdrop: "!bg-black/70 backdrop-blur-md",
          wrapper: "!bg-transparent",
        }}
      >
        <ModalContent>
          <ModalBody className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className={`rounded-full p-4 ${
                  successEmailSent
                    ? "bg-emerald-500/25 border border-emerald-400/30"
                    : "bg-amber-500/25 border border-amber-400/30"
                }`}
              >
                <Icon
                  icon={successEmailSent ? "solar:letter-bold" : "solar:user-check-bold"}
                  width={48}
                  className={successEmailSent ? "text-emerald-300" : "text-amber-300"}
                />
              </div>
              <h3 className="text-lg font-semibold text-white font-sora">
                {successEmailSent ? "Agente invitado exitosamente" : "Agente creado"}
              </h3>
              <p className="text-sm text-white/60">
                {successEmailSent
                  ? "El agente ha recibido un correo con sus credenciales. Deberá cambiar la contraseña en su primer inicio de sesión."
                  : "El agente se creó correctamente, pero no se pudo enviar el correo. Verifica que RESEND_API_KEY esté configurado en el backend."}
              </p>
              <Button className="btn-newayzi-primary" onPress={() => setShowSuccess(false)}>
                Entendido
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

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
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi } from "@/lib/admin-api";
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
  const [saving, setSaving] = useState(false);

  if (!canAccess("agents")) return null;

  async function handleCreate() {
    if (!name.trim() || !contactEmail.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminApi.createAgency({
        name: name.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim() || undefined,
      });
      setOpen(false);
      setName("");
      setContactEmail("");
      setContactPhone("");
      onCreated?.();
      setShowSuccess(true);
      setSuccessEmailSent(!!res.email_sent);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al crear la agencia";
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
      setError(msg.replace(/^API \d+: /, "").slice(0, 200) || "Error al crear la agencia");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = name.trim().length > 0 && contactEmail.trim().length > 0;

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
          if (!o) setError(null);
        }}
        size="lg"
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
          <ModalHeader>Invitar agente (nueva agencia)</ModalHeader>
          <ModalBody className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-400/30 p-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <Input
              label="Nombre de la agencia"
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
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setOpen(false)}
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
              Crear
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
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
                {successEmailSent ? "Agente invitado exitosamente" : "Agencia creada"}
              </h3>
              <p className="text-sm text-white/60">
                {successEmailSent
                  ? "El agente ha recibido un correo con sus credenciales temporales. Deberá cambiar la contraseña en su primer inicio de sesión."
                  : "La agencia se creó correctamente, pero no se pudo enviar el correo de invitación. Verifica que RESEND_API_KEY esté configurado en el backend."}
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

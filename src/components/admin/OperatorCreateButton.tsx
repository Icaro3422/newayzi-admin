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

export function OperatorCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess } = useAdmin();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<"sent" | "user_exists" | "no_resend" | "clerk_error" | "skipped" | null>(null);
  const [name, setName] = useState("");
  const [contact_email, setContactEmail] = useState("");
  const [contact_phone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canAccess("operators")) return null;

  async function handleCreate() {
    if (!name.trim() || !contact_email.trim()) return;
    setSaving(true);
    try {
      const res = await adminApi.createOperator({
        name: name.trim(),
        contact_email: contact_email.trim(),
        contact_phone: contact_phone.trim() || undefined,
      });
      setOpen(false);
      setName("");
      setContactEmail("");
      setContactPhone("");
      onCreated?.();
      setInviteStatus(res.invite_status ?? (res.email_sent ? "sent" : "no_resend"));
      setShowSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = name.trim().length > 0 && contact_email.trim().length > 0;

  return (
    <>
      <Button
        className="btn-newayzi-primary"
        onPress={() => setOpen(true)}
        startContent={<Icon icon="solar:add-circle-outline" width={20} />}
      >
        Nuevo operador
      </Button>
      <Modal
        isOpen={open}
        onOpenChange={setOpen}
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
          <ModalHeader>Nuevo operador</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Nombre"
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
              label="Email contacto"
              value={contact_email}
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
              label="Teléfono contacto"
              value={contact_phone}
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
                  inviteStatus === "sent"
                    ? "bg-emerald-500/25 border border-emerald-400/30"
                    : inviteStatus === "user_exists"
                    ? "bg-blue-500/25 border border-blue-400/30"
                    : "bg-amber-500/25 border border-amber-400/30"
                }`}
              >
                <Icon
                  icon={
                    inviteStatus === "sent"
                      ? "solar:letter-bold"
                      : inviteStatus === "user_exists"
                      ? "solar:user-check-bold"
                      : "solar:user-bold"
                  }
                  width={48}
                  className={
                    inviteStatus === "sent"
                      ? "text-emerald-300"
                      : inviteStatus === "user_exists"
                      ? "text-blue-300"
                      : "text-amber-300"
                  }
                />
              </div>
              <h3 className="text-lg font-semibold text-white font-sora">
                {inviteStatus === "sent"
                  ? "Operador agregado exitosamente"
                  : inviteStatus === "user_exists"
                  ? "Operador creado — usuario ya existía"
                  : "Operador creado"}
              </h3>
              <p className="text-sm text-white/60">
                {inviteStatus === "sent"
                  ? "El operador ha recibido un correo con sus credenciales temporales. Deberá cambiar la contraseña en su primer inicio de sesión."
                  : inviteStatus === "user_exists"
                  ? "Este email ya tenía una cuenta activa en la plataforma. El operador fue creado y vinculado a esa cuenta. No se envió correo de invitación."
                  : inviteStatus === "no_resend"
                  ? "El operador fue creado, pero no se pudo enviar el correo de invitación. Verifica que RESEND_API_KEY esté configurado en el backend."
                  : "El operador fue creado, pero ocurrió un error al configurar su acceso en Clerk. Verifica los logs del backend."}
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

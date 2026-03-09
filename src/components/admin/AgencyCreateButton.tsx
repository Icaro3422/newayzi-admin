"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function AgencyCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess } = useAdmin();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canAccess("agents")) return null;

  async function handleCreate() {
    if (!name.trim() || !contactEmail.trim()) return;
    setSaving(true);
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
      if (res.email_sent) {
        setShowSuccess(true);
      }
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
      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>Invitar agente (nueva agencia)</ModalHeader>
          <ModalBody className="space-y-4">
            <Input label="Nombre de la agencia" value={name} onValueChange={setName} isRequired />
            <Input
              label="Email de contacto"
              value={contactEmail}
              onValueChange={setContactEmail}
              type="email"
              isRequired
              description="Obligatorio para enviar la invitación"
            />
            <Input label="Teléfono de contacto" value={contactPhone} onValueChange={setContactPhone} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setOpen(false)}>
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
      <Modal isOpen={showSuccess} onOpenChange={setShowSuccess}>
        <ModalContent>
          <ModalBody className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-emerald-100 p-4">
                <Icon icon="solar:letter-bold" width={48} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-newayzi-jet">Correo enviado exitosamente</h3>
              <p className="text-sm text-gray-500">
                El agente ha recibido un correo con sus credenciales temporales. Deberá cambiar la contraseña en su primer inicio de sesión.
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

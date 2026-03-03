"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function AgencyCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess } = useAdmin();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canAccess("agents")) return null;

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await adminApi.createAgency({
        name: name.trim(),
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      });
      setOpen(false);
      setName("");
      setContactEmail("");
      setContactPhone("");
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        color="primary"
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
            />
            <Input label="Teléfono de contacto" value={contactPhone} onValueChange={setContactPhone} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleCreate}
              isLoading={saving}
              isDisabled={!name.trim()}
            >
              Crear
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

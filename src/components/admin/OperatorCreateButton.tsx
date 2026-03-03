"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function OperatorCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess } = useAdmin();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact_email, setContactEmail] = useState("");
  const [contact_phone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canAccess("operators")) return null;

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await adminApi.createOperator({
        name: name.trim(),
        contact_email: contact_email.trim() || undefined,
        contact_phone: contact_phone.trim() || undefined,
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
      <Button color="primary" onPress={() => setOpen(true)} startContent={<Icon icon="solar:add-circle-outline" width={20} />}>
        Nuevo operador
      </Button>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>Nuevo operador</ModalHeader>
          <ModalBody className="space-y-4">
            <Input label="Nombre" value={name} onValueChange={setName} isRequired />
            <Input label="Email contacto" value={contact_email} onValueChange={setContactEmail} type="email" />
            <Input label="Teléfono contacto" value={contact_phone} onValueChange={setContactPhone} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setOpen(false)}>Cancelar</Button>
            <Button color="primary" onPress={handleCreate} isLoading={saving} isDisabled={!name.trim()}>
              Crear
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

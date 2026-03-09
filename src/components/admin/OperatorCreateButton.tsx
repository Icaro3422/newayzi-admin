"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function OperatorCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess } = useAdmin();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmailSent, setSuccessEmailSent] = useState(false);
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
      setShowSuccess(true);
      setSuccessEmailSent(!!res.email_sent);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = name.trim().length > 0 && contact_email.trim().length > 0;

  return (
    <>
      <Button className="btn-newayzi-primary" onPress={() => setOpen(true)} startContent={<Icon icon="solar:add-circle-outline" width={20} />}>
        Nuevo operador
      </Button>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>Nuevo operador</ModalHeader>
          <ModalBody className="space-y-4">
            <Input label="Nombre" value={name} onValueChange={setName} isRequired />
            <Input
              label="Email contacto"
              value={contact_email}
              onValueChange={setContactEmail}
              type="email"
              isRequired
              description="Obligatorio para enviar la invitación"
            />
            <Input label="Teléfono contacto" value={contact_phone} onValueChange={setContactPhone} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setOpen(false)}>Cancelar</Button>
            <Button className="btn-newayzi-primary" onPress={handleCreate} isLoading={saving} isDisabled={!canSubmit}>
              Crear
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={showSuccess} onOpenChange={setShowSuccess}>
        <ModalContent>
          <ModalBody className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={`rounded-full p-4 ${successEmailSent ? "bg-emerald-100" : "bg-amber-100"}`}>
                <Icon
                  icon={successEmailSent ? "solar:letter-bold" : "solar:user-check-bold"}
                  width={48}
                  className={successEmailSent ? "text-emerald-600" : "text-amber-600"}
                />
              </div>
              <h3 className="text-lg font-semibold text-newayzi-jet">
                {successEmailSent ? "Operador agregado exitosamente" : "Operador creado"}
              </h3>
              <p className="text-sm text-gray-500">
                {successEmailSent
                  ? "El operador ha recibido un correo con sus credenciales temporales. Deberá cambiar la contraseña en su primer inicio de sesión."
                  : "El operador se creó correctamente, pero no se pudo enviar el correo de invitación. Verifica que RESEND_API_KEY esté configurado en el backend."}
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

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
      <Modal isOpen={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
        <ModalContent>
          <ModalHeader>Invitar agente (nueva agencia)</ModalHeader>
          <ModalBody className="space-y-4">
            {error && (
              <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">
                {error}
              </div>
            )}
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
              <div className={`rounded-full p-4 ${successEmailSent ? "bg-emerald-100" : "bg-amber-100"}`}>
                <Icon
                  icon={successEmailSent ? "solar:letter-bold" : "solar:user-check-bold"}
                  width={48}
                  className={successEmailSent ? "text-emerald-600" : "text-amber-600"}
                />
              </div>
              <h3 className="text-lg font-semibold text-newayzi-jet">
                {successEmailSent ? "Agente invitado exitosamente" : "Agencia creada"}
              </h3>
              <p className="text-sm text-semantic-text-muted">
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, Button, Input, Switch, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import { adminApi, type Operator } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function OperatorDetailClient() {
  const params = useParams();
  const id = parseInt(String(params?.id ?? "0"), 10);
  const { canAccess } = useAdmin();
  const canEdit = canAccess("operators");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [contact_email, setContactEmail] = useState("");
  const [contact_phone, setContactPhone] = useState("");
  const [is_active, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Number.isNaN(id) || id <= 0) {
      setLoading(false);
      return;
    }
    adminApi.getOperator(id).then((op) => {
      setOperator(op ?? null);
      if (op) {
        setName(op.name);
        setContactEmail(op.contact_email ?? "");
        setContactPhone(op.contact_phone ?? "");
        setIsActive(op.is_active);
      }
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    if (!operator || !canEdit) return;
    setSaving(true);
    try {
      const updated = await adminApi.patchOperator(id, {
        name,
        contact_email: contact_email || undefined,
        contact_phone: contact_phone || undefined,
        is_active,
      });
      setOperator(updated);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }
  if (!operator) {
    return (
      <Card className="border border-semantic-surface-border">
        <CardBody>
          <p className="text-semantic-text-muted">Operador no encontrado.</p>
          <Button as={Link} href="/admin/operators" className="mt-2">Volver</Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button as={Link} href="/admin/operators" variant="flat" startContent={<Icon icon="solar:arrow-left-outline" width={18} />}>
        Volver
      </Button>
      <Card className="border border-semantic-surface-border">
        <CardBody className="space-y-4">
          <Input label="Nombre" value={name} onValueChange={setName} isReadOnly={!canEdit} />
          <Input label="Email contacto" value={contact_email} onValueChange={setContactEmail} isReadOnly={!canEdit} />
          <Input label="Teléfono contacto" value={contact_phone} onValueChange={setContactPhone} isReadOnly={!canEdit} />
          {canEdit && (
            <Switch isSelected={is_active} onValueChange={setIsActive}>
              Activo
            </Switch>
          )}
          {canEdit && (
            <Button color="primary" onPress={handleSave} isLoading={saving}>
              Guardar cambios
            </Button>
          )}
        </CardBody>
      </Card>
      <Card className="border border-semantic-surface-border">
        <CardBody>
          <p className="text-sm text-semantic-text-muted">
            Conexiones asignadas: {operator.connections_count ?? 0}. Para asignar o cambiar la conexión, edita cada conexión en Conexiones PMS.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

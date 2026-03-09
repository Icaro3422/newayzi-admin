"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Input, Switch, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useParams } from "next/navigation";
import { adminApi, type Operator } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

const inputDark = "rounded-xl border";

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
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner
          size="lg"
          classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }}
        />
      </GlassCard>
    );
  }
  if (!operator) {
    return (
      <GlassCard>
        <p className="text-white/70 font-sora">Operador no encontrado.</p>
        <Button
          as={Link}
          href="/admin/operators"
          className="mt-4 text-white/90 hover:bg-white/[0.1] border border-white/[0.15] rounded-xl font-medium bg-white/[0.06]"
        >
          Volver
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        as={Link}
        href="/admin/operators"
        variant="flat"
        className="text-white/90 hover:bg-white/[0.1] border border-white/[0.15] rounded-xl font-medium bg-white/[0.06]"
        startContent={<Icon icon="solar:arrow-left-outline" width={18} />}
      >
        Volver
      </Button>
      <GlassCard>
        <div className="flex flex-col gap-6">
          <Input
            label="Nombre"
            value={name}
            onValueChange={setName}
            isReadOnly={!canEdit}
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95 placeholder:!text-white/38",
              label: "!text-white/65",
            }}
          />
          <Input
            label="Email contacto"
            value={contact_email}
            onValueChange={setContactEmail}
            isReadOnly={!canEdit}
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95 placeholder:!text-white/38",
              label: "!text-white/65",
            }}
          />
          <Input
            label="Teléfono contacto"
            value={contact_phone}
            onValueChange={setContactPhone}
            isReadOnly={!canEdit}
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95 placeholder:!text-white/38",
              label: "!text-white/65",
            }}
          />
          {canEdit && (
            <Switch isSelected={is_active} onValueChange={setIsActive} color="primary">
              <span className="text-sm font-medium text-white/85 font-sora">Activo</span>
            </Switch>
          )}
          {canEdit && (
            <Button
              className="btn-newayzi-primary rounded-xl"
              onPress={handleSave}
              isLoading={saving}
              startContent={!saving ? <Icon icon="solar:diskette-outline" width={18} /> : undefined}
            >
              Guardar cambios
            </Button>
          )}
        </div>
      </GlassCard>
      <GlassCard>
        <p className="text-sm text-white/60">
          Conexiones asignadas: {operator.connections_count ?? 0}. Para asignar o cambiar la conexión, edita cada conexión en Conexiones PMS.
        </p>
      </GlassCard>
    </div>
  );
}

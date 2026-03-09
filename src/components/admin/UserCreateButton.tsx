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
import { adminApi, type AdminRole } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

const ROLES: { value: AdminRole; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "visualizador", label: "Visualizador" },
  { value: "comercial", label: "Comercial" },
  { value: "operador", label: "Operador" },
];

export function UserCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess } = useAdmin();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [role, setRole] = useState<AdminRole>("visualizador");
  const [operator_id, setOperatorId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [operators, setOperators] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canAccess("users")) return null;

  async function loadOperators() {
    const res = await adminApi.getOperators();
    setOperators(res?.results?.map((o) => ({ id: o.id, name: o.name })) ?? []);
  }

  function handleOpen() {
    setOpen(true);
    setError(null);
    loadOperators();
  }

  async function handleCreate() {
    if (!email.trim() || !password.trim() || !role) return;
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminApi.createUserAdmin({
        email: email.trim(),
        first_name: first_name.trim(),
        last_name: last_name.trim() || undefined,
        role,
        operator_id: operator_id ? parseInt(operator_id, 10) : undefined,
        password,
      });
      setOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("visualizador");
      setOperatorId("");
      setPassword("");
      onCreated?.();
      setShowSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length >= 8 &&
    role.length > 0;

  return (
    <>
      <Button
        color="primary"
        onPress={handleOpen}
        startContent={<Icon icon="solar:add-circle-outline" width={20} />}
      >
        Agregar usuario
      </Button>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>Agregar usuario</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Email"
              value={email}
              onValueChange={setEmail}
              type="email"
              isRequired
            />
            <Input
              label="Nombre"
              value={first_name}
              onValueChange={setFirstName}
            />
            <Input
              label="Apellido"
              value={last_name}
              onValueChange={setLastName}
            />
            <Input
              label="Contraseña temporal"
              type="password"
              value={password}
              onValueChange={setPassword}
              isRequired
              description="Mínimo 8 caracteres. Clerk forzará el cambio en el primer inicio de sesión."
            />
            <Select
              label="Rol"
              selectedKeys={role ? [role] : []}
              onSelectionChange={(s) => {
                const v = Array.from(s)[0] as AdminRole;
                if (v) setRole(v);
              }}
              isRequired
              items={ROLES}
            >
              {(item) => <SelectItem key={item.value}>{item.label}</SelectItem>}
            </Select>
            {role === "operador" && (
              <Select
                label="Operador"
                selectedKeys={operator_id ? [operator_id] : []}
                onSelectionChange={(s) => {
                  const v = Array.from(s)[0] as string;
                  setOperatorId(v || "");
                }}
                placeholder="Seleccionar operador"
                items={[{ id: "", name: "Ninguno" }, ...operators]}
              >
                {(item) => (
                  <SelectItem key={String(item.id)}>{item.name}</SelectItem>
                )}
              </Select>
            )}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="primary"
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
                <Icon
                  icon="solar:user-check-bold"
                  width={48}
                  className="text-emerald-600"
                />
              </div>
              <h3 className="text-lg font-semibold text-newayzi-jet">
                Usuario creado
              </h3>
              <p className="text-sm text-semantic-text-muted">
                El usuario puede iniciar sesión con el email y contraseña indicados.
                Clerk le pedirá cambiar la contraseña en su primer acceso.
              </p>
              <Button color="primary" onPress={() => setShowSuccess(false)}>
                Entendido
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

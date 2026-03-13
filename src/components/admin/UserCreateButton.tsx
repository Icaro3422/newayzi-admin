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
import { adminApi, type AdminRole, LEVEL_OPTIONS, type LoyaltyLevelValue } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

const ROLES: { value: AdminRole; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "visualizador", label: "Visualizador" },
  { value: "comercial", label: "Comercial" },
  { value: "operador", label: "Operador" },
  { value: "agente", label: "Agente" },
];

const inputDark = "rounded-xl border";

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
  const [initial_level, setInitialLevel] = useState<LoyaltyLevelValue>("member");
  const [initial_points, setInitialPoints] = useState<string>("");
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
        initial_level,
        initial_points: initial_points ? parseFloat(initial_points) : 0,
      });
      setOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("visualizador");
      setOperatorId("");
      setPassword("");
      setInitialLevel("member");
      setInitialPoints("");
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
        className="btn-newayzi-primary"
        onPress={handleOpen}
        startContent={<Icon icon="solar:add-circle-outline" width={20} />}
      >
        Agregar usuario
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
          <ModalHeader>Agregar usuario</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Email"
              value={email}
              onValueChange={setEmail}
              type="email"
              isRequired
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
              }}
            />
            <Input
              label="Nombre"
              value={first_name}
              onValueChange={setFirstName}
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
              }}
            />
            <Input
              label="Apellido"
              value={last_name}
              onValueChange={setLastName}
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
              }}
            />
            <Input
              label="Contraseña temporal"
              type="password"
              value={password}
              onValueChange={setPassword}
              isRequired
              description="Mínimo 8 caracteres. Clerk forzará el cambio en el primer inicio de sesión."
              classNames={{
                inputWrapper: inputDark,
                input: "!text-white/95 placeholder:!text-white/38",
                label: "!text-white/70",
                description: "!text-white/50",
              }}
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
              classNames={{
                trigger: inputDark,
                value: "!text-white/92",
                label: "!text-white/70",
                selectorIcon: "!text-white/50",
                popoverContent: "bg-[#0f1220] border border-white/[0.1]",
              }}
            >
              {(item) => (
                <SelectItem key={item.value} className="text-white">
                  {item.label}
                </SelectItem>
              )}
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
                classNames={{
                  trigger: inputDark,
                  value: "!text-white/92",
                  label: "!text-white/70",
                  selectorIcon: "!text-white/50",
                  popoverContent: "bg-[#0f1220] border border-white/[0.1]",
                }}
              >
                {(item) => (
                  <SelectItem key={String(item.id)} className="text-white">
                    {item.name}
                  </SelectItem>
                )}
              </Select>
            )}
            {/* Billetera Rewards inicial */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon icon="solar:wallet-bold-duotone" className="text-violet-300 text-lg" />
                <span className="text-white/80 text-sm font-semibold">Billetera Newayzi Rewards inicial</span>
              </div>
              <Select
                label="Nivel Rewards de inicio"
                selectedKeys={[initial_level]}
                onSelectionChange={(s) => {
                  const v = Array.from(s)[0] as LoyaltyLevelValue;
                  if (v) setInitialLevel(v);
                }}
                items={LEVEL_OPTIONS}
                classNames={{
                  trigger: inputDark,
                  value: "!text-white/92",
                  label: "!text-white/70",
                  selectorIcon: "!text-white/50",
                  popoverContent: "bg-[#0f1220] border border-white/[0.1]",
                }}
              >
                {(item) => (
                  <SelectItem key={item.value} className="text-white">{item.label}</SelectItem>
                )}
              </Select>
              <Input
                label="Puntos iniciales (opcional)"
                type="number"
                value={initial_points}
                onValueChange={setInitialPoints}
                placeholder="Ej: 500"
                description="Se acreditan como ajuste en el historial de la billetera."
                classNames={{
                  inputWrapper: inputDark,
                  input: "!text-white/95 placeholder:!text-white/38",
                  label: "!text-white/70",
                  description: "!text-white/50",
                }}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setOpen(false)}
              className="text-white/80 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#5e2cec] hover:bg-[#6d3cf5] text-white"
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
              <div className="rounded-2xl bg-emerald-500/25 border border-emerald-400/30 p-4">
                <Icon
                  icon="solar:user-check-bold"
                  width={48}
                  className="text-emerald-300"
                />
              </div>
              <h3 className="font-sora font-bold text-white text-lg">
                Usuario creado
              </h3>
              <p className="text-sm text-white/60 max-w-sm">
                El usuario puede iniciar sesión con el email y contraseña indicados.
                Clerk le pedirá cambiar la contraseña en su primer acceso.
              </p>
              <Button
                className="btn-newayzi-primary"
                onPress={() => setShowSuccess(false)}
              >
                Entendido
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

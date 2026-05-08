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

const ROLES: { value: AdminRole; label: string; description?: string }[] = [
  { value: "user", label: "Usuario (frontend)", description: "Acceso al frontend — sin permisos en el admin" },
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
  const [role, setRole] = useState<AdminRole>("user");
  const [operator_id, setOperatorId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [initial_level, setInitialLevel] = useState<LoyaltyLevelValue>("member");
  const [initial_points, setInitialPoints] = useState<string>("");
  const [send_invite_email, setSendInviteEmail] = useState(true);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
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
      const result = await adminApi.createUserAdmin({
        email: email.trim(),
        first_name: first_name.trim(),
        last_name: last_name.trim() || undefined,
        role,
        operator_id: operator_id ? parseInt(operator_id, 10) : undefined,
        password,
        send_invite_email: role === "user" ? send_invite_email : false,
        initial_level,
        initial_points: initial_points ? parseFloat(initial_points) : 0,
      });
      setOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("user");
      setOperatorId("");
      setPassword("");
      setSendInviteEmail(true);
      setInitialLevel("member");
      setInitialPoints("");
      setEmailSent(result.email_sent ?? null);
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
                <SelectItem key={item.value} className="text-white" description={item.description}>
                  {item.label}
                </SelectItem>
              )}
            </Select>
            {role === "user" && (
              <div className="rounded-xl border border-slate-500/20 bg-slate-500/10 px-4 py-3 space-y-3">
                <div className="flex items-start gap-2">
                  <Icon icon="solar:info-circle-bold-duotone" className="text-slate-300 text-lg shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300/80">
                    Este usuario <strong className="text-slate-200">no tendrá acceso al portal admin</strong>. Podrá iniciar sesión únicamente en el frontend (newayzi.com). Se le pedirá cambiar la contraseña en su primer acceso.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendInviteEmail(!send_invite_email)}
                  className="flex items-center gap-2 text-xs text-slate-300/80 hover:text-white/90 transition-colors cursor-pointer"
                >
                  <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${send_invite_email ? "bg-[#b89a5e]" : "bg-white/20"}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${send_invite_email ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span>Enviar email de bienvenida con credenciales</span>
                </button>
              </div>
            )}
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
                <span className="text-white/80 text-sm font-semibold">Billetera Almara Rewards inicial</span>
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
              className="bg-[#b89a5e] hover:bg-[#6d3cf5] text-white"
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
                El usuario puede iniciar sesión en el <strong className="text-white/80">frontend</strong> con el email y contraseña indicados.
                Se le pedirá cambiar la contraseña en su primer acceso.
              </p>
              {emailSent === true && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300">
                  <Icon icon="solar:letter-bold-duotone" width={16} />
                  Email de bienvenida enviado con las credenciales.
                </div>
              )}
              {emailSent === false && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-400/20 px-3 py-2 text-xs text-amber-300">
                  <Icon icon="solar:letter-unread-bold-duotone" width={16} />
                  No se pudo enviar el email. Comparte las credenciales manualmente.
                </div>
              )}
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

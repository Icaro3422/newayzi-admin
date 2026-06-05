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
import { adminApi, type AdminRole, LEVEL_OPTIONS, type LoyaltyLevelValue, type SupportedLocale } from "@/lib/admin-api";
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
  const [invite_locale, setInviteLocale] = useState<SupportedLocale>("es");
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
    const isUserRole = role === "user";
    if (!email.trim() || !role) return;
    // Para roles admin la contraseña es requerida; para "user" se genera en el backend
    if (!isUserRole && (!password.trim() || password.length < 8)) {
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
        password: isUserRole ? undefined : password,
        send_invite_email: isUserRole ? true : false,
        invite_locale: isUserRole ? invite_locale : undefined,
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
      setInviteLocale("es");
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

  const isUserRole = role === "user";
  const canSubmit =
    email.trim().length > 0 &&
    role.length > 0 &&
    (isUserRole || password.trim().length >= 8);

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
            {role !== "user" && (
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
            )}
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
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 space-y-3">
                <div className="flex items-start gap-2">
                  <Icon icon="solar:magic-stick-3-bold-duotone" className="text-emerald-300 text-lg shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-200/80">
                    Se enviará un <strong className="text-emerald-100">enlace de acceso directo</strong> al correo del usuario. Solo debe hacer clic para ingresar — <strong className="text-emerald-100">sin contraseña</strong>.
                  </p>
                </div>
                <Select
                  label="Idioma del email"
                  selectedKeys={[invite_locale]}
                  onSelectionChange={(s) => {
                    const v = Array.from(s)[0] as SupportedLocale;
                    if (v === "es" || v === "en") setInviteLocale(v);
                  }}
                  size="sm"
                  items={[
                    { value: "es" as const, label: "Español" },
                    { value: "en" as const, label: "Inglés" },
                  ]}
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
            {/* Billetera Rewards inicial — solo roles admin; huéspedes corporativos → Créditos corporativos */}
            {!isUserRole && (
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
                description="Ajuste manual en billetera — no registra prepago corporativo ni aporte al pool."
                classNames={{
                  inputWrapper: inputDark,
                  input: "!text-white/95 placeholder:!text-white/38",
                  label: "!text-white/70",
                  description: "!text-white/50",
                }}
              />
            </div>
            )}
            {isUserRole && (
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-sm text-white/65">
                Para acreditar prepago corporativo (transferencia bancaria + magic link), usa{" "}
                <a href="/admin/corporate-credits" className="text-cyan-300 underline">
                  Créditos corporativos
                </a>
                . Este formulario solo crea la cuenta de huésped y envía el primer enlace.
              </div>
            )}

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
                {isUserRole
                  ? "Se envió un enlace de acceso directo al correo del usuario. Solo debe hacer clic para ingresar, sin contraseña."
                  : "El usuario puede iniciar sesión con el email y contraseña temporal indicados. Se le pedirá cambiar la contraseña en su primer acceso."}
              </p>
              {emailSent === true && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300">
                  <Icon icon="solar:letter-bold-duotone" width={16} />
                  {isUserRole ? "Email con enlace de acceso enviado." : "Email de bienvenida enviado con las credenciales."}
                </div>
              )}
              {emailSent === false && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-400/20 px-3 py-2 text-xs text-amber-300">
                  <Icon icon="solar:letter-unread-bold-duotone" width={16} />
                  {isUserRole
                    ? "No se pudo enviar el email. Reenvía el magic link con el botón ✉️ en Usuarios o en Créditos corporativos."
                    : "No se pudo enviar el email. Comparte las credenciales manualmente."}
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

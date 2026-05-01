"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Select,
  SelectItem,
  Spinner,
  addToast,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, ROLE_META, type AdminUserListItem, type AdminRole } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

const ROLES: { value: AdminRole; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "visualizador", label: "Visualizador" },
  { value: "comercial", label: "Comercial" },
  { value: "operador", label: "Operador" },
  { value: "agente", label: "Agente" },
];

const inputDark = "rounded-xl border";

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

function roleLabel(role: AdminRole | null): string {
  if (!role) return "Sin rol";
  return ROLE_META[role]?.label ?? ROLES.find((r) => r.value === role)?.label ?? role;
}

export function UsersList() {
  const { canAccess } = useAdmin();
  const canEdit = canAccess("users");
  const canCorporateCredit = canAccess("corporate-credits");
  const [list, setList] = useState<AdminUserListItem[]>([]);
  const [operators, setOperators] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<AdminUserListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editModal, setEditModal] = useState<AdminUserListItem | null>(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", email: "" });

  useEffect(() => {
    Promise.all([
      adminApi.getUsers(),
      adminApi.getOperators(),
    ]).then(([usersRes, opRes]) => {
      setList(usersRes?.results ?? []);
      setOperators(opRes?.results?.map((o) => ({ id: o.id, name: o.name })) ?? []);
      setLoading(false);
    });
  }, []);

  async function updateRole(userId: number, role: AdminRole | null) {
    if (!canEdit) return;
    setPatching(userId);
    try {
      const updated = await adminApi.patchUser(userId, { role: role ?? undefined });
      setList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      const userName = list.find((u) => u.id === userId);
      const name = userName ? `${userName.first_name} ${userName.last_name}`.trim() || userName.email : "Usuario";
      addToast({
        title: "Rol actualizado",
        description: `${name} ahora tiene rol: ${role ? roleLabel(role) : "Sin rol"}`,
        color: "success",
        timeout: 4000,
      });
    } catch (e) {
      addToast({
        title: "Error al actualizar rol",
        description: e instanceof Error ? e.message : "No se pudo guardar el cambio. Inténtalo de nuevo.",
        color: "danger",
        timeout: 5000,
      });
    } finally {
      setPatching(null);
    }
  }

  async function updateOperator(userId: number, operator_id: number | null) {
    if (!canEdit) return;
    setPatching(userId);
    try {
      const updated = await adminApi.patchUser(userId, { operator_id: operator_id ?? undefined });
      setList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      const userName = list.find((u) => u.id === userId);
      const name = userName ? `${userName.first_name} ${userName.last_name}`.trim() || userName.email : "Usuario";
      const opName = operator_id ? operators.find((o) => o.id === operator_id)?.name ?? "operador" : "Ninguno";
      addToast({
        title: "Operador asignado",
        description: `${name} → ${opName}`,
        color: "success",
        timeout: 4000,
      });
    } catch (e) {
      addToast({
        title: "Error al asignar operador",
        description: e instanceof Error ? e.message : "No se pudo guardar el cambio. Inténtalo de nuevo.",
        color: "danger",
        timeout: 5000,
      });
    } finally {
      setPatching(null);
    }
  }

  async function handleDelete(user: AdminUserListItem) {
    if (!canEdit || !deleteModal) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(user.id);
      setList((prev) => prev.filter((u) => u.id !== user.id));
      setDeleteModal(null);
      const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
      addToast({
        title: "Usuario eliminado",
        description: `${name} ha sido eliminado correctamente.`,
        color: "success",
        timeout: 4000,
      });
    } catch (e) {
      addToast({
        title: "Error al eliminar",
        description: e instanceof Error ? e.message : "No se pudo eliminar el usuario.",
        color: "danger",
        timeout: 5000,
      });
    } finally {
      setDeleting(false);
    }
  }

  function openEditModal(user: AdminUserListItem) {
    setEditModal(user);
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
    });
  }

  async function handleEditSave() {
    if (!canEdit || !editModal) return;
    setPatching(editModal.id);
    try {
      const updated = await adminApi.patchUser(editModal.id, {
        first_name: editForm.first_name.trim() || undefined,
        last_name: editForm.last_name.trim() || undefined,
        email: editForm.email.trim() || undefined,
      });
      setList((prev) => prev.map((u) => (u.id === editModal.id ? updated : u)));
      setEditModal(null);
      addToast({
        title: "Usuario actualizado",
        description: "Los datos se guardaron correctamente.",
        color: "success",
        timeout: 4000,
      });
    } catch (e) {
      addToast({
        title: "Error al actualizar",
        description: e instanceof Error ? e.message : "No se pudo guardar.",
        color: "danger",
        timeout: 5000,
      });
    } finally {
      setPatching(null);
    }
  }

  if (loading) {
    return (
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
      </GlassCard>
    );
  }

  if (list.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 flex items-center justify-center mb-4">
          <Icon icon="solar:users-group-rounded-bold-duotone" className="text-[#9b74ff] text-2xl" />
        </div>
        <p className="font-sora font-bold text-white text-base">No hay usuarios con perfil</p>
        <p className="mt-2 text-sm text-white/50 max-w-md">
          El endpoint GET /api/admin/users/ debe devolver perfiles (CRM).
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Usuario
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Email
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Loyalty
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Rol
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Operador
              </th>
              {canEdit && (
                <th className="text-right py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold w-24">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr
                key={u.id}
                className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-4 px-5 font-sora font-semibold text-white/90">
                  {u.first_name} {u.last_name}
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">{u.email}</td>
                <td className="py-4 px-5">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium bg-[#5e2cec]/25 border border-[#5e2cec]/30 text-[#b89eff]">
                    {u.loyalty_level ?? "member"} · {u.loyalty_points ?? 0} pts
                  </span>
                </td>
                <td className="py-4 px-5">
                  {canEdit ? (
                    <Select
                      selectedKeys={u.role ? [u.role] : []}
                      onSelectionChange={(s) => {
                        const v = Array.from(s)[0] as AdminRole | "";
                        updateRole(u.id, v === "" ? null : v);
                      }}
                      size="sm"
                      className="w-40"
                      isLoading={patching === u.id}
                      items={[{ value: "", label: "Sin rol" }, ...ROLES]}
                      classNames={{
                        trigger: inputDark,
                        value: "!text-white/92 font-medium",
                        innerWrapper: "!text-white",
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
                  ) : (
                    <span className="text-white/70 text-sm">{roleLabel(u.role)}</span>
                  )}
                </td>
                <td className="py-4 px-5">
                  {canEdit ? (
                    <Select
                      selectedKeys={u.operator_id != null ? [String(u.operator_id)] : []}
                      onSelectionChange={(s) => {
                        const v = Array.from(s)[0];
                        updateOperator(u.id, v ? parseInt(String(v), 10) : null);
                      }}
                      size="sm"
                      className="w-40"
                      isLoading={patching === u.id}
                      items={[{ id: "", name: "Ninguno" }, ...operators]}
                      classNames={{
                        trigger: inputDark,
                        value: "!text-white/92 font-medium",
                        innerWrapper: "!text-white",
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
                  ) : (
                    <span className="text-white/70 text-sm">{u.operator_name ?? "—"}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canCorporateCredit && (
                        <Link
                          href={`/admin/corporate-credits?profile_id=${u.id}`}
                          className="inline-flex items-center justify-center min-w-8 w-8 h-8 rounded-lg text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                          title="Cargar crédito corporativo"
                          aria-label="Cargar crédito corporativo"
                        >
                          <Icon icon="solar:buildings-2-bold-duotone" className="text-lg" />
                        </Link>
                      )}
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-white/60 hover:text-white/90 hover:bg-white/10 min-w-8 w-8 h-8"
                        onPress={() => openEditModal(u)}
                        aria-label="Editar usuario"
                      >
                        <Icon icon="solar:pen-bold-duotone" className="text-lg" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 min-w-8 w-8 h-8"
                        onPress={() => setDeleteModal(u)}
                        aria-label="Eliminar usuario"
                      >
                        <Icon icon="solar:trash-bin-trash-bold-duotone" className="text-lg" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal eliminar usuario */}
      <Modal
        isOpen={!!deleteModal}
        onOpenChange={(open) => !open && setDeleteModal(null)}
        size="md"
        backdrop="blur"
        classNames={{
          base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl",
          header: "border-b border-white/[0.08] !text-white font-sora font-bold",
          body: "!text-white/95",
          footer: "border-t border-white/[0.08]",
          closeButton: "!text-white/90 hover:!bg-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <Icon icon="solar:trash-bin-trash-bold-duotone" className="text-red-400 text-2xl" />
            </div>
            Eliminar usuario
          </ModalHeader>
          <ModalBody>
            {deleteModal && (
              <p className="text-white/80">
                ¿Estás seguro de que deseas eliminar a{" "}
                <strong className="text-white">
                  {`${deleteModal.first_name} ${deleteModal.last_name}`.trim() || deleteModal.email}
                </strong>
                ? Esta acción no se puede deshacer y eliminará el usuario de Clerk y del sistema.
              </p>
            )}
          </ModalBody>
          <ModalFooter className="gap-2">
            <Button
              variant="light"
              className="text-white/80"
              onPress={() => setDeleteModal(null)}
              isDisabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              color="danger"
              onPress={() => deleteModal && handleDelete(deleteModal)}
              isLoading={deleting}
              startContent={!deleting && <Icon icon="solar:trash-bin-trash-bold-duotone" />}
            >
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal editar usuario */}
      <Modal
        isOpen={!!editModal}
        onOpenChange={(open) => !open && setEditModal(null)}
        size="lg"
        backdrop="blur"
        classNames={{
          base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl",
          header: "border-b border-white/[0.08] !text-white font-sora font-bold",
          body: "!text-white/95",
          footer: "border-t border-white/[0.08]",
          closeButton: "!text-white/90 hover:!bg-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <Icon icon="solar:pen-bold-duotone" className="text-[#9b74ff] text-2xl" />
            Editar usuario
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Nombre"
              placeholder="Nombre"
              value={editForm.first_name}
              onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
              classNames={{
                input: "text-white",
                inputWrapper: inputDark,
                label: "text-white/70",
              }}
            />
            <Input
              label="Apellido"
              placeholder="Apellido"
              value={editForm.last_name}
              onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
              classNames={{
                input: "text-white",
                inputWrapper: inputDark,
                label: "text-white/70",
              }}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@ejemplo.com"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              classNames={{
                input: "text-white",
                inputWrapper: inputDark,
                label: "text-white/70",
              }}
            />
          </ModalBody>
          <ModalFooter className="gap-2">
            <Button variant="light" className="text-white/80" onPress={() => setEditModal(null)} isDisabled={patching === editModal?.id}>
              Cancelar
            </Button>
            <Button
              className="btn-newayzi-primary"
              onPress={handleEditSave}
              isLoading={patching === editModal?.id}
              isDisabled={!editForm.email.trim()}
            >
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </GlassCard>
  );
}

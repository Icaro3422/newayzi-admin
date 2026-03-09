"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type AdminUserListItem, type AdminRole } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

const ROLES: { value: AdminRole; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "visualizador", label: "Visualizador" },
  { value: "comercial", label: "Comercial" },
  { value: "operador", label: "Operador" },
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
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export function UsersList() {
  const { canAccess } = useAdmin();
  const canEdit = canAccess("users");
  const [list, setList] = useState<AdminUserListItem[]>([]);
  const [operators, setOperators] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState<number | null>(null);

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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Button,
  Chip,
  Spinner,
} from "@heroui/react";
import { adminApi, type AdminUserListItem, type AdminRole } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

const ROLES: { value: AdminRole; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "visualizador", label: "Visualizador" },
  { value: "comercial", label: "Comercial" },
  { value: "operador", label: "Operador" },
];

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
      <div className="flex justify-center py-8">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return (
    <Table aria-label="Usuarios" classNames={{ wrapper: "border border-semantic-surface-border rounded-lg" }}>
      <TableHeader>
        <TableColumn>Usuario</TableColumn>
        <TableColumn>Email</TableColumn>
        <TableColumn>Loyalty</TableColumn>
        <TableColumn>Rol</TableColumn>
        <TableColumn>Operador</TableColumn>
      </TableHeader>
      <TableBody>
        {list.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-semantic-text-muted">
              No hay usuarios con perfil en el backend. El endpoint GET /api/admin/users/ debe devolver perfiles (CRM).
            </TableCell>
          </TableRow>
        ) : (
          list.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                {u.first_name} {u.last_name}
              </TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Chip size="sm" variant="flat" color="secondary">
                  {u.loyalty_level ?? "member"} · {u.loyalty_points ?? 0} pts
                </Chip>
              </TableCell>
              <TableCell>
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
                  >
                    {(item) => <SelectItem key={item.value}>{item.label}</SelectItem>}
                  </Select>
                ) : (
                  <Chip size="sm">{u.role ?? "—"}</Chip>
                )}
              </TableCell>
              <TableCell>
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
                  >
                    {(item) => <SelectItem key={String(item.id)}>{item.name}</SelectItem>}
                  </Select>
                ) : (
                  u.operator_name ?? "—"
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

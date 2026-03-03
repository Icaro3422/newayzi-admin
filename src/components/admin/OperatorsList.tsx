"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type Operator } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function OperatorsList({ refreshKey = 0 }: { refreshKey?: number }) {
  const { canAccess } = useAdmin();
  const canEdit = canAccess("operators");
  const [list, setList] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getOperators()
      .then((res) => setList(res?.results ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table aria-label="Operadores" classNames={{ wrapper: "border border-semantic-surface-border rounded-lg" }}>
        <TableHeader>
          <TableColumn>Nombre</TableColumn>
          <TableColumn>Contacto</TableColumn>
          <TableColumn>Conexiones</TableColumn>
          <TableColumn>Estado</TableColumn>
          {canEdit && <TableColumn align="end">Acciones</TableColumn>}
        </TableHeader>
        <TableBody>
          {list.map((op) => (
            <TableRow key={op.id}>
              <TableCell>
                <Link
                  href={`/admin/operators/${op.id}`}
                  className="font-medium text-newayzi-han-purple hover:underline"
                >
                  {op.name}
                </Link>
              </TableCell>
              <TableCell>{op.contact_email || op.contact_phone || "—"}</TableCell>
              <TableCell>{op.connections_count ?? 0}</TableCell>
              <TableCell>
                <Chip size="sm" color={op.is_active ? "success" : "default"}>
                  {op.is_active ? "Activo" : "Inactivo"}
                </Chip>
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <Button as={Link} href={`/admin/operators/${op.id}`} size="sm" variant="flat">
                    Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {list.length === 0 && (
        <p className="text-center text-sm text-semantic-text-muted py-8">
          No hay operadores. Solo el super-admin puede crear operadores.
        </p>
      )}
    </div>
  );
}

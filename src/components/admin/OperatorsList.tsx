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
      <Table aria-label="Operadores" classNames={{ wrapper: "border border-gray-200/60 rounded-[20px] shadow-sm bg-white/90 backdrop-blur-sm overflow-hidden" }}>
        <TableHeader>
          {[
            <TableColumn key="nombre">Nombre</TableColumn>,
            <TableColumn key="contacto">Contacto</TableColumn>,
            <TableColumn key="conexiones">Conexiones</TableColumn>,
            <TableColumn key="estado">Estado</TableColumn>,
            ...(canEdit ? [<TableColumn key="acciones" align="end">Acciones</TableColumn>] : []),
          ]}
        </TableHeader>
        <TableBody>
          {list.map((op) => (
            <TableRow key={op.id}>
              {[
                <TableCell key="nombre">
                  <Link
                    href={`/admin/operators/${op.id}`}
                    className="font-medium text-newayzi-han-purple hover:underline"
                  >
                    {op.name}
                  </Link>
                </TableCell>,
                <TableCell key="contacto">{op.contact_email || op.contact_phone || "—"}</TableCell>,
                <TableCell key="conexiones">{op.connections_count ?? 0}</TableCell>,
                <TableCell key="estado">
                  <Chip size="sm" color={op.is_active ? "success" : "default"}>
                    {op.is_active ? "Activo" : "Inactivo"}
                  </Chip>
                </TableCell>,
                ...(canEdit
                  ? [
                      <TableCell key="acciones" className="text-right">
                        <Button as={Link} href={`/admin/operators/${op.id}`} size="sm" variant="flat">
                          Editar
                        </Button>
                      </TableCell>,
                    ]
                  : []),
              ]}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {list.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-8">
          No hay operadores. Solo el super-admin puede crear operadores.
        </p>
      )}
    </div>
  );
}

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
  Chip,
  Spinner,
} from "@heroui/react";
import { adminApi, type Agency } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function AgenciesList({ refreshKey = 0 }: { refreshKey?: number }) {
  const { canAccess } = useAdmin();
  const [list, setList] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getAgencies()
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
      <Table aria-label="Agentes" classNames={{ wrapper: "border border-semantic-surface-border rounded-lg" }}>
        <TableHeader>
          <TableColumn>Nombre</TableColumn>
          <TableColumn>Contacto</TableColumn>
          <TableColumn>Nivel</TableColumn>
          <TableColumn>Ventas</TableColumn>
          <TableColumn>Comisión</TableColumn>
          <TableColumn>Reservas</TableColumn>
          <TableColumn>Estado</TableColumn>
          <TableColumn align="end">Acciones</TableColumn>
        </TableHeader>
        <TableBody>
          {list.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Link
                  href={`/admin/agents/${a.id}`}
                  className="font-medium text-newayzi-han-purple hover:underline"
                >
                  {a.name}
                </Link>
              </TableCell>
              <TableCell>{a.contact_email || a.contact_phone || "—"}</TableCell>
              <TableCell>{a.level_name ?? "—"}</TableCell>
              <TableCell>{formatCurrency(a.total_sales)}</TableCell>
              <TableCell>{formatCurrency(a.total_commission)}</TableCell>
              <TableCell>{a.bookings_count}</TableCell>
              <TableCell>
                <Chip size="sm" color={a.is_active ? "success" : "default"}>
                  {a.is_active ? "Activo" : "Inactivo"}
                </Chip>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/agents/${a.id}`}
                  className="text-sm font-medium text-newayzi-han-purple hover:underline"
                >
                  Ver detalle
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {list.length === 0 && (
        <p className="py-8 text-center text-sm text-semantic-text-muted">
          No hay agencias. Usa &quot;Invitar agente&quot; para crear una nueva.
        </p>
      )}
    </div>
  );
}

function formatCurrency(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

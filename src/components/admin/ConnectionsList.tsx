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
import { adminApi, type PMSConnectionListItem } from "@/lib/admin-api";

export function ConnectionsList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [list, setList] = useState<PMSConnectionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getConnections()
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
    <Table aria-label="Conexiones PMS" classNames={{ wrapper: "border border-gray-200/60 rounded-[20px] shadow-sm bg-white/90 backdrop-blur-sm overflow-hidden" }}>
      <TableHeader>
        <TableColumn>Nombre</TableColumn>
        <TableColumn>Tipo PMS</TableColumn>
        <TableColumn>Operador</TableColumn>
        <TableColumn>Sincronizadas / Pendientes / No disp.</TableColumn>
        <TableColumn>Estado</TableColumn>
        <TableColumn>Última sync</TableColumn>
        <TableColumn align="end">Acciones</TableColumn>
      </TableHeader>
      <TableBody>
        {list.map((c) => (
          <TableRow key={c.id}>
            <TableCell>{c.name || c.pms_type}</TableCell>
            <TableCell>{c.pms_type_display || c.pms_type}</TableCell>
            <TableCell>{c.operator_name ?? "—"}</TableCell>
            <TableCell className="text-sm">
              {c.counts ? (
                <span className="text-gray-500">
                  Prop: {c.counts.properties_synced} sinc. / {c.counts.properties_pending} pend. / {c.counts.properties_disabled} no disp.
                  <br />
                  Rooms: {c.counts.room_types_synced} sinc. / {c.counts.room_types_pending} pend. / {c.counts.room_types_disabled} no disp.
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>
              <Chip size="sm" color={c.is_active ? "success" : "default"}>
                {c.is_active ? "Activa" : "Inactiva"}
              </Chip>
            </TableCell>
            <TableCell>
              {c.last_sync_at
                ? new Date(c.last_sync_at).toLocaleString("es")
                : "—"}
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/admin/connections/${c.id}`}
                className="text-sm font-medium text-newayzi-han-purple hover:underline"
              >
                Ver detalle
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

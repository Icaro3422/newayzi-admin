"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Spinner,
} from "@heroui/react";
import { adminApi, type AvailabilityItem } from "@/lib/admin-api";

export function AvailabilityList() {
  const [list, setList] = useState<AvailabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [propertyId, setPropertyId] = useState("");

  function load() {
    setLoading(true);
    const params: { date_from?: string; date_to?: string; property_id?: number } = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const pid = parseInt(propertyId, 10);
    if (!Number.isNaN(pid)) params.property_id = pid;
    adminApi.getAvailability(params).then((res) => {
      setList(res?.results ?? []);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <Input
          label="Desde (fecha)"
          type="date"
          value={dateFrom}
          onValueChange={setDateFrom}
          size="sm"
          className="w-40"
        />
        <Input
          label="Hasta (fecha)"
          type="date"
          value={dateTo}
          onValueChange={setDateTo}
          size="sm"
          className="w-40"
        />
        <Input
          label="ID propiedad"
          placeholder="Opcional"
          value={propertyId}
          onValueChange={setPropertyId}
          size="sm"
          className="w-32"
        />
        <Button color="primary" size="sm" onPress={load}>
          Filtrar
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" color="primary" />
        </div>
      ) : (
        <Table aria-label="Disponibilidad" classNames={{ wrapper: "border border-semantic-surface-border rounded-lg" }}>
          <TableHeader>
            <TableColumn>Propiedad</TableColumn>
            <TableColumn>Tipo habitación</TableColumn>
            <TableColumn>Fecha</TableColumn>
            <TableColumn>Disponibles</TableColumn>
            <TableColumn>Fuente</TableColumn>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-semantic-text-muted">
                  No hay datos de disponibilidad. Ajusta filtros o espera sincronización PMS.
                </TableCell>
              </TableRow>
            ) : (
              list.map((a) => (
                <TableRow key={`${a.property_id}-${a.room_type_id}-${a.date}`}>
                  <TableCell>{a.property_name}</TableCell>
                  <TableCell>{a.room_type_name}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{a.available}</TableCell>
                  <TableCell>{a.source}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

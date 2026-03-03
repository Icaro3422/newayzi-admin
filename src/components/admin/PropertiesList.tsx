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
  Select,
  SelectItem,
  Input,
  Spinner,
} from "@heroui/react";
import { adminApi, type PropertyListItem, type PMSConnectionListItem } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function PropertiesList() {
  const { canEditProperty } = useAdmin();
  const [list, setList] = useState<PropertyListItem[]>([]);
  const [connections, setConnections] = useState<PMSConnectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterCity, setFilterCity] = useState("");
  const [filterPms, setFilterPms] = useState<string>("all");
  const [patching, setPatching] = useState<number | null>(null);

  useEffect(() => {
    adminApi
      .getConnections()
      .then((res) => setConnections(res?.results ?? []))
      .catch(() => setConnections([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: { is_active?: boolean; city?: string; pms_connection_id?: number } = {};
        if (filterActive === "true") params.is_active = true;
        if (filterActive === "false") params.is_active = false;
        if (filterCity.trim()) params.city = filterCity.trim();
        if (filterPms !== "all") params.pms_connection_id = parseInt(filterPms, 10);
        const res = await adminApi.getProperties(params);
        if (cancelled) return;
        setList(res?.results ?? []);
      } catch {
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filterActive, filterCity, filterPms]);

  async function togglePublished(p: PropertyListItem) {
    if (!canEditProperty) return;
    setPatching(p.id);
    try {
      await adminApi.patchProperty(p.id, { is_published: !p.is_published });
      setList((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, is_published: !x.is_published } : x
        )
      );
    } finally {
      setPatching(null);
    }
  }

  async function toggleActive(p: PropertyListItem) {
    if (!canEditProperty) return;
    setPatching(p.id);
    try {
      await adminApi.patchProperty(p.id, { is_active: !p.is_active });
      setList((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x))
      );
    } finally {
      setPatching(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select
          label="Estado"
          selectedKeys={[filterActive]}
          onSelectionChange={(s) => setFilterActive(Array.from(s)[0] as string)}
          className="w-40"
          size="sm"
        >
          <SelectItem key="all">Todos</SelectItem>
          <SelectItem key="true">Activos</SelectItem>
          <SelectItem key="false">Inactivos</SelectItem>
        </Select>
        <Input
          label="Ciudad"
          placeholder="Filtrar por ciudad"
          value={filterCity}
          onValueChange={setFilterCity}
          className="w-48"
          size="sm"
        />
        <Select
          label="PMS"
          selectedKeys={[filterPms]}
          onSelectionChange={(s) => setFilterPms(Array.from(s)[0] as string)}
          className="w-52"
          size="sm"
          placeholder="Todas las conexiones"
        >
          <SelectItem key="all">Todas las conexiones</SelectItem>
          {connections.map((c) => (
            <SelectItem key={String(c.id)}>
              {c.name || c.pms_type_display || c.pms_type}
            </SelectItem>
          ))}
        </Select>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" color="primary" />
        </div>
      ) : (
        <Table aria-label="Propiedades" classNames={{ wrapper: "border border-semantic-surface-border rounded-lg" }}>
          <TableHeader>
            <TableColumn>Nombre</TableColumn>
            <TableColumn>Ciudad</TableColumn>
            <TableColumn>Tipo</TableColumn>
            <TableColumn>Operador / PMS</TableColumn>
            <TableColumn>Activo</TableColumn>
            <TableColumn>Publicado</TableColumn>
            <TableColumn>Mascotas</TableColumn>
            {canEditProperty && <TableColumn align="end">Acciones</TableColumn>}
          </TableHeader>
          <TableBody>
            {list.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    href={`/admin/properties/${p.id}`}
                    className="font-medium text-newayzi-han-purple hover:underline"
                  >
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{p.city_name ?? "—"}</TableCell>
                <TableCell>{p.property_type}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    {p.operator_name && (
                      <span className="text-sm font-medium">{p.operator_name}</span>
                    )}
                    {p.pms_connections && p.pms_connections.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.pms_connections.map((c) => (
                          <Chip key={c.id} size="sm" variant="flat" color="secondary">
                            {c.name}
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-semantic-text-muted">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Chip size="sm" color={p.is_active ? "success" : "default"}>
                    {p.is_active ? "Sí" : "No"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip size="sm" color={p.is_published ? "primary" : "default"}>
                    {p.is_published ? "Sí" : "No"}
                  </Chip>
                </TableCell>
                <TableCell>{p.pets_allowed ? "Sí" : "No"}</TableCell>
                {canEditProperty && (
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="flat"
                      color={p.is_published ? "warning" : "primary"}
                      isLoading={patching === p.id}
                      onPress={() => togglePublished(p)}
                    >
                      {p.is_published ? "Ocultar" : "Publicar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color={p.is_active ? "danger" : "success"}
                      isLoading={patching === p.id}
                      onPress={() => toggleActive(p)}
                    >
                      {p.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!loading && list.length === 0 && (
        <p className="text-center text-sm text-semantic-text-muted py-8">
          No hay propiedades que coincidan con los filtros.
        </p>
      )}
    </div>
  );
}

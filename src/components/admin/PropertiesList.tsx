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

  const FILTER_CARD =
    "rounded-[28px] border border-gray-200/60 bg-white/90 backdrop-blur-sm shadow-md p-5";

  return (
    <div className="space-y-5">
      <div className={`${FILTER_CARD}`}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 font-sora">
          Filtros
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Estado"
            selectedKeys={[filterActive]}
            onSelectionChange={(s) => setFilterActive(Array.from(s)[0] as string)}
            className="w-40"
            size="sm"
            classNames={{
              trigger: "rounded-xl border-gray-200/80",
            }}
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
            classNames={{
              inputWrapper: "rounded-xl border-gray-200/80",
            }}
          />
          <Select
            label="PMS"
            selectedKeys={[filterPms]}
            onSelectionChange={(s) => setFilterPms(Array.from(s)[0] as string)}
            className="w-52"
            size="sm"
            placeholder="Todas las conexiones"
            items={[{ id: "all", name: "Todas las conexiones" }, ...connections.map((c) => ({ id: String(c.id), name: c.name || c.pms_type_display || c.pms_type }))]}
            classNames={{
              trigger: "rounded-xl border-gray-200/80",
            }}
          >
            {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
          </Select>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-gray-300 bg-white/80 backdrop-blur-sm p-12 text-center">
          <p className="font-sora font-medium text-newayzi-jet">Sin resultados</p>
          <p className="mt-2 text-sm text-gray-500">
            No hay propiedades que coincidan con los filtros.
          </p>
        </div>
      ) : (
        <Table
          aria-label="Propiedades"
          classNames={{
            wrapper:
              "border border-gray-200/60 rounded-[28px] shadow-md bg-white/90 backdrop-blur-sm overflow-hidden hover:shadow-lg transition-shadow duration-300",
          }}
        >
          <TableHeader>
            {[
              <TableColumn key="nombre">Nombre</TableColumn>,
              <TableColumn key="ciudad">Ciudad</TableColumn>,
              <TableColumn key="tipo">Tipo</TableColumn>,
              <TableColumn key="operador">Operador / PMS</TableColumn>,
              <TableColumn key="activo">Activo</TableColumn>,
              <TableColumn key="publicado">Publicado</TableColumn>,
              <TableColumn key="mascotas">Mascotas</TableColumn>,
              ...(canEditProperty ? [<TableColumn key="acciones" align="end">Acciones</TableColumn>] : []),
            ]}
          </TableHeader>
          <TableBody>
            {list.map((p) => (
              <TableRow key={p.id}>
                {[
                  <TableCell key="nombre">
                    <Link
                      href={`/admin/properties/${p.id}`}
                      className="font-medium text-newayzi-majorelle hover:text-newayzi-han-purple hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>,
                  <TableCell key="ciudad">{p.city_name ?? "—"}</TableCell>,
                  <TableCell key="tipo">{p.property_type}</TableCell>,
                  <TableCell key="operador">
                    <div className="flex flex-col gap-0.5">
                      {p.operator_name && (
                        <span className="text-sm font-medium text-newayzi-jet">{p.operator_name}</span>
                      )}
                      {p.pms_connections && p.pms_connections.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {p.pms_connections.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center rounded-full bg-gradient-to-r from-newayzi-han-purple/90 to-newayzi-majorelle/90 px-2.5 py-0.5 text-xs font-semibold text-white shadow-[0_1px_4px_rgba(94,44,236,0.25)]"
                            >
                              {c.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </div>
                  </TableCell>,
                  <TableCell key="activo">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.is_active
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-[0_1px_4px_rgba(16,185,129,0.3)]"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.is_active ? "Sí" : "No"}
                    </span>
                  </TableCell>,
                  <TableCell key="publicado">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.is_published
                          ? "bg-gradient-to-r from-newayzi-han-purple to-newayzi-majorelle text-white shadow-[0_1px_4px_rgba(94,44,236,0.25)]"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.is_published ? "Sí" : "No"}
                    </span>
                  </TableCell>,
                  <TableCell key="mascotas">{p.pets_allowed ? "Sí" : "No"}</TableCell>,
                  ...(canEditProperty
                    ? [
                        <TableCell key="acciones" className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className={
                              p.is_published
                                ? "btn-action-amber bg-amber-600 hover:bg-amber-700 rounded-xl font-semibold shadow-[0_1px_4px_rgba(217,119,6,0.3)]"
                                : "btn-newayzi-primary rounded-xl"
                            }
                            isLoading={patching === p.id}
                            onPress={() => togglePublished(p)}
                          >
                            {p.is_published ? "Ocultar" : "Publicar"}
                          </Button>
                          <Button
                            size="sm"
                            className={
                              p.is_active
                                ? "btn-action-red bg-red-600 hover:bg-red-700 rounded-xl font-semibold shadow-[0_1px_4px_rgba(220,38,38,0.3)]"
                                : "btn-action-green bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-[0_1px_4px_rgba(5,150,105,0.3)]"
                            }
                            isLoading={patching === p.id}
                            onPress={() => toggleActive(p)}
                          >
                            {p.is_active ? "Desactivar" : "Activar"}
                          </Button>
                        </TableCell>,
                      ]
                    : []),
                ]}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type AgencyDetail } from "@/lib/admin-api";

export function AgencyDetailClient() {
  const params = useParams();
  const id = Number(params?.id);
  const [agency, setAgency] = useState<AgencyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminApi.getAgency(id).then((data) => {
      setAgency(data ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 shadow-sm bg-white/90 backdrop-blur-sm p-6">
        <p className="text-gray-500">Agencia no encontrada.</p>
        <Link href="/admin/agents" className="mt-2 inline-block text-sm text-newayzi-han-purple hover:underline">
          Volver a Agentes
        </Link>
      </div>
    );
  }

  const s = agency.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/agents"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-newayzi-han-purple"
        >
          <Icon icon="solar:arrow-left-outline" width={18} />
          Agentes
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-newayzi-jet">{agency.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {agency.contact_email || agency.contact_phone || "Sin contacto"}
          </p>
        </div>
        <Chip size="lg" color={agency.is_active ? "success" : "default"}>
          {agency.is_active ? "Activo" : "Inactivo"}
        </Chip>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200/60 rounded-[20px] shadow-sm bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-0">
            <span className="text-sm font-medium text-gray-500">Nivel</span>
          </CardHeader>
          <CardBody className="pt-2">
            <p className="text-xl font-semibold">{agency.level_name ?? "—"}</p>
          </CardBody>
        </Card>
        <Card className="border border-gray-200/60 rounded-[20px] shadow-sm bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-0">
            <span className="text-sm font-medium text-gray-500">Ventas totales</span>
          </CardHeader>
          <CardBody className="pt-2">
            <p className="text-xl font-semibold">{formatCurrency(s.total_sales)}</p>
          </CardBody>
        </Card>
        <Card className="border border-gray-200/60 rounded-[20px] shadow-sm bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-0">
            <span className="text-sm font-medium text-gray-500">Comisión generada</span>
          </CardHeader>
          <CardBody className="pt-2">
            <p className="text-xl font-semibold text-newayzi-han-purple">{formatCurrency(s.total_commission)}</p>
          </CardBody>
        </Card>
        <Card className="border border-gray-200/60 rounded-[20px] shadow-sm bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-0">
            <span className="text-sm font-medium text-gray-500">Reservas</span>
          </CardHeader>
          <CardBody className="pt-2">
            <p className="text-xl font-semibold">{s.bookings_count}</p>
          </CardBody>
        </Card>
      </div>

      <Card className="border border-gray-200/60 rounded-[20px] shadow-sm bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <span className="font-medium">Resumen de negocio</span>
        </CardHeader>
        <CardBody className="pt-0">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">Ventas totales (reservas confirmadas)</dt>
              <dd className="font-medium">{formatCurrency(s.total_sales)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Comisión acumulada</dt>
              <dd className="font-medium">{formatCurrency(s.total_commission)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Número de reservas</dt>
              <dd className="font-medium">{s.bookings_count}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="font-medium">{s.updated_at ? new Date(s.updated_at).toLocaleString("es-CO") : "—"}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}

function formatCurrency(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

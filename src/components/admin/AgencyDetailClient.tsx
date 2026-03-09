"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type AgencyDetail } from "@/lib/admin-api";

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

function formatCurrency(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

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
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner
          size="lg"
          classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }}
        />
      </GlassCard>
    );
  }

  if (!agency) {
    return (
      <GlassCard>
        <p className="text-white/70 font-sora">Agencia no encontrada.</p>
        <Link
          href="/admin/agents"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#9b74ff] hover:text-[#b89eff] transition-colors"
        >
          <Icon icon="solar:arrow-left-outline" width={18} />
          Volver a Agentes
        </Link>
      </GlassCard>
    );
  }

  const s = agency.summary;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/agents"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white transition-colors"
      >
        <Icon icon="solar:arrow-left-outline" width={18} />
        Agentes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white font-sora">{agency.name}</h1>
          <p className="mt-1 text-sm text-white/50">
            {agency.contact_email || agency.contact_phone || "Sin contacto"}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
            agency.is_active
              ? "bg-emerald-500/25 border border-emerald-400/30 text-emerald-300"
              : "bg-white/10 text-white/50"
          }`}
        >
          {agency.is_active ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Nivel</span>
          <p className="mt-2 text-xl font-semibold text-white">{agency.level_name ?? "—"}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Ventas totales
          </span>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(s.total_sales)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Comisión generada
          </span>
          <p className="mt-2 text-xl font-semibold text-[#b89eff]">
            {formatCurrency(s.total_commission)}
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Reservas
          </span>
          <p className="mt-2 text-xl font-semibold text-white">{s.bookings_count}</p>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="font-sora font-bold text-white text-base mb-4">Resumen de negocio</h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-white/50">Ventas totales (reservas confirmadas)</dt>
            <dd className="font-medium text-white mt-1">{formatCurrency(s.total_sales)}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/50">Comisión acumulada</dt>
            <dd className="font-medium text-white mt-1">{formatCurrency(s.total_commission)}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/50">Número de reservas</dt>
            <dd className="font-medium text-white mt-1">{s.bookings_count}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/50">Última actualización</dt>
            <dd className="font-medium text-white mt-1">
              {s.updated_at ? new Date(s.updated_at).toLocaleString("es-CO") : "—"}
            </dd>
          </div>
        </dl>
      </GlassCard>
    </div>
  );
}

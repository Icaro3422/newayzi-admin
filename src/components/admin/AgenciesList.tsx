"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type Agency } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

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

function formatCurrency(value: string | undefined): string {
  const n = parseFloat(value ?? "");
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function AgenciesList({
  refreshKey = 0,
  onRefresh,
}: {
  refreshKey?: number;
  onRefresh?: () => void;
}) {
  const { me } = useAdmin();
  const isOperator = me?.role === "operador";
  const isSuperAdmin = me?.role === "super_admin";
  const canManage = isOperator || isSuperAdmin;
  const [list, setList] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Agency | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

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
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner
          size="lg"
          classNames={{ circle1: "border-b-[#b89a5e]", circle2: "border-b-[#b89a5e]" }}
        />
      </GlassCard>
    );
  }

  if (list.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#b89a5e]/20 border border-[#b89a5e]/30 flex items-center justify-center mb-4">
          <Icon icon="solar:bag-4-bold-duotone" className="text-[#d4b97a] text-2xl" />
        </div>
        <p className="font-sora font-bold text-white text-base">No hay agencias</p>
        <p className="mt-2 text-sm text-white/50">
          Usa &quot;Invitar agente&quot; para crear una nueva.
        </p>
      </GlassCard>
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteErr(null);
    try {
      await adminApi.deleteAgency(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh?.();
      setList((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al eliminar";
      setDeleteErr(msg.replace(/^API \d+: /, "").slice(0, 240));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
    <GlassCard className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Nombre
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Contacto
              </th>
              {!isOperator && (
                <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                  Nivel
                </th>
              )}
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Ventas
              </th>
              {!isOperator && (
                <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                  Comisión
                </th>
              )}
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Reservas
              </th>
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Estado
              </th>
              <th className="text-right py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr
                key={a.id}
                className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-4 px-5">
                  <Link
                    href={`/admin/agents/${a.id}`}
                    className="font-sora font-semibold text-[#d4b97a] hover:text-[#f0e6d2] transition-colors"
                  >
                    {a.name}
                  </Link>
                </td>
                <td className="py-4 px-5 text-white/70 text-sm">
                  {a.contact_email || a.contact_phone || "—"}
                </td>
                {!isOperator && (
                  <td className="py-4 px-5 text-white/70 text-sm">{a.level_name ?? "—"}</td>
                )}
                <td className="py-4 px-5 text-white/70 text-sm">{formatCurrency(a.total_sales)}</td>
                {!isOperator && (
                  <td className="py-4 px-5 text-white/70 text-sm">
                    {formatCurrency(a.total_commission)}
                  </td>
                )}
                <td className="py-4 px-5 text-white/70 text-sm">{a.bookings_count}</td>
                <td className="py-4 px-5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${
                      a.is_active
                        ? "bg-emerald-500/25 border border-emerald-400/30 text-emerald-300"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {a.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="py-4 px-5 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      as={Link}
                      href={`/admin/agents/${a.id}`}
                      size="sm"
                      className="rounded-xl bg-[#b89a5e]/25 border border-[#b89a5e]/40 text-[#f0e6d2] hover:bg-[#b89a5e]/35 font-semibold"
                    >
                      Ver detalle
                    </Button>
                    {canManage && (
                      <Button
                        size="sm"
                        className="rounded-xl bg-red-500/15 border border-red-500/35 text-red-300 hover:bg-red-500/25 font-semibold"
                        onPress={() => {
                          setDeleteErr(null);
                          setDeleteTarget(a);
                        }}
                        startContent={<Icon icon="solar:trash-bin-trash-bold" width={16} />}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>

    <Modal
      isOpen={!!deleteTarget}
      onOpenChange={(open) => {
        if (!open) {
          setDeleteTarget(null);
          setDeleteErr(null);
        }
      }}
      backdrop="blur"
      classNames={{
        base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/50",
        header: "border-b border-white/[0.08] !text-white",
        body: "!text-white/95",
        footer: "border-t border-white/[0.08]",
        closeButton: "!text-white/90 hover:!bg-white/10 rounded-full",
        backdrop: "!bg-black/70 backdrop-blur-md",
      }}
    >
      <ModalContent>
        <ModalHeader>Eliminar agencia</ModalHeader>
        <ModalBody className="py-4">
          <p className="text-sm text-white/70">
            ¿Eliminar <strong className="text-white">{deleteTarget?.name}</strong>? Se revoca el acceso en Clerk y se
            borra el perfil del usuario en el sistema.
          </p>
          {deleteErr && <p className="mt-3 text-sm text-red-300">{deleteErr}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" className="text-white/80" onPress={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button
            className="bg-red-600 text-white font-semibold"
            isLoading={deleteBusy}
            onPress={confirmDelete}
          >
            Eliminar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  );
}

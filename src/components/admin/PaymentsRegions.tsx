"use client";

import { useEffect, useState } from "react";
import { Switch, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type PaymentMethod, type Region } from "@/lib/admin-api";
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

export function PaymentsRegions() {
  const { canAccess } = useAdmin();
  const canEdit = canAccess("payments");
  const [regions, setRegions] = useState<Region[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [regionMethods, setRegionMethods] = useState<Record<string, Record<number, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.getRegions(),
      adminApi.getPaymentMethods(),
    ]).then(([regs, meths]) => {
      setRegions(regs ?? []);
      setMethods(meths ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (regions.length === 0) return;
    let cancelled = false;
    const loads = regions.map(async (r) => {
      const list = await adminApi.getRegionPaymentMethods(r.id);
      if (cancelled) return;
      setRegionMethods((prev) => {
        const next = { ...prev };
        next[r.id] = {};
        list?.forEach((rm) => {
          if (rm.payment_method_id) next[r.id][rm.payment_method_id] = rm.is_active;
          else if (rm.payment_method) next[r.id][rm.payment_method.id] = rm.is_active;
        });
        return next;
      });
    });
    Promise.all(loads);
    return () => {
      cancelled = true;
    };
  }, [regions.length, methods.length]);

  async function toggle(regionId: number, methodId: number, is_active: boolean) {
    if (!canEdit) return;
    const k = `${regionId}-${methodId}`;
    setToggling(k);
    try {
      await adminApi.patchRegionPaymentMethod(regionId, methodId, is_active);
      setRegionMethods((prev) => ({
        ...prev,
        [regionId]: { ...prev[regionId], [methodId]: is_active },
      }));
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
      </GlassCard>
    );
  }

  if (regions.length === 0 || methods.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 flex items-center justify-center mb-4">
          <Icon icon="solar:card-recive-bold-duotone" className="text-[#9b74ff] text-2xl" />
        </div>
        <p className="font-sora font-bold text-white text-base">No hay regiones o métodos de pago configurados</p>
        <p className="mt-2 text-sm text-white/50 max-w-md">
          Crea los modelos Region, PaymentMethod y RegionPaymentMethod en el backend.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.08]">
        <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
          <Icon icon="solar:card-recive-bold-duotone" className="text-[#9b74ff] text-base" />
        </div>
        <div>
          <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Configuración</p>
          <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
            Activa o desactiva cada método por región
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold">
                Región
              </th>
              {methods.map((m) => (
                <th
                  key={m.id}
                  className="text-center py-4 px-5 text-white/50 text-[0.65rem] uppercase tracking-[0.12em] font-semibold"
                >
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr
                key={r.id}
                className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-4 px-5 font-sora font-semibold text-white/90">
                  {r.name}
                  {r.country_code && (
                    <span className="ml-1.5 text-white/50 text-sm font-normal">({r.country_code})</span>
                  )}
                </td>
                {methods.map((m) => (
                  <td key={m.id} className="py-4 px-5 text-center">
                    <Switch
                      isSelected={regionMethods[r.id]?.[m.id] ?? false}
                      onValueChange={(v) => toggle(r.id, m.id, v)}
                      isDisabled={!canEdit || toggling === `${r.id}-${m.id}`}
                      color="primary"
                      classNames={{
                        wrapper: "group-data-[selected=true]:bg-[#5e2cec]",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

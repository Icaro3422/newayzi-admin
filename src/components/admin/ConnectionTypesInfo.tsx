"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { adminApi, type PMSConnectionType } from "@/lib/admin-api";

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

export function ConnectionTypesInfo() {
  const [types, setTypes] = useState<PMSConnectionType[]>([]);

  useEffect(() => {
    adminApi.getConnectionTypes().then((res) => {
      setTypes(res?.results ?? []);
    });
  }, []);

  if (types.length === 0) return null;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
          <Icon icon="solar:link-circle-bold-duotone" className="text-[#9b74ff] text-base" />
        </div>
        <div>
          <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Tipos de conexión</p>
          <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
            Tipos de conexión PMS
          </p>
        </div>
      </div>
      <p className="text-sm text-white/70 mb-2">
        {types.map((t) => `${t.label} (${t.code})`).join(" · ")}
      </p>
      <p className="text-xs text-white/50">
        <strong className="text-white/70">API genérica:</strong> permite conectar cualquier PMS con URL de API, usuario y contraseña (Booking, OTAs, sistemas propios, etc.).
      </p>
    </GlassCard>
  );
}

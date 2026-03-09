"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Icon } from "@iconify/react";
import { useAdmin } from "@/contexts/AdminContext";

function pathnameToModule(pathname: string): string | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/profile")) return "profile";
  if (pathname.startsWith("/admin/properties")) return "properties";
  if (pathname.startsWith("/admin/connections")) return "connections";
  if (pathname.startsWith("/admin/operators")) return "operators";
  if (pathname.startsWith("/admin/agents")) return "agents";
  if (pathname.startsWith("/admin/availability")) return "availability";
  if (pathname.startsWith("/admin/payments")) return "payments";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/communications")) return "communications";
  return null;
}

const navItems: { href: string; label: string; icon: string; module: string }[] = [
  { href: "/admin",              label: "Dashboard",       icon: "solar:home-2-bold-duotone",                 module: "dashboard"     },
  { href: "/admin/profile",      label: "Mi perfil",       icon: "solar:user-circle-bold-duotone",            module: "profile"       },
  { href: "/admin/properties",   label: "Propiedades",     icon: "solar:buildings-2-bold-duotone",            module: "properties"    },
  { href: "/admin/connections",  label: "Conexiones PMS",  icon: "solar:link-circle-bold-duotone",            module: "connections"   },
  { href: "/admin/operators",    label: "Operadores",      icon: "solar:users-group-rounded-bold-duotone",    module: "operators"     },
  { href: "/admin/agents",       label: "Agentes",         icon: "solar:bag-4-bold-duotone",                  module: "agents"        },
  { href: "/admin/availability", label: "Disponibilidad",  icon: "solar:calendar-bold-duotone",               module: "availability"  },
  { href: "/admin/payments",     label: "Pagos",           icon: "solar:wallet-money-bold-duotone",           module: "payments"      },
  { href: "/admin/users",        label: "Usuarios",        icon: "solar:user-id-bold-duotone",                module: "users"         },
  { href: "/admin/communications", label: "Comunicaciones", icon: "solar:letter-bold-duotone",               module: "communications"},
];

const BG_GRADIENT = "radial-gradient(ellipse 110% 80% at 20% 15%, #1e1060 0%, #0c0720 45%, #050310 100%)";
const GLOW_1     = "radial-gradient(circle, rgba(94,44,236,0.18) 0%, transparent 70%)";
const GLOW_2     = "radial-gradient(circle, rgba(66,45,246,0.10) 0%, transparent 70%)";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { canAccess, loading, error } = useAdmin();
  const items = navItems.filter((item) => canAccess(item.module));

  useEffect(() => {
    if (loading || error) return;
    const module = pathnameToModule(pathname);
    if (module && !canAccess(module)) router.replace("/admin");
  }, [pathname, canAccess, loading, error, router]);

  const shellBg = (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <div style={{ background: GLOW_1 }} className="absolute top-[-8%] left-[15%] w-[50%] h-[50%]" />
      <div style={{ background: GLOW_2 }} className="absolute bottom-0 right-[5%] w-[35%] h-[45%]" />
      <img
        src="/brand/n-patron-black.svg"
        alt=""
        className="absolute bottom-0 right-0 w-[48%] h-[60%] object-contain object-right-bottom"
        style={{ filter: "invert(1)", opacity: 0.022 }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-sora" style={{ background: BG_GRADIENT }}>
        {shellBg}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
            <img src="/brand/n-patron-black.svg" style={{ filter: "invert(1)" }} width={24} height={24} alt="" />
          </div>
          <p className="text-white/50 text-sm">Cargando sesión…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center font-sora" style={{ background: BG_GRADIENT }}>
        {shellBg}
        <div className="relative z-10 text-center px-8">
          <p className="text-red-400 font-medium">{error}</p>
          <p className="mt-2 text-sm text-white/35">Comprueba NEXT_PUBLIC_API_URL y que el backend exponga GET /api/admin/me/</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel flex h-screen font-sora overflow-hidden" style={{ background: BG_GRADIENT }}>
      {shellBg}

      {/* ── Sidebar ── */}
      <aside className="relative z-10 flex w-[220px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0c24]/70 backdrop-blur-2xl">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.07] px-5">
          <div className="w-8 h-8 rounded-xl bg-[#5e2cec]/25 border border-[#5e2cec]/30 flex items-center justify-center shrink-0">
            <img src="/brand/n-patron-black.svg" style={{ filter: "invert(1)" }} width={18} height={18} alt="Newayzi" />
          </div>
          <div className="min-w-0">
            <p className="font-sora font-bold text-white text-[0.9rem] leading-none tracking-[-0.02em]">Newayzi</p>
            <p className="font-sora text-white text-[0.6rem] mt-0.5 uppercase tracking-widest">Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.8125rem] font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-[#5e2cec]/20 text-white shadow-[inset_0_0_0_1px_rgba(94,44,236,0.28)]"
                    : "text-white/45 hover:text-white/85 hover:bg-white/[0.05]"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-[#5e2cec] rounded-r-full" />
                )}
                <Icon
                  icon={item.icon}
                  width={17}
                  className={`shrink-0 transition-colors ${isActive ? "text-[#7c4cff]" : "text-white/35 group-hover:text-white/60"}`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User button */}
        <div className="border-t border-white/[0.07] p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/50 hover:bg-white/[0.05] hover:text-white/70 transition-all duration-200">
            <div className="shrink-0">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
            <span className="text-[0.8125rem] font-medium truncate min-w-0">Mi cuenta</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="relative z-10 flex-1 overflow-auto">
        <div className="p-5 lg:p-7">
          {children}
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Icon } from "@iconify/react";
import { useAdmin } from "@/contexts/AdminContext";

/** Mapea pathname a módulo para verificar acceso */
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
  return null;
}

const navItems: { href: string; label: string; icon: string; module: string }[] = [
  { href: "/admin", label: "Dashboard", icon: "solar:home-2-outline", module: "dashboard" },
  { href: "/admin/profile", label: "Mi perfil", icon: "solar:user-circle-outline", module: "profile" },
  { href: "/admin/properties", label: "Propiedades", icon: "solar:buildings-2-outline", module: "properties" },
  { href: "/admin/connections", label: "Conexiones PMS", icon: "solar:link-circle-outline", module: "connections" },
  { href: "/admin/operators", label: "Operadores", icon: "solar:users-group-rounded-outline", module: "operators" },
  { href: "/admin/agents", label: "Agentes", icon: "solar:bag-4-outline", module: "agents" },
  { href: "/admin/availability", label: "Disponibilidad", icon: "solar:calendar-outline", module: "availability" },
  { href: "/admin/payments", label: "Pagos", icon: "solar:wallet-money-outline", module: "payments" },
  { href: "/admin/users", label: "Usuarios", icon: "solar:user-id-outline", module: "users" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess, loading, error } = useAdmin();
  const items = navItems.filter((item) => canAccess(item.module));

  // Redirigir si accede a una ruta sin permiso (ej. /admin/users como operador)
  useEffect(() => {
    if (loading || error) return;
    const module = pathnameToModule(pathname);
    if (module && !canAccess(module)) {
      router.replace("/admin");
    }
  }, [pathname, canAccess, loading, error, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
        <p className="text-gray-500 font-medium">Cargando sesión...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
        <div className="text-center">
          <p className="text-newayzi-red font-medium">{error}</p>
          <p className="mt-2 text-sm text-gray-500">Comprueba NEXT_PUBLIC_API_URL y que el backend exponga GET /api/admin/me/</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 font-sora">
      <aside className="flex w-60 flex-col border-r border-gray-200/80 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="flex h-16 items-center gap-3 border-b border-gray-200/80 px-5">
          <img
            src="/brand/n-patron-black.svg"
            alt="Newayzi"
            width={32}
            height={32}
            className="flex-shrink-0"
          />
          <span className="font-sora font-bold text-newayzi-jet text-lg">
            Newayzi <span className="text-gray-400 font-normal">|</span> Admin
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-newayzi-majorelle/10 text-newayzi-majorelle border-l-4 border-l-newayzi-majorelle rounded-l-none"
                    : "text-gray-600 hover:bg-gray-50 hover:text-newayzi-jet"
                }`}
              >
                <Icon
                  icon={item.icon}
                  width={22}
                  className={isActive ? "text-newayzi-majorelle" : ""}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200/80 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-newayzi-jet text-white font-sora font-bold text-sm">
            N
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto relative">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-4 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm px-6 shadow-sm">
          <UserButton afterSignOutUrl="/sign-in" />
        </header>
        <div className="relative p-6 lg:p-8">
          {/* Patrón N una sola vez por página */}
          <div
            className="absolute inset-0 w-full h-full opacity-[0.04] select-none pointer-events-none"
            aria-hidden
          >
            <img
              src="/brand/n-patron-black.svg"
              alt=""
              className="absolute bottom-0 right-0 w-[55%] h-[70%] object-contain object-right-bottom"
            />
          </div>
          <div className="relative z-10">{children}</div>
        </div>
      </main>
    </div>
  );
}

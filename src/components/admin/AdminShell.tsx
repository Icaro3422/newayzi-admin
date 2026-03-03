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
      <div className="flex h-screen items-center justify-center bg-semantic-surface-subdued">
        <p className="text-semantic-text-muted">Cargando sesión...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-semantic-surface-subdued">
        <div className="text-center">
          <p className="text-newayzi-red">{error}</p>
          <p className="mt-2 text-sm text-semantic-text-muted">Comprueba NEXT_PUBLIC_API_URL y que el backend exponga GET /api/admin/me/</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-semantic-surface-subdued">
      <aside className="flex w-56 flex-col border-r border-semantic-surface-border bg-white">
        <div className="flex h-14 items-center gap-2 border-b border-semantic-surface-border px-4">
          <img
            src="/brand/n-patron-black.svg"
            alt="Newayzi"
            width={28}
            height={28}
            className="flex-shrink-0"
          />
          <span className="font-sora font-semibold text-newayzi-jet">
            Newayzi <span className="text-semantic-text-muted font-normal">|</span> Admin
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-newayzi-han-purple/10 text-newayzi-han-purple"
                    : "text-semantic-text-muted hover:bg-semantic-surface-subdued hover:text-newayzi-jet"
                }`}
              >
                <Icon icon={item.icon} width={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-4 border-b border-semantic-surface-border bg-white px-6">
          <UserButton afterSignOutUrl="/sign-in" />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

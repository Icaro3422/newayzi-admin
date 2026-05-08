"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminApi, ROLE_META, type AdminRole } from "@/lib/admin-api";

function pathnameToModule(pathname: string): string | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/profile")) return "profile";
  if (pathname.startsWith("/admin/properties")) return "properties";
  if (pathname.startsWith("/admin/connections")) return "connections";
  if (pathname.startsWith("/admin/operators")) return "operators";
  if (pathname.startsWith("/admin/agents")) return "agents";
  if (pathname.startsWith("/admin/availability")) return "availability";
  if (pathname.startsWith("/admin/payments")) return "payments";
  if (pathname.startsWith("/admin/bookings")) return "bookings";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/corporate-credits")) return "corporate-credits";
  if (pathname.startsWith("/admin/communications")) return "communications";
  if (pathname.startsWith("/admin/analytics")) return "analytics";
  if (pathname.startsWith("/admin/reviews")) return "reviews";
  if (pathname.startsWith("/admin/coupons")) return "coupons";
  if (pathname.startsWith("/admin/seo-articles")) return "seo-content";
  return null;
}

/** Labels y ítems base del nav (sin filtrar por rol) */
const NAV_ITEMS_BASE: { href: string; label: string; icon: string; module: string }[] = [
  { href: "/admin",              label: "Dashboard",       icon: "solar:home-2-bold-duotone",                 module: "dashboard"     },
  { href: "/admin/profile",      label: "Mi perfil",       icon: "solar:user-circle-bold-duotone",            module: "profile"       },
  { href: "/admin/properties",   label: "Propiedades",     icon: "solar:buildings-2-bold-duotone",            module: "properties"    },
  { href: "/admin/connections",  label: "Conexiones PMS",  icon: "solar:link-circle-bold-duotone",            module: "connections"   },
  { href: "/admin/operators",    label: "Operadores",      icon: "solar:users-group-rounded-bold-duotone",    module: "operators"     },
  { href: "/admin/agents",       label: "Agentes",         icon: "solar:bag-4-bold-duotone",                  module: "agents"        },
  { href: "/admin/availability", label: "Disponibilidad",  icon: "solar:calendar-bold-duotone",               module: "availability"  },
  { href: "/admin/bookings",     label: "Reservas",        icon: "solar:bookmark-bold-duotone",               module: "bookings"      },
  { href: "/admin/payments",     label: "Pagos",           icon: "solar:wallet-money-bold-duotone",           module: "payments"      },
  { href: "/admin/analytics",    label: "Analytics",       icon: "solar:chart-2-bold-duotone",                module: "analytics"     },
  { href: "/admin/reviews",      label: "Reseñas",         icon: "solar:stars-bold-duotone",                  module: "reviews"       },
  { href: "/admin/coupons",      label: "Cupones",         icon: "solar:tag-price-bold-duotone",              module: "coupons"       },
  { href: "/admin/seo-articles", label: "Guías SEO (IA)",  icon: "solar:document-text-bold-duotone",          module: "seo-content"   },
  { href: "/admin/users",          label: "Usuarios y roles",   icon: "solar:user-id-bold-duotone",          module: "users"          },
  { href: "/admin/agent-wallets",  label: "Billeteras Rewards", icon: "solar:wallet-bold-duotone",           module: "agent-wallets"  },
  { href: "/admin/corporate-credits", label: "Créditos corporativos", icon: "solar:buildings-2-bold-duotone", module: "corporate-credits" },
  { href: "/admin/wallet",         label: "Mi Billetera",       icon: "solar:wallet-bold-duotone",           module: "wallet"         },
  { href: "/admin/communications", label: "Comunicaciones",     icon: "solar:letter-bold-duotone",           module: "communications" },
  { href: "/admin/simulator",      label: "Simulador",          icon: "solar:calculator-bold-duotone",       module: "simulator"      },
];

/** Labels específicos por rol — el operador ve "sus" recursos con etiquetas propias */
const ROLE_NAV_OVERRIDES: Partial<Record<AdminRole, Partial<Record<string, string>>>> = {
  operador: {
    properties:    "Mis propiedades",
    connections:   "Mis conexiones",
    agents:        "Mis agentes",
    availability:  "Mi disponibilidad",
    bookings:      "Mis reservas",
    wallet:        "Mis Rewards",
  },
  agente: {
    availability: "Disponibilidad",
    bookings:     "Mis reservas",
  },
  comercial: {
    operators: "Operadores",
  },
};

const BG_GRADIENT =
  "radial-gradient(ellipse 110% 80% at 18% 12%, #1a1814 0%, #0f0f18 42%, #08080c 100%)";
const GLOW_1 = "radial-gradient(circle, rgba(184,154,94,0.14) 0%, transparent 68%)";
const GLOW_2 = "radial-gradient(circle, rgba(212,185,122,0.08) 0%, transparent 72%)";

/* ── Vista de acceso denegado ── */
function AccessDeniedView({
  error,
  isPermissionDenied,
  onRetry,
  onSignOut,
}: {
  error: string;
  isPermissionDenied: boolean;
  onRetry: () => Promise<void>;
  onSignOut: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center font-sora px-4" style={{ background: BG_GRADIENT }}>
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
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-8 backdrop-blur-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mx-auto mb-6">
            <Icon icon="solar:shield-warning-bold-duotone" className="text-amber-400 text-3xl" />
          </div>
          <h1 className="font-sora font-bold text-xl text-white mb-3">
            {isPermissionDenied ? "Acceso restringido" : "No se pudo verificar tu acceso"}
          </h1>
          <p className="text-white/70 text-[0.9375rem] leading-relaxed mb-3">
            {isPermissionDenied
              ? "No tienes permisos para acceder al administrador. Si crees que deberías tener acceso, comunícate con el equipo de Almara."
              : "Hubo un problema al cargar tu sesión. Si el problema persiste, contacta al equipo de Almara."}
          </p>
          {error.trim() ? (
            <div className="mb-6 rounded-xl border border-white/[0.12] bg-black/25 px-3 py-2.5 text-left">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/40 mb-1">
                Detalle (consola del navegador: filtra <span className="text-white/60">almara-admin</span>)
              </p>
              <p className="text-white/85 text-[0.8125rem] font-mono leading-snug break-words whitespace-pre-wrap">
                {error}
              </p>
            </div>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl font-sora font-semibold text-sm text-white bg-white/[0.1] border border-white/[0.15] hover:bg-white/[0.15] transition-colors disabled:opacity-60"
            >
              {retrying ? (
                <Icon icon="svg-spinners:ring-resize" className="text-lg" />
              ) : (
                <Icon icon="solar:refresh-bold-duotone" className="text-lg" />
              )}
              Reintentar
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl font-sora font-semibold text-sm text-[#0f0f18] bg-gradient-to-br from-[#b89a5e] to-[#d4b97a] hover:from-[#d4b97a] hover:to-[#b89a5e] transition-all shadow-[0_4px_16px_rgba(184,154,94,0.35)]"
            >
              <Icon icon="solar:logout-2-bold-duotone" className="text-lg" />
              Cerrar sesión
            </button>
          </div>
          <button
            type="button"
            onClick={() => { window.location.href = "/admin"; }}
            className="mt-5 inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm font-medium transition-colors"
          >
            <Icon icon="solar:home-2-outline" width={16} />
            Ir al inicio del admin
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Pantalla de cambio de contraseña obligatorio ── */
function ForcePasswordChange({ onDone }: { onDone: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { setError("Por favor ingresa una nueva contraseña."); return; }
    if (newPassword.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }

    setError("");
    setLoading(true);
    try {
      await adminApi.setPassword(newPassword);
      onDone();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo cambiar la contraseña.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-sora" style={{
      background: "radial-gradient(ellipse 110% 80% at 20% 15%, #1e1060 0%, #0c0720 45%, #050310 100%)",
    }}>
      <div className="w-full max-w-md bg-white/[0.06] border border-white/[0.1] rounded-2xl p-8 backdrop-blur-sm">
        {/* Ícono */}
        <div className="w-14 h-14 rounded-2xl bg-[#b89a5e]/20 border border-[#b89a5e]/35 flex items-center justify-center mb-6 mx-auto">
          <Icon icon="solar:lock-password-bold-duotone" className="text-[#d4b97a] text-3xl" />
        </div>

        <h1 className="font-sora font-extrabold text-2xl text-white text-center leading-tight mb-2">
          Crea tu contraseña
        </h1>
        <p className="font-sora text-white/55 text-sm text-center leading-relaxed mb-8">
          Por seguridad, debes establecer una contraseña propia antes de continuar.
          Esta reemplazará la contraseña temporal de tu invitación.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* Nueva contraseña */}
          <div>
            <label className="block font-sora font-medium text-[0.8rem] text-white/60 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
                className="w-full bg-white/[0.08] border border-white/[0.15] rounded-[10px] px-3.5 py-3 pr-10 text-white placeholder:text-white/30 font-sora text-[0.9375rem] outline-none focus:border-[#b89a5e] focus:ring-3 focus:ring-[#b89a5e]/25 transition-all"
                style={{ minHeight: "46px" }}
              />
              <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                <Icon icon={showNew ? "solar:eye-closed-bold-duotone" : "solar:eye-bold-duotone"} className="text-xl" />
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block font-sora font-medium text-[0.8rem] text-white/60 mb-1.5">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full bg-white/[0.08] border border-white/[0.15] rounded-[10px] px-3.5 py-3 pr-10 text-white placeholder:text-white/30 font-sora text-[0.9375rem] outline-none focus:border-[#b89a5e] focus:ring-3 focus:ring-[#b89a5e]/25 transition-all"
                style={{ minHeight: "46px" }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                <Icon icon={showConfirm ? "solar:eye-closed-bold-duotone" : "solar:eye-bold-duotone"} className="text-xl" />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-[10px] bg-red-500/15 border border-red-500/30 px-3.5 py-3">
              <Icon icon="solar:danger-circle-bold-duotone" className="text-red-400 text-lg shrink-0 mt-px" />
              <p className="font-sora text-red-300 text-[0.8125rem] leading-snug">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-[10px] font-sora font-bold text-[0.9375rem] text-[#0f0f18] bg-gradient-to-br from-[#b89a5e] to-[#d4b97a] shadow-[0_4px_16px_rgba(184,154,94,0.4)] hover:from-[#d4b97a] hover:to-[#b89a5e] hover:-translate-y-px active:translate-y-0 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Icon icon="svg-spinners:ring-resize" className="text-lg" /><span>Guardando…</span></>
            ) : (
              <><Icon icon="solar:lock-password-bold-duotone" className="text-lg" /><span>Establecer contraseña y entrar</span></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { me, canAccess, loading, error, mustChangePassword, clearMustChangePassword, role, refetchMe } = useAdmin();

  // Aplicar overrides de label según el rol actual
  const roleOverrides = role ? (ROLE_NAV_OVERRIDES[role] ?? {}) : {};
  const items = NAV_ITEMS_BASE
    .filter((item) => canAccess(item.module))
    .map((item) => ({
      ...item,
      label: roleOverrides[item.module] ?? item.label,
    }));

  const roleMeta = role ? ROLE_META[role] : null;

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

  // Pantalla completa de carga SOLO en la carga inicial (cuando aún no hay datos de sesión).
  // En re-fetchs (refresco de token Clerk, etc.) ya tenemos `me`, así que mostramos
  // el contenido normal para evitar desmontar páginas con carga larga (ej: disponibilidad).
  if (loading && !me) {
    return (
      <div className="flex h-screen items-center justify-center font-sora" style={{ background: BG_GRADIENT }}>
        {shellBg}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden p-1.5">
            <img src="/brand/almara-a-white.png" width={28} height={28} alt="" className="object-contain" />
          </div>
          <p className="text-white/50 text-sm">Cargando sesión…</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isPermissionDenied =
      error.includes("permisos") ||
      error.includes("No tienes permisos") ||
      error.includes("403") ||
      error.includes("perfil de administrador") ||
      error.includes("administrador asignado");
    return (
      <AccessDeniedView
        error={error}
        isPermissionDenied={isPermissionDenied}
        onRetry={refetchMe}
        onSignOut={() => signOut({ redirectUrl: "/sign-in" })}
      />
    );
  }

  // Rol "user": usuario del frontend, sin permisos en el admin.
  if (role === "user") {
    return (
      <AccessDeniedView
        error="Tu rol actual es Usuario (frontend). Este panel es solo para staff/admin."
        isPermissionDenied={true}
        onRetry={refetchMe}
        onSignOut={() => signOut({ redirectUrl: "/sign-in" })}
      />
    );
  }

  // Primer login: forzar cambio de contraseña antes de mostrar el dashboard
  if (mustChangePassword) {
    return (
      <ForcePasswordChange
        onDone={async () => {
          await clearMustChangePassword();
        }}
      />
    );
  }

  return (
    <div className="admin-panel flex h-screen font-sora overflow-hidden" style={{ background: BG_GRADIENT }}>
      {shellBg}

      {/* ── Sidebar ── */}
      <aside className="relative z-10 flex w-[220px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0f0f18]/85 backdrop-blur-2xl">
        {/* Logo + Role badge */}
        <div className="flex flex-col border-b border-white/[0.08]">
          <div className="flex h-14 items-center gap-3 px-4">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-[#b89a5e]/25 flex items-center justify-center shrink-0 overflow-hidden p-1">
              <img src="/brand/almara-a-white.png" width={26} height={26} alt="" className="object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-sora font-bold text-white text-[0.72rem] leading-none tracking-[0.28em] uppercase">
                Almara
              </p>
              <p className="font-sora text-[#b89a5e]/90 text-[0.6rem] mt-1 uppercase tracking-[0.2em]">Admin</p>
            </div>
          </div>
          {roleMeta && (
            <div
              className="mx-3 mb-3 flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: `${roleMeta.color}14`, border: `1px solid ${roleMeta.color}30` }}
            >
              <Icon icon={roleMeta.icon} width={14} style={{ color: roleMeta.color }} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider leading-none" style={{ color: roleMeta.color }}>
                  {roleMeta.label}
                </p>
                <p className="text-white/35 text-[0.58rem] mt-0.5 leading-tight truncate">{roleMeta.description}</p>
              </div>
            </div>
          )}
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
                    ? "bg-[#b89a5e]/18 text-white shadow-[inset_0_0_0_1px_rgba(184,154,94,0.35)]"
                    : "text-white/45 hover:text-white/85 hover:bg-white/[0.05]"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-[#d4b97a] rounded-r-full" />
                )}
                <Icon
                  icon={item.icon}
                  width={17}
                  className={`shrink-0 transition-colors ${isActive ? "text-[#d4b97a]" : "text-[#b89a5e]/55 group-hover:text-[#d4b97a]/85"}`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User dropdown */}
        <div className="border-t border-white/[0.07] p-3">
          <Dropdown
            placement="top-start"
            classNames={{
              content: "bg-[#0f1220] border border-white/[0.12] rounded-xl shadow-xl shadow-black/30 p-1 min-w-[180px]",
            }}
          >
            <DropdownTrigger>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-white/50 hover:bg-white/[0.05] hover:text-white/70 transition-all duration-200 text-left cursor-pointer"
              >
                <div className="shrink-0 size-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-white/80 text-sm font-semibold">
                      {user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "?"}
                    </span>
                  )}
                </div>
                <span className="text-[0.8125rem] font-medium truncate min-w-0">Mi cuenta</span>
              </button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Cuenta">
              <DropdownItem
                key="profile"
                startContent={<Icon icon="solar:user-circle-outline" width={18} />}
                className="text-white/90 data-[hover=true]:bg-white/10 rounded-lg"
                onPress={() => router.push("/admin/profile")}
              >
                Mi perfil
              </DropdownItem>
              <DropdownItem
                key="account"
                startContent={<Icon icon="solar:shield-keyhole-outline" width={18} />}
                className="text-white/90 data-[hover=true]:bg-white/10 rounded-lg"
                onPress={() => router.push("/admin/profile")}
              >
                Seguridad (correo, contraseña)
              </DropdownItem>
              <DropdownItem
                key="signout"
                startContent={<Icon icon="solar:logout-2-outline" width={18} />}
                className="text-red-400 data-[hover=true]:bg-red-500/20 rounded-lg"
                onPress={() => signOut({ redirectUrl: "/sign-in" })}
              >
                Cerrar sesión
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
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

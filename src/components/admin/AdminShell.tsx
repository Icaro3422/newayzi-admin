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

/* ── Pantalla de cambio de contraseña obligatorio ── */
function ForcePasswordChange({ onDone }: { onDone: () => void }) {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { setError("Por favor ingresa la contraseña temporal de tu invitación."); return; }
    if (!newPassword) { setError("Por favor ingresa una nueva contraseña."); return; }
    if (newPassword.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    if (currentPassword === newPassword) { setError("La nueva contraseña debe ser diferente a la temporal."); return; }

    setError("");
    setLoading(true);
    try {
      await user?.updatePassword({ currentPassword, newPassword, signOutOfOtherSessions: false });
      onDone();
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string; message?: string; code?: string }[] };
      const clerkCode = clerkErr.errors?.[0]?.code ?? "";
      const clerkMsg = clerkErr.errors?.[0]?.longMessage || clerkErr.errors?.[0]?.message || "";
      if (clerkCode === "form_password_incorrect" || clerkMsg.toLowerCase().includes("incorrect")) {
        setError("La contraseña temporal es incorrecta. Revisa el email de invitación.");
      } else {
        setError(clerkMsg || "No se pudo cambiar la contraseña. Intenta de nuevo.");
      }
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
        <div className="w-14 h-14 rounded-2xl bg-[#5e2cec]/20 border border-[#5e2cec]/30 flex items-center justify-center mb-6 mx-auto">
          <Icon icon="solar:lock-password-bold-duotone" className="text-[#a78bfa] text-3xl" />
        </div>

        <h1 className="font-sora font-extrabold text-2xl text-white text-center leading-tight mb-2">
          Crea tu contraseña
        </h1>
        <p className="font-sora text-white/55 text-sm text-center leading-relaxed mb-8">
          Por seguridad, debes establecer una contraseña propia antes de continuar.
          Ingresa la contraseña temporal que recibiste en el correo de invitación.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* Contraseña temporal */}
          <div>
            <label className="block font-sora font-medium text-[0.8rem] text-white/60 mb-1.5">
              Contraseña temporal (del correo de invitación)
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Contraseña del correo de invitación"
                autoFocus
                className="w-full bg-white/[0.08] border border-white/[0.15] rounded-[10px] px-3.5 py-3 pr-10 text-white placeholder:text-white/30 font-sora text-[0.9375rem] outline-none focus:border-[#5e2cec] focus:ring-3 focus:ring-[#5e2cec]/20 transition-all"
                style={{ minHeight: "46px" }}
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                <Icon icon={showCurrent ? "solar:eye-closed-bold-duotone" : "solar:eye-bold-duotone"} className="text-xl" />
              </button>
            </div>
          </div>

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
                className="w-full bg-white/[0.08] border border-white/[0.15] rounded-[10px] px-3.5 py-3 pr-10 text-white placeholder:text-white/30 font-sora text-[0.9375rem] outline-none focus:border-[#5e2cec] focus:ring-3 focus:ring-[#5e2cec]/20 transition-all"
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
                className="w-full bg-white/[0.08] border border-white/[0.15] rounded-[10px] px-3.5 py-3 pr-10 text-white placeholder:text-white/30 font-sora text-[0.9375rem] outline-none focus:border-[#5e2cec] focus:ring-3 focus:ring-[#5e2cec]/20 transition-all"
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
            className="w-full min-h-[48px] rounded-[10px] font-sora font-bold text-[0.9375rem] text-white bg-gradient-to-br from-[#3d21c4] to-[#5e2cec] shadow-[0_4px_16px_rgba(94,44,236,0.38)] hover:from-[#5e2cec] hover:to-[#422df6] hover:-translate-y-px active:translate-y-0 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
  const { canAccess, loading, error, mustChangePassword, clearMustChangePassword } = useAdmin();
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

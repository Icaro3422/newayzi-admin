"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import {
  adminApi,
  setAdminApiToken,
  canAccessModule,
  canEditProperty,
  canEditConnections,
  canSyncConnection,
  type AdminMe,
  type AdminRole,
} from "@/lib/admin-api";

interface AdminContextValue {
  me: AdminMe | null;
  loading: boolean;
  error: string | null;
  refetchMe: () => Promise<void>;
  canAccess: (module: string) => boolean;
  canEditProperty: boolean;
  canEditConnections: boolean;
  canSyncConnection: boolean;
  role: AdminRole | null;
  mustChangePassword: boolean;
  clearMustChangePassword: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

/** Espera hasta que getToken devuelva un token (máx. 3s). Evita race condition tras redirect de Clerk. */
async function waitForToken(
  getToken: () => Promise<string | null>,
  maxAttempts = 15,
  delayMs = 200
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await getToken();
    if (token) return token;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchMe = useCallback(async (retryOn401 = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getMe();
      if (data) {
        setMe(data);
      } else {
        setMe(null);
        setError("No se pudo cargar la sesión. Verifica que el backend esté activo y que tengas un perfil asignado.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar sesión";
      // 401 tras login puede ser race condition de Clerk: reintentar una vez
      if (retryOn401 && msg.includes("401")) {
        await new Promise((r) => setTimeout(r, 800));
        return refetchMe(false);
      }
      setError(msg);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Registrar el getter de token y cargar el perfil.
  // Esperamos a que getToken devuelva un valor (race condition tras redirect de invitación).
  useEffect(() => {
    if (!isLoaded || !getToken || !isSignedIn) return;
    setAdminApiToken(getToken);

    let cancelled = false;
    (async () => {
      const token = await waitForToken(getToken);
      if (cancelled || !token) {
        if (!token && isSignedIn) {
          setError("No se pudo obtener el token de sesión. Intenta recargar la página.");
        }
        setLoading(false);
        return;
      }
      await refetchMe(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, refetchMe]);

  const canAccess = useCallback(
    (module: string) => canAccessModule(me?.role ?? null, module),
    [me?.role]
  );

  const clearMustChangePassword = useCallback(async () => {
    try {
      await adminApi.clearMustChangePassword();
      // Refrescar el perfil para que must_change_password quede en false
      await refetchMe();
    } catch {
      // ignorar — el usuario ya cambió la contraseña en Clerk
    }
  }, [refetchMe]);

  const value = useMemo<AdminContextValue>(
    () => ({
      me,
      loading,
      error,
      refetchMe,
      canAccess,
      canEditProperty: me ? canEditProperty(me.role) : false,
      canEditConnections: me ? canEditConnections(me.role) : false,
      canSyncConnection: me ? canSyncConnection(me.role) : false,
      role: me?.role ?? null,
      mustChangePassword: me?.must_change_password === true,
      clearMustChangePassword,
    }),
    [me, loading, error, refetchMe, canAccess, clearMustChangePassword]
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

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
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !getToken) return;
    setAdminApiToken(getToken);
  }, [isLoaded, getToken]);

  const refetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getMe();
      if (data) {
        setMe(data);
      } else {
        // Sin backend: permitir acceso como super_admin para desarrollo
        setMe({
          profile: {
            id: 0,
            clerk_user_id: "",
            email: "",
            first_name: "Admin",
            last_name: "Dev",
            full_name: "Admin Dev",
          },
          role: "super_admin",
          operator_id: null,
          permissions: ["*"],
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar sesión");
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    refetchMe();
  }, [isLoaded, refetchMe]);

  const canAccess = useCallback(
    (module: string) => canAccessModule(me?.role ?? null, module),
    [me?.role]
  );

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
    }),
    [me, loading, error, refetchMe, canAccess]
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

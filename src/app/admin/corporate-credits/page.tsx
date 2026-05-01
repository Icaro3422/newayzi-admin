"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Button, Input, Spinner, addToast } from "@heroui/react";
import {
  adminApi,
  corporateCreditsApi,
  type AdminUserListItem,
  type CorporateCreditMovementRow,
} from "@/lib/admin-api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdmin } from "@/contexts/AdminContext";

const inputDark =
  "rounded-xl border border-white/[0.12] bg-white/[0.04] text-white placeholder:text-white/35";

function fmtPts(n: number) {
  return new Intl.NumberFormat("es-CO").format(Math.round(n));
}

function CorporateCreditsInner() {
  const { getToken } = useAuth();
  const { canAccess } = useAdmin();
  const searchParams = useSearchParams();
  const prefillProfile = searchParams.get("profile_id");

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [rows, setRows] = useState<CorporateCreditMovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [profileId, setProfileId] = useState<string>(prefillProfile ?? "");
  const [amount, setAmount] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [note, setNote] = useState("");

  const loadList = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoadingList(true);
    try {
      const data = await corporateCreditsApi.list(token, { limit: 40 });
      setRows(data.results);
      setTotal(data.total);
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [getToken]);

  useEffect(() => {
    let c = false;
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoadingUsers(false);
        return;
      }
      try {
        const res = await adminApi.getUsers();
        if (!c) setUsers(res?.results ?? []);
      } finally {
        if (!c) setLoadingUsers(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [getToken]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (prefillProfile && !profileId) setProfileId(prefillProfile);
  }, [prefillProfile, profileId]);

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      String(u.id).includes(q)
    );
  });

  async function handleSubmit() {
    const pid = parseInt(profileId, 10);
    const amt = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(pid) || pid <= 0) {
      addToast({ title: "Perfil", description: "Selecciona un usuario válido.", color: "warning" });
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      addToast({ title: "Monto", description: "Indica un monto mayor a cero.", color: "warning" });
      return;
    }
    const tr = transferRef.trim();
    if (!tr) {
      addToast({ title: "Referencia", description: "La referencia de transferencia es obligatoria.", color: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sin autenticación.");
      const r = await corporateCreditsApi.credit(token, {
        profile_id: pid,
        amount: amt,
        transfer_reference: tr,
        note: note.trim(),
      });
      addToast({
        title: r.idempotent ? "Ya estaba acreditado" : "Crédito aplicado",
        description: `Saldo actual: ${fmtPts(r.points)} pts. Pool aportado acum.: ${fmtPts(r.pool_total_contributed)}.`,
        color: r.idempotent ? "warning" : "success",
      });
      setAmount("");
      setTransferRef("");
      setNote("");
      loadList();
    } catch (e) {
      addToast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo acreditar.",
        color: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!canAccess("corporate-credits")) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
        No tienes permiso para ver esta sección.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Créditos corporativos"
        subtitle="Tras confirmar la transferencia bancaria, acredita puntos al huésped (1 pt ≈ 1 COP al canjear). Se registra aporte en el Reward Pool. Misma referencia no duplica."
      />

      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 space-y-4">
        <h2 className="font-sora font-bold text-white text-sm flex items-center gap-2">
          <Icon icon="solar:buildings-2-bold-duotone" className="text-cyan-400" />
          Nueva acreditación
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Buscar usuario</label>
            <Input
              placeholder="Email o nombre…"
              value={userSearch}
              onValueChange={setUserSearch}
              classNames={{ inputWrapper: inputDark, input: "!text-white" }}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Perfil (ID en sistema)</label>
            {loadingUsers ? (
              <Spinner size="sm" />
            ) : (
              <select
                className={`w-full px-3 py-2.5 text-sm ${inputDark}`}
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {filteredUsers.slice(0, 200).map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    #{u.id} · {u.email} · {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Input
            label="Puntos a acreditar"
            placeholder="ej. 500000"
            type="text"
            value={amount}
            onValueChange={setAmount}
            classNames={{ inputWrapper: inputDark, label: "!text-white/50", input: "!text-white" }}
          />
          <Input
            label="Referencia de transferencia (única)"
            placeholder="Consignación, número de operación…"
            value={transferRef}
            onValueChange={setTransferRef}
            classNames={{ inputWrapper: inputDark, label: "!text-white/50", input: "!text-white" }}
          />
          <div className="md:col-span-2">
            <Input
              label="Nota interna (opcional)"
              placeholder="Empresa, contacto, factura…"
              value={note}
              onValueChange={setNote}
              classNames={{ inputWrapper: inputDark, label: "!text-white/50", input: "!text-white" }}
            />
          </div>
        </div>
        <Button
          className="btn-newayzi-primary"
          onPress={handleSubmit}
          isLoading={submitting}
          startContent={!submitting ? <Icon icon="solar:wallet-money-bold-duotone" width={20} /> : undefined}
        >
          Acreditar puntos
        </Button>
        <p className="text-white/40 text-xs">
          El huésped verá el saldo en{" "}
          <span className="text-white/55">Rewards</span> en la web y podrá canjear en el checkout.
        </p>
      </div>

      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sora font-bold text-white text-sm">Historial reciente</h2>
          <span className="text-white/40 text-xs">{total} registros</span>
        </div>
        {loadingList ? (
          <div className="flex justify-center py-12">
            <Spinner color="secondary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-white/45 text-sm">Aún no hay créditos corporativos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/45 text-left text-xs uppercase">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Usuario</th>
                  <th className="py-2 pr-3">Puntos</th>
                  <th className="py-2">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.06] text-white/80">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-white/55">
                      {new Date(r.created_at).toLocaleString("es-CO")}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/admin/users`} className="text-[#b89eff] hover:underline">
                        {r.profile_email}
                      </Link>
                      <span className="text-white/35 text-xs ml-1">#{r.profile_id}</span>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-emerald-300">+{fmtPts(r.amount)}</td>
                    <td className="py-2.5 font-mono text-[0.7rem] text-white/50 break-all max-w-[200px]">
                      {r.reference_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CorporateCreditsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner color="secondary" size="lg" />
        </div>
      }
    >
      <CorporateCreditsInner />
    </Suspense>
  );
}

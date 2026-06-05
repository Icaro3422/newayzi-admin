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
  const [guestEmail, setGuestEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sendInvite, setSendInvite] = useState(true);
  const [useEmailMode, setUseEmailMode] = useState(!!prefillProfile ? false : true);
  const [amount, setAmount] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [note, setNote] = useState("");

  const [resendEmail, setResendEmail] = useState("");
  const [resendProfileId, setResendProfileId] = useState("");
  const [resending, setResending] = useState(false);

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
    const amt = parseFloat(amount.replace(",", "."));
    const tr = transferRef.trim();
    const email = guestEmail.trim().toLowerCase();

    if (useEmailMode) {
      if (!email || !email.includes("@")) {
        addToast({ title: "Email", description: "Indica un email válido del huésped.", color: "warning" });
        return;
      }
    } else {
      const pid = parseInt(profileId, 10);
      if (!Number.isFinite(pid) || pid <= 0) {
        addToast({ title: "Perfil", description: "Selecciona un usuario válido.", color: "warning" });
        return;
      }
    }

    if (!Number.isFinite(amt) || amt <= 0) {
      addToast({ title: "Monto", description: "Indica un monto mayor a cero.", color: "warning" });
      return;
    }
    if (!tr) {
      addToast({ title: "Referencia", description: "La referencia de transferencia es obligatoria.", color: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sin autenticación.");
      const r = await corporateCreditsApi.credit(token, {
        ...(useEmailMode
          ? { email, first_name: firstName.trim(), last_name: lastName.trim(), send_invite: sendInvite }
          : { profile_id: parseInt(profileId, 10), send_invite: sendInvite }),
        amount: amt,
        transfer_reference: tr,
        note: note.trim(),
        invite_locale: "es",
      });

      const extras: string[] = [];
      if (r.profile_created) extras.push("perfil creado");
      if (r.clerk_created) extras.push("cuenta Clerk creada");
      if (r.email_sent) extras.push("invitación enviada");
      const extraMsg = extras.length ? ` (${extras.join(", ")})` : "";

      addToast({
        title: r.idempotent ? "Ya estaba acreditado" : "Crédito aplicado",
        description: `${r.profile_email ?? email ?? `#${r.profile_id}`}: saldo ${fmtPts(r.points)} pts${extraMsg}.`,
        color: r.idempotent ? "warning" : "success",
      });
      if (useEmailMode) {
        setGuestEmail("");
        setFirstName("");
        setLastName("");
      }
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

  async function handleResendAccess() {
    const email = resendEmail.trim().toLowerCase();
    const pid = parseInt(resendProfileId, 10);
    if (!email && (!Number.isFinite(pid) || pid <= 0)) {
      addToast({
        title: "Huésped",
        description: "Indica email o selecciona un perfil para reenviar el enlace.",
        color: "warning",
      });
      return;
    }
    setResending(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sin autenticación.");
      const r = await corporateCreditsApi.resendAccess(token, {
        ...(email ? { email } : { profile_id: pid }),
        invite_locale: "es",
      });
      addToast({
        title: r.email_sent ? "Enlace reenviado" : "No se pudo enviar",
        description: r.email_sent
          ? `Magic link enviado a ${r.profile_email}.`
          : `No se envió correo a ${r.profile_email}. Revisa RESEND/Clerk en backend.`,
        color: r.email_sent ? "success" : "warning",
      });
      setResendEmail("");
      setResendProfileId("");
    } catch (e) {
      addToast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo reenviar.",
        color: "danger",
      });
    } finally {
      setResending(false);
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
        subtitle="Flujo principal para prepago corporativo: acredita puntos tras la transferencia bancaria, crea la cuenta si no existe y envía magic link. Usuarios y roles es solo para cuentas admin."
      />

      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-3 text-sm text-white/70">
        <strong className="text-cyan-200">¿Dónde hacer qué?</strong>{" "}
        Acreditar puntos prepago → aquí. Crear operadores/agentes/admin →{" "}
        <Link href="/admin/users" className="text-cyan-300 underline hover:text-cyan-200">
          Usuarios y roles
        </Link>
        . Reenviar enlace sin acreditar → sección de abajo o botón ✉️ en la lista de usuarios.
      </div>

      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 space-y-4">
        <h2 className="font-sora font-bold text-white text-sm flex items-center gap-2">
          <Icon icon="solar:buildings-2-bold-duotone" className="text-cyan-400" />
          Nueva acreditación
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex gap-2">
            <button
              type="button"
              onClick={() => setUseEmailMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                useEmailMode ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-white/45 hover:text-white/70"
              }`}
            >
              Por email (nuevo huésped)
            </button>
            <button
              type="button"
              onClick={() => setUseEmailMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                !useEmailMode ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-white/45 hover:text-white/70"
              }`}
            >
              Usuario existente
            </button>
          </div>

          {useEmailMode ? (
            <>
              <Input
                label="Email del huésped"
                placeholder="corporativo@empresa.com"
                type="email"
                value={guestEmail}
                onValueChange={setGuestEmail}
                classNames={{ inputWrapper: inputDark, label: "!text-white/50", input: "!text-white" }}
              />
              <Input
                label="Nombre (opcional)"
                placeholder="María"
                value={firstName}
                onValueChange={setFirstName}
                classNames={{ inputWrapper: inputDark, label: "!text-white/50", input: "!text-white" }}
              />
              <Input
                label="Apellido (opcional)"
                placeholder="García"
                value={lastName}
                onValueChange={setLastName}
                classNames={{ inputWrapper: inputDark, label: "!text-white/50", input: "!text-white" }}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="send-invite"
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="rounded border-white/20 bg-white/5"
            />
            <label htmlFor="send-invite" className="text-sm text-white/70 cursor-pointer">
              Enviar invitación por correo (magic link para entrar directo a Rewards)
            </label>
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
          {useEmailMode && sendInvite && (
            <> Recibirá un enlace mágico para entrar sin contraseña; podrá crear una opcionalmente.</>
          )}
        </p>
      </div>

      <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 space-y-4">
        <h2 className="font-sora font-bold text-white text-sm flex items-center gap-2">
          <Icon icon="solar:letter-bold-duotone" className="text-emerald-400" />
          Reenviar enlace de acceso
        </h2>
        <p className="text-white/45 text-xs">
          Solo reenvía el magic link — no acredita puntos ni duplica movimientos. Útil si el huésped perdió el correo.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Email del huésped"
            placeholder="corporativo@empresa.com"
            type="email"
            value={resendEmail}
            onValueChange={setResendEmail}
            classNames={{ inputWrapper: inputDark, label: "!text-white/50", input: "!text-white" }}
          />
          <div>
            <label className="text-xs text-white/50 mb-1 block">O perfil existente</label>
            <select
              className={`w-full px-3 py-2.5 text-sm ${inputDark}`}
              value={resendProfileId}
              onChange={(e) => setResendProfileId(e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {filteredUsers.slice(0, 200).map((u) => (
                <option key={u.id} value={String(u.id)}>
                  #{u.id} · {u.email}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          variant="flat"
          className="text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/10"
          onPress={handleResendAccess}
          isLoading={resending}
          startContent={!resending ? <Icon icon="solar:plain-2-bold-duotone" width={20} /> : undefined}
        >
          Reenviar magic link
        </Button>
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
                      <Link href={`/admin/users`} className="text-[#f0e6d2] hover:underline">
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

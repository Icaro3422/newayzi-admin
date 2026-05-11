"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  adminBookings,
  canAdminCancelBooking,
  canAdminEditBooking,
  canAdminPatchBookingStatus,
  type AdminBookingDetail,
} from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(str: string): string {
  try {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return str; }
}

function formatCurrency(amount: string | null | undefined, currency = "COP"): string {
  const n = parseFloat(amount ?? "0");
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: currency.toUpperCase(),
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_BADGE: Record<string, string> = {
  confirmed:       "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  pending_payment: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  cancelled:       "bg-red-500/15 text-red-300 border-red-500/20",
  expired:         "bg-gray-500/15 text-gray-400 border-gray-500/20",
};
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmada", pending_payment: "Pago pendiente",
  cancelled: "Cancelada", expired: "Expirada",
};
const PAYMENT_BADGE: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  pending:  "bg-amber-500/15 text-amber-300 border-amber-500/20",
  rejected: "bg-red-500/15 text-red-300 border-red-500/20",
  no_payment: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AdminBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role } = useAdmin();
  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [adminReason, setAdminReason] = useState("");
  const [hasJustification, setHasJustification] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState(false);
  const [refundResult, setRefundResult] = useState<{
    refund_type: string;
    refund_pct: number;
    refund_amount: string;
    reason: string;
  } | null>(null);
  const [statusPatching, setStatusPatching] = useState(false);

  // ── Editar contacto ───────────────────────────────────────────────────────
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ contact_name: "", contact_email: "", contact_phone: "", notes: "", guests_count: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // ── Editar huésped ────────────────────────────────────────────────────────
  const [editingGuestId, setEditingGuestId] = useState<number | null>(null);
  const [guestForm, setGuestForm] = useState({ first_name: "", last_name: "", email: "", phone: "", is_primary: false });
  const [savingGuest, setSavingGuest] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  const showActions = canAdminCancelBooking(role) || canAdminPatchBookingStatus(role);
  const canEdit = canAdminEditBooking(role);

  async function reloadBooking() {
    if (!id) return;
    const data = await adminBookings.get(Number(id));
    if (data) setBooking(data);
  }

  useEffect(() => {
    if (!id) return;
    setCancelOpen(false);
    setCancelDone(false);
    setRefundResult(null);
    setAdminReason("");
    setHasJustification(true);
    setCancelError(null);
    adminBookings
      .get(Number(id))
      .then((data) => {
        if (!data) setError("Reserva no encontrada.");
        else setBooking(data);
      })
      .catch(() => setError("Error al cargar la reserva."))
      .finally(() => setLoading(false));
  }, [id]);

  async function confirmCancelBooking() {
    if (!booking) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const r = await adminBookings.cancel(booking.id, {
        reason: adminReason.trim() || "Cancelación administrativa",
        has_justification: hasJustification,
      });
      setRefundResult(r);
      setCancelDone(true);
      await reloadBooking();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Error al cancelar");
    } finally {
      setCancelLoading(false);
    }
  }

  function openEditContact() {
    if (!booking) return;
    setContactForm({
      contact_name: booking.contact_name || "",
      contact_email: booking.contact_email || "",
      contact_phone: booking.contact_phone || "",
      notes: booking.notes || "",
      guests_count: String(booking.guests_count ?? ""),
    });
    setContactError(null);
    setEditingContact(true);
  }

  async function saveContact() {
    if (!booking) return;
    setSavingContact(true);
    setContactError(null);
    try {
      const gc = parseInt(contactForm.guests_count, 10);
      await adminBookings.patchBooking(booking.id, {
        contact_name: contactForm.contact_name,
        contact_email: contactForm.contact_email,
        contact_phone: contactForm.contact_phone,
        notes: contactForm.notes,
        guests_count: Number.isNaN(gc) ? undefined : gc,
      });
      await reloadBooking();
      setEditingContact(false);
    } catch (e) {
      setContactError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSavingContact(false);
    }
  }

  function openEditGuest(g: AdminBookingDetail["guests"][number]) {
    setGuestForm({ first_name: g.first_name, last_name: g.last_name, email: g.email, phone: g.phone, is_primary: g.is_primary });
    setGuestError(null);
    setEditingGuestId(g.id);
  }

  async function saveGuest() {
    if (!booking || editingGuestId === null) return;
    setSavingGuest(true);
    setGuestError(null);
    try {
      await adminBookings.patchGuest(booking.id, editingGuestId, guestForm);
      await reloadBooking();
      setEditingGuestId(null);
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSavingGuest(false);
    }
  }

  async function patchBookingStatus(next: "confirmed" | "expired") {
    if (!booking) return;
    const msg =
      next === "confirmed"
        ? "¿Confirmar esta reserva manualmente? Pasará de «Pago pendiente» a «Confirmada»."
        : "¿Marcar como expirada? Seguirá bloqueando la eliminación de conexiones PMS hasta que canceles la reserva.";
    if (!window.confirm(msg)) return;
    setStatusPatching(true);
    try {
      await adminBookings.patchStatus(booking.id, { status: next });
      await reloadBooking();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "No se pudo actualizar el estado.");
    } finally {
      setStatusPatching(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center gap-4">
        <Icon icon="solar:danger-triangle-bold-duotone" className="text-red-400 text-5xl" />
        <p className="text-white/70">{error || "Reserva no encontrada."}</p>
        <button
          onClick={() => router.push("/admin/bookings")}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors"
        >
          Volver a reservas
        </button>
      </div>
    );
  }

  const meta = booking.metadata ?? {};

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/admin/bookings")}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Icon icon="solar:arrow-left-bold" className="text-white/80 text-lg" />
        </button>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Reserva</p>
          <h1 className="text-xl font-black text-white">#{booking.id} · {booking.reference}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_BADGE[booking.status] ?? "bg-white/5 text-white/60 border-white/10"}`}>
            {STATUS_LABEL[booking.status] ?? booking.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${PAYMENT_BADGE[booking.payment_status] ?? "bg-white/5 text-white/60 border-white/10"}`}>
            {booking.payment_status}
          </span>
        </div>
      </div>

      {showActions && (
        <section className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300 flex items-center gap-2 mb-3">
            <Icon icon="solar:settings-bold-duotone" /> Acciones de gestión
          </h2>
          <p className="text-sm text-white/55 mb-4">
            Para poder eliminar una conexión PMS, todas las reservas asociadas a esas propiedades deben estar en estado
            «Cancelada». Las reservas confirmadas, pendientes o expiradas siguen bloqueando el borrado hasta cancelarlas.
          </p>
          <div className="flex flex-wrap gap-2">
            {canAdminCancelBooking(role) && booking.status !== "cancelled" && (
              <button
                type="button"
                onClick={() => {
                  setCancelOpen(true);
                  setCancelDone(false);
                  setRefundResult(null);
                  setCancelError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 text-sm font-semibold transition-colors"
              >
                <Icon icon="solar:close-circle-bold" width={18} />
                Cancelar reserva
              </button>
            )}
            {canAdminPatchBookingStatus(role) && booking.status === "pending_payment" && (
              <button
                type="button"
                disabled={statusPatching}
                onClick={() => patchBookingStatus("confirmed")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 text-sm font-semibold transition-colors disabled:opacity-40"
              >
                <Icon icon="solar:check-circle-bold" width={18} />
                Confirmar reserva
              </button>
            )}
            {canAdminPatchBookingStatus(role) &&
              (booking.status === "pending_payment" || booking.status === "confirmed") && (
                <button
                  type="button"
                  disabled={statusPatching}
                  onClick={() => patchBookingStatus("expired")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/70 border border-white/15 hover:bg-white/10 text-sm font-semibold transition-colors disabled:opacity-40"
                >
                  <Icon icon="solar:clock-circle-bold" width={18} />
                  Marcar como expirada
                </button>
              )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ─ Propiedad / Fechas ─────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300 flex items-center gap-2">
            <Icon icon="solar:buildings-2-bold-duotone" /> Alojamiento
          </h2>
          <Row label="Propiedad" value={booking.property_name} />
          <Row label="Tipo de habitación" value={booking.room_type_name} />
          <Row label="Check-in" value={formatDate(booking.check_in)} />
          <Row label="Check-out" value={formatDate(booking.check_out)} />
          <Row label="Noches" value={String(booking.nights)} />
          <Row label="Huéspedes" value={String(booking.guests_count)} />
        </section>

        {/* ─ Pago ───────────────────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300 flex items-center gap-2">
            <Icon icon="solar:wallet-money-bold-duotone" /> Pago
          </h2>
          <Row label="Total" value={formatCurrency(booking.total_amount, booking.currency)} highlight />
          <Row label="Gateway" value={booking.payment_gateway || "—"} />
          <Row label="Referencia" value={booking.payment_reference || "—"} mono />
          {booking.coupon_code && (
            <>
              <Row label="Cupón" value={booking.coupon_code} />
              <Row label="Descuento cupón" value={formatCurrency(booking.coupon_discount, booking.currency)} />
            </>
          )}
          {/* Reembolso */}
          {booking.refund_requires_manual && (
            <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5 mt-1">
              <Icon icon="solar:danger-triangle-bold-duotone" className="text-orange-400 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-orange-300">Reembolso manual requerido</p>
                <p className="text-xs text-orange-400/80">PSE/Efecty — debe procesarse manualmente.</p>
              </div>
            </div>
          )}
          {booking.cancellation_refund_amount && (
            <Row
              label={`Reembolso cancelación (${booking.cancellation_refund_pct ?? 0}%)`}
              value={formatCurrency(booking.cancellation_refund_amount, booking.currency)}
            />
          )}
        </section>

        {/* ─ Contacto ───────────────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300 flex items-center gap-2">
              <Icon icon="solar:user-bold-duotone" /> Contacto
            </h2>
            {canEdit && booking.status !== "cancelled" && !editingContact && (
              <button
                onClick={openEditContact}
                className="text-xs text-violet-300 hover:text-violet-200 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Icon icon="solar:pen-2-bold" width={13} /> Editar
              </button>
            )}
          </div>
          {editingContact ? (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Nombre</label>
                  <input value={contactForm.contact_name} onChange={e => setContactForm(f => ({ ...f, contact_name: e.target.value }))}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" placeholder="Nombre de contacto" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Email</label>
                  <input type="email" value={contactForm.contact_email} onChange={e => setContactForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" placeholder="email@ejemplo.com" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Teléfono</label>
                  <input value={contactForm.contact_phone} onChange={e => setContactForm(f => ({ ...f, contact_phone: e.target.value }))}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" placeholder="+57 300 000 0000" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">N.º huéspedes</label>
                  <input type="number" min={1} value={contactForm.guests_count} onChange={e => setContactForm(f => ({ ...f, guests_count: e.target.value }))}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Notas</label>
                <textarea value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 resize-none" placeholder="Notas internas…" />
              </div>
              {contactError && <p className="text-xs text-red-400">{contactError}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingContact(false)}
                  className="px-3 py-1.5 text-xs text-white/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button onClick={saveContact} disabled={savingContact}
                  className="px-4 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors disabled:opacity-40">
                  {savingContact ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <Row label="Nombre" value={booking.contact_name || "—"} />
              <Row label="Email" value={booking.contact_email || "—"} />
              <Row label="Teléfono" value={booking.contact_phone || "—"} />
              {booking.notes && <Row label="Notas" value={booking.notes} />}
            </>
          )}
        </section>

        {/* ─ Huéspedes registrados ──────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300 flex items-center gap-2 mb-3">
            <Icon icon="solar:users-group-rounded-bold-duotone" /> Huéspedes ({booking.guests?.length ?? 0})
          </h2>
          {!booking.guests?.length ? (
            <p className="text-sm text-white/40">Sin huéspedes registrados.</p>
          ) : (
            <div className="space-y-2">
              {booking.guests.map((g) => (
                <div key={g.id} className="bg-white/5 rounded-xl px-3 py-2">
                  {editingGuestId === g.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-white/50 mb-1 block">Nombre</label>
                          <input value={guestForm.first_name} onChange={e => setGuestForm(f => ({ ...f, first_name: e.target.value }))}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                        </div>
                        <div>
                          <label className="text-xs text-white/50 mb-1 block">Apellido</label>
                          <input value={guestForm.last_name} onChange={e => setGuestForm(f => ({ ...f, last_name: e.target.value }))}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                        </div>
                        <div>
                          <label className="text-xs text-white/50 mb-1 block">Email</label>
                          <input type="email" value={guestForm.email} onChange={e => setGuestForm(f => ({ ...f, email: e.target.value }))}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                        </div>
                        <div>
                          <label className="text-xs text-white/50 mb-1 block">Teléfono</label>
                          <input value={guestForm.phone} onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-white/70">
                        <input type="checkbox" checked={guestForm.is_primary} onChange={e => setGuestForm(f => ({ ...f, is_primary: e.target.checked }))}
                          className="w-4 h-4 accent-violet-500 rounded" />
                        Huésped principal
                      </label>
                      {guestError && <p className="text-xs text-red-400">{guestError}</p>}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingGuestId(null)}
                          className="px-3 py-1.5 text-xs text-white/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                          Cancelar
                        </button>
                        <button onClick={saveGuest} disabled={savingGuest}
                          className="px-4 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors disabled:opacity-40">
                          {savingGuest ? "Guardando…" : "Guardar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {g.first_name} {g.last_name}
                          {g.is_primary && (
                            <span className="ml-2 text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full font-bold">
                              Principal
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-white/40">{g.email || "—"} {g.phone ? `· ${g.phone}` : ""}</p>
                      </div>
                      {canEdit && booking.status !== "cancelled" && (
                        <button onClick={() => openEditGuest(g)}
                          className="text-xs text-violet-300 hover:text-violet-200 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors ml-2 flex-shrink-0">
                          <Icon icon="solar:pen-2-bold" width={13} /> Editar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─ Transacciones de pago ─────────────────────────────────── */}
        {booking.transactions?.length > 0 && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 lg:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300 flex items-center gap-2 mb-3">
              <Icon icon="solar:card-bold-duotone" /> Transacciones ({booking.transactions.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs border-b border-white/10">
                    <th className="text-left pb-2 font-semibold">Gateway</th>
                    <th className="text-left pb-2 font-semibold">Estado</th>
                    <th className="text-left pb-2 font-semibold">Monto</th>
                    <th className="text-left pb-2 font-semibold">Referencia</th>
                    <th className="text-left pb-2 font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {booking.transactions.map((tx) => (
                    <tr key={tx.id} className="text-white/80">
                      <td className="py-2 pr-4 font-mono text-xs text-violet-300">{tx.gateway}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PAYMENT_BADGE[tx.status] ?? "bg-white/5 text-white/50 border-white/10"}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-bold">{formatCurrency(tx.amount, tx.currency || "COP")}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-white/50">{tx.external_reference || "—"}</td>
                      <td className="py-2 text-xs text-white/40">
                        {tx.created ? new Date(tx.created).toLocaleString("es-CO") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ─ Metadata / extra ──────────────────────────────────────── */}
        {Object.keys(meta).length > 0 && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 lg:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300 flex items-center gap-2 mb-3">
              <Icon icon="solar:code-bold-duotone" /> Metadata
            </h2>
            <pre className="text-xs text-white/50 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
              {JSON.stringify(meta, null, 2)}
            </pre>
          </section>
        )}

        {/* ─ Info del sistema ───────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300 flex items-center gap-2 mb-3">
            <Icon icon="solar:info-circle-bold-duotone" /> Sistema
          </h2>
          <Row label="Creada" value={booking.created ? new Date(booking.created).toLocaleString("es-CO") : "—"} />
          <Row label="Actualizada" value={booking.updated ? new Date(booking.updated).toLocaleString("es-CO") : "—"} />
          {booking.profile_id && <Row label="Profile ID" value={String(booking.profile_id)} mono />}
          {booking.agency_id && <Row label="Agency ID" value={String(booking.agency_id)} mono />}
        </section>
      </div>

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            {cancelDone ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Icon icon="solar:check-circle-bold" className="text-emerald-400 text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Reserva cancelada</h3>
                </div>
                {refundResult && (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                    <p className="text-sm text-white/60 mb-1">Reembolso</p>
                    <p className="text-xl font-black text-violet-300">
                      {refundResult.refund_pct}% —{" "}
                      {refundResult.refund_type === "cash"
                        ? "Efectivo"
                        : refundResult.refund_type === "credits"
                          ? "Créditos"
                          : "Sin reembolso"}
                    </p>
                    <p className="text-xs text-white/40 mt-1">{refundResult.reason}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setCancelOpen(false)}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Icon icon="solar:danger-triangle-bold-duotone" className="text-red-400 text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Cancelar reserva</h3>
                </div>
                <p className="text-sm text-white/60 mb-4">
                  ¿Confirmas la cancelación de{" "}
                  <span className="font-mono text-violet-300 font-bold">{booking.reference}</span>? Se aplicará la
                  política de reembolso correspondiente.
                </p>
                <label className="block text-xs text-white/50 mb-1">Razón (opcional)</label>
                <textarea
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 py-2 mb-3"
                  placeholder="Motivo interno o para el huésped"
                />
                <label className="flex items-center gap-2 text-sm text-white/70 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasJustification}
                    onChange={(e) => setHasJustification(e.target.checked)}
                    className="rounded border-white/30 bg-white/10 text-violet-500"
                  />
                  Aplicar reglas con justificación (mejor reembolso según política / términos)
                </label>
                {cancelError && (
                  <p className="text-sm text-red-400 mb-3">{cancelError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 hover:bg-white/5"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={confirmCancelBooking}
                    disabled={cancelLoading}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {cancelLoading ? "Cancelando…" : "Confirmar cancelación"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente Row ────────────────────────────────────────────────────────

function Row({
  label, value, highlight = false, mono = false,
}: {
  label: string; value: string; highlight?: boolean; mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm">
      <span className="text-white/50 flex-shrink-0">{label}</span>
      <span className={`text-right break-all ${highlight ? "font-black text-violet-200 text-base" : mono ? "font-mono text-white/70 text-xs" : "font-medium text-white"}`}>
        {value}
      </span>
    </div>
  );
}

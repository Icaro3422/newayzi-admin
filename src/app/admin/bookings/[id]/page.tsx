"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { adminBookings, type AdminBookingDetail } from "@/lib/admin-api";

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
  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    adminBookings.get(Number(id))
      .then((data) => {
        if (!data) setError("Reserva no encontrada.");
        else setBooking(data);
      })
      .catch(() => setError("Error al cargar la reserva."))
      .finally(() => setLoading(false));
  }, [id]);

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
        <div className="ml-auto flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_BADGE[booking.status] ?? "bg-white/5 text-white/60 border-white/10"}`}>
            {STATUS_LABEL[booking.status] ?? booking.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${PAYMENT_BADGE[booking.payment_status] ?? "bg-white/5 text-white/60 border-white/10"}`}>
            {booking.payment_status}
          </span>
        </div>
      </div>

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
          <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300 flex items-center gap-2">
            <Icon icon="solar:user-bold-duotone" /> Contacto
          </h2>
          <Row label="Nombre" value={booking.contact_name || "—"} />
          <Row label="Email" value={booking.contact_email || "—"} />
          <Row label="Teléfono" value={booking.contact_phone || "—"} />
          {booking.notes && <Row label="Notas" value={booking.notes} />}
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
                <div key={g.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
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

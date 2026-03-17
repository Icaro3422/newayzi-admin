"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { adminBookings, type AdminBookingListItem, type AdminBookingStats } from "@/lib/admin-api";

const STATUS_BADGE: Record<string, string> = {
  confirmed:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  pending_payment: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  cancelled:       "bg-red-500/15 text-red-400 border-red-500/20",
  expired:         "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed:       "Confirmada",
  pending_payment: "Pago pendiente",
  cancelled:       "Cancelada",
  expired:         "Expirada",
};

const PAYMENT_BADGE: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  pending:  "bg-amber-500/15 text-amber-400 border-amber-500/20",
  rejected: "bg-red-500/15 text-red-400 border-red-500/20",
  error:    "bg-red-500/15 text-red-400 border-red-500/20",
  cancelled:"bg-gray-500/15 text-gray-400 border-gray-500/20",
  no_payment:"bg-gray-500/15 text-gray-400 border-gray-500/20",
};

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency || "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

interface CancelModalState {
  booking: AdminBookingListItem;
  loading: boolean;
  done: boolean;
  error: string | null;
  adminReason: string;
  refundResult: { refund_type: string; refund_pct: number; refund_amount: string; reason: string } | null;
}

export function BookingsList() {
  const router = useRouter();
  const [bookings, setBookings] = useState<AdminBookingListItem[]>([]);
  const [stats, setStats] = useState<AdminBookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Debounce: esperar 400ms después del último keystroke para buscar
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Cancel modal
  const [cancelModal, setCancelModal] = useState<CancelModalState | null>(null);

  const loadBookings = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [data, statsData] = await Promise.all([
        adminBookings.list({
          page: p,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
        adminBookings.stats(),
      ]);
      setBookings(data.results);
      setTotal(data.count);
      setTotalPages(data.num_pages);
      setPage(data.page);
      setStats(statsData);
    } catch (e: any) {
      setError(e?.message || "Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, dateFrom, dateTo]);

  useEffect(() => { loadBookings(1); }, [loadBookings]);

  async function handleCancel(booking: AdminBookingListItem) {
    setCancelModal({ booking, loading: false, done: false, error: null, adminReason: "", refundResult: null });
  }

  async function confirmCancel() {
    if (!cancelModal) return;
    setCancelModal((prev) => prev ? { ...prev, loading: true, error: null } : null);
    try {
      const result = await adminBookings.cancel(cancelModal.booking.id, {
        reason: cancelModal.adminReason.trim() || "Cancelación administrativa",
        has_justification: true,
      });
      setCancelModal((prev) => prev ? { ...prev, loading: false, done: true, refundResult: result } : null);
      // Reload list
      await loadBookings(page);
    } catch (e: any) {
      setCancelModal((prev) => prev ? { ...prev, loading: false, error: e?.message || "Error al cancelar" } : null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, icon: "solar:bookmark-bold-duotone", color: "#a78bfa" },
            { label: "Confirmadas", value: stats.confirmed, icon: "solar:check-circle-bold-duotone", color: "#34d399" },
            { label: "Pendientes", value: stats.pending, icon: "solar:clock-circle-bold-duotone", color: "#fbbf24" },
            { label: "Canceladas", value: stats.cancelled, icon: "solar:close-circle-bold-duotone", color: "#f87171" },
            { label: "Este mes", value: stats.this_month_count, icon: "solar:calendar-bold-duotone", color: "#60a5fa" },
            {
              label: "Revenue mes",
              value: formatCurrency(stats.this_month_revenue, "COP"),
              icon: "solar:dollar-bold-duotone",
              color: "#34d399",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                <Icon icon={s.icon} style={{ color: s.color }} className="text-lg" />
                <span className="text-xs text-white/50">{s.label}</span>
              </div>
              <span className="text-lg font-bold text-white">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por referencia, nombre, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="confirmed">Confirmadas</option>
          <option value="pending_payment">Pago pendiente</option>
          <option value="cancelled">Canceladas</option>
          <option value="expired">Expiradas</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          placeholder="Desde"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          placeholder="Hasta"
        />
        <button
          onClick={() => loadBookings(1)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Icon icon="solar:refresh-bold" className="inline mr-1" />
          Buscar
        </button>
      </div>

      {/* Count */}
      <p className="text-sm text-white/50">{total} reserva{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}</p>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Referencia</th>
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Huésped</th>
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Propiedad</th>
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Fechas</th>
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Pago</th>
                <th className="text-right px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Total</th>
                <th className="text-center px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-white/40">
                    No se encontraron reservas
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-violet-300 font-bold">{b.reference}</span>
                      <div className="text-xs text-white/40 mt-0.5">#{b.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white text-sm truncate max-w-[150px]">
                        {b.contact_name || "—"}
                      </div>
                      <div className="text-xs text-white/40 truncate max-w-[150px]">{b.contact_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white text-sm truncate max-w-[160px]">{b.property_name}</div>
                      <div className="text-xs text-white/40 truncate">{b.operator_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white text-xs">{formatDate(b.check_in)} →</div>
                      <div className="text-white text-xs">{formatDate(b.check_out)}</div>
                      <div className="text-white/40 text-xs">{b.nights} noches</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[b.status] || "bg-gray-500/15 text-gray-400 border-gray-500/20"}`}>
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                      {b.refund_requires_manual && (
                        <div
                          className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          title={`Reembolso manual requerido — ${b.cancellation_refund_amount || "?"} ${b.currency} via ${b.refund_gateway || "desconocido"}`}
                        >
                          <Icon icon="solar:danger-bold" className="text-xs" />
                          REEMBOLSO MANUAL
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${PAYMENT_BADGE[b.payment_status] || "bg-gray-500/15 text-gray-400 border-gray-500/20"}`}>
                        {b.payment_status}
                      </span>
                      {b.payment_gateway && (
                        <div className="text-xs text-white/40 mt-0.5">{b.payment_gateway.toUpperCase()}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-white">
                        {formatCurrency(b.total_amount, b.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/bookings/${b.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/20 hover:bg-violet-500/25 text-xs font-semibold transition-colors"
                        >
                          <Icon icon="solar:eye-bold" />
                          Ver
                        </button>
                        {b.status !== "cancelled" && b.status !== "expired" && (
                          <button
                            onClick={() => handleCancel(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 text-xs font-semibold transition-colors"
                          >
                            <Icon icon="solar:close-circle-bold" />
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => loadBookings(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 text-sm"
          >
            ← Anterior
          </button>
          <span className="text-sm text-white/60">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => loadBookings(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 text-sm"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            {cancelModal.done ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Icon icon="solar:check-circle-bold" className="text-emerald-400 text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Reserva cancelada</h3>
                </div>
                {cancelModal.refundResult && (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                    <p className="text-sm text-white/60 mb-1">Reembolso procesado</p>
                    <p className="text-xl font-black text-violet-300">
                      {cancelModal.refundResult.refund_pct}% —{" "}
                      {cancelModal.refundResult.refund_type === "cash" ? "Efectivo" :
                       cancelModal.refundResult.refund_type === "credits" ? "Créditos" : "Sin reembolso"}
                    </p>
                    <p className="text-xs text-white/40 mt-1">{cancelModal.refundResult.reason}</p>
                  </div>
                )}
                <button
                  onClick={() => setCancelModal(null)}
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
                <p className="text-sm text-white/70 mb-4">
                  ¿Confirmas la cancelación de la reserva{" "}
                  <span className="font-mono text-violet-300 font-bold">{cancelModal.booking.reference}</span>?
                </p>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 mb-4 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-white/60">Huésped</span>
                    <span className="text-white font-medium">{cancelModal.booking.contact_name}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-white/60">Propiedad</span>
                    <span className="text-white font-medium truncate max-w-[180px]">{cancelModal.booking.property_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Total</span>
                    <span className="text-white font-bold">{formatCurrency(cancelModal.booking.total_amount, cancelModal.booking.currency)}</span>
                  </div>
                </div>
                {/* Razón de cancelación editable */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-1.5">
                    Razón de cancelación <span className="text-white/30 normal-case">(opcional)</span>
                  </label>
                  <textarea
                    value={cancelModal.adminReason}
                    onChange={(e) => setCancelModal((prev) => prev ? { ...prev, adminReason: e.target.value } : null)}
                    placeholder="Ej: Solicitud del huésped, fuerza mayor, error operativo..."
                    rows={2}
                    maxLength={500}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                </div>
                {cancelModal.error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-4">
                    {cancelModal.error}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelModal(null)}
                    className="flex-1 py-2.5 bg-white/5 border border-white/15 text-white/70 font-semibold rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Mantener
                  </button>
                  <button
                    onClick={confirmCancel}
                    disabled={cancelModal.loading}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {cancelModal.loading ? "Cancelando..." : "Confirmar"}
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

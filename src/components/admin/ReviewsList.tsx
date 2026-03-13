"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { reviewsApi, type AdminReview } from "@/lib/admin-api";

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-500/15 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  pending:  "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon
          key={s}
          icon={s <= rating ? "solar:star-bold" : "solar:star-outline"}
          className={s <= rating ? "text-amber-400" : "text-white/20"}
          style={{ fontSize: 14 }}
        />
      ))}
      <span className="ml-1 text-xs text-white/60">{rating}/5</span>
    </div>
  );
}

export function ReviewsList() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");

  // Moderation state
  const [moderateModal, setModerateModal] = useState<{
    review: AdminReview;
    action: "approve" | "reject";
    note: string;
    loading: boolean;
    done: boolean;
    error: string | null;
  } | null>(null);

  // Response modal
  const [responseModal, setResponseModal] = useState<{
    review: AdminReview;
    text: string;
    loading: boolean;
    error: string | null;
  } | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadReviews = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reviewsApi.list({
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        page: p,
      });
      setReviews(data.results);
      setTotal(data.count);
      setTotalPages(data.num_pages);
      setPage(data.page);
      setPendingCount(data.pending_count);
    } catch (e: any) {
      setError(e?.message || "Error al cargar reseñas");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => { loadReviews(1); }, [loadReviews]);

  async function submitModeration() {
    if (!moderateModal) return;
    setModerateModal((prev) => prev ? { ...prev, loading: true, error: null } : null);
    try {
      if (moderateModal.action === "approve") {
        await reviewsApi.approve(moderateModal.review.id, moderateModal.note);
      } else {
        await reviewsApi.reject(moderateModal.review.id, moderateModal.note);
      }
      setModerateModal((prev) => prev ? { ...prev, loading: false, done: true } : null);
      await loadReviews(page);
      setTimeout(() => setModerateModal(null), 1500);
    } catch (e: any) {
      setModerateModal((prev) => prev ? { ...prev, loading: false, error: e?.message || "Error" } : null);
    }
  }

  async function submitResponse() {
    if (!responseModal) return;
    setResponseModal((prev) => prev ? { ...prev, loading: true, error: null } : null);
    try {
      await reviewsApi.respond(responseModal.review.id, responseModal.text);
      setResponseModal(null);
      await loadReviews(page);
    } catch (e: any) {
      setResponseModal((prev) => prev ? { ...prev, loading: false, error: e?.message || "Error" } : null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <Icon icon="solar:clock-circle-bold-duotone" className="text-amber-400 text-2xl flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-300">
              {pendingCount} reseña{pendingCount !== 1 ? "s" : ""} pendiente{pendingCount !== 1 ? "s" : ""} de moderación
            </p>
            <p className="text-xs text-amber-400/70">Revísalas y aprueba o rechaza según las políticas de la plataforma.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por autor, contenido, propiedad..."
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
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
        </select>
        <button
          onClick={() => loadReviews(1)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Icon icon="solar:refresh-bold" className="inline mr-1" />
          Buscar
        </button>
      </div>

      <p className="text-sm text-white/50">{total} reseña{total !== 1 ? "s" : ""}</p>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-white/40">No se encontraron reseñas</div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-white">{r.author_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mb-2">{r.property_name}</p>
                    <StarRating rating={r.rating} />
                  </div>
                  <span className="text-xs text-white/40">
                    {new Date(r.created).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>

                {r.title && <p className="font-semibold text-white mb-1">{r.title}</p>}
                <p className="text-sm text-white/80 mb-3 leading-relaxed">{r.body}</p>

                {/* Sub-ratings */}
                {(r.cleanliness || r.comfort || r.location || r.value) && (
                  <div className="flex flex-wrap gap-3 text-xs text-white/50 mb-3">
                    {r.cleanliness && <span>Limpieza: <strong className="text-white/80">{r.cleanliness}/5</strong></span>}
                    {r.comfort && <span>Confort: <strong className="text-white/80">{r.comfort}/5</strong></span>}
                    {r.location && <span>Ubicación: <strong className="text-white/80">{r.location}/5</strong></span>}
                    {r.value && <span>Calidad/precio: <strong className="text-white/80">{r.value}/5</strong></span>}
                  </div>
                )}

                {/* Operator response */}
                {r.operator_response && (
                  <div className="mt-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                    <p className="text-xs font-semibold text-violet-300 mb-1">Respuesta del operador</p>
                    <p className="text-xs text-white/70">{r.operator_response}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/10">
                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => setModerateModal({ review: r, action: "approve", note: "", loading: false, done: false, error: null })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 text-xs font-semibold transition-colors"
                      >
                        <Icon icon="solar:check-circle-bold" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => setModerateModal({ review: r, action: "reject", note: "", loading: false, done: false, error: null })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 text-xs font-semibold transition-colors"
                      >
                        <Icon icon="solar:close-circle-bold" />
                        Rechazar
                      </button>
                    </>
                  )}
                  {r.status === "approved" && !r.operator_response && (
                    <button
                      onClick={() => setResponseModal({ review: r, text: "", loading: false, error: null })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-400 border border-violet-500/20 hover:bg-violet-500/25 text-xs font-semibold transition-colors"
                    >
                      <Icon icon="solar:chat-round-bold" />
                      Responder
                    </button>
                  )}
                  {r.status === "approved" && (
                    <button
                      onClick={() => setModerateModal({ review: r, action: "reject", note: "", loading: false, done: false, error: null })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400/70 border border-red-500/15 hover:bg-red-500/20 text-xs font-semibold transition-colors"
                    >
                      <Icon icon="solar:close-circle-linear" />
                      Revertir
                    </button>
                  )}
                  {r.moderated_by && (
                    <span className="text-xs text-white/30 self-center ml-auto">
                      Moderado por {r.moderated_by}
                      {r.moderated_at && (
                        <> · {new Date(r.moderated_at).toLocaleDateString("es-CO")}</>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => loadReviews(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 text-sm">← Anterior</button>
          <span className="text-sm text-white/60">Página {page} de {totalPages}</span>
          <button onClick={() => loadReviews(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 text-sm">Siguiente →</button>
        </div>
      )}

      {/* Moderation Modal */}
      {moderateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            {moderateModal.done ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  moderateModal.action === "approve" ? "bg-emerald-500/20" : "bg-red-500/20"
                }`}>
                  <Icon
                    icon={moderateModal.action === "approve" ? "solar:check-circle-bold" : "solar:close-circle-bold"}
                    className={`text-2xl ${moderateModal.action === "approve" ? "text-emerald-400" : "text-red-400"}`}
                  />
                </div>
                <p className="text-white font-semibold text-center">
                  {moderateModal.action === "approve" ? "Reseña aprobada exitosamente" : "Reseña rechazada"}
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-2">
                  {moderateModal.action === "approve" ? "Aprobar reseña" : "Rechazar reseña"}
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  {moderateModal.action === "approve"
                    ? "La reseña será publicada y visible para todos los usuarios."
                    : "La reseña será rechazada y no será visible."}
                </p>
                <textarea
                  value={moderateModal.note}
                  onChange={(e) => setModerateModal((prev) => prev ? { ...prev, note: e.target.value } : null)}
                  placeholder="Nota de moderación (opcional)..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none mb-4"
                />
                {moderateModal.error && (
                  <p className="text-sm text-red-400 mb-3">{moderateModal.error}</p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setModerateModal(null)} className="flex-1 py-2.5 bg-white/5 border border-white/15 text-white/70 font-semibold rounded-xl hover:bg-white/10 transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={submitModeration}
                    disabled={moderateModal.loading}
                    className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-colors disabled:opacity-50 ${moderateModal.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
                  >
                    {moderateModal.loading ? "Procesando..." : (moderateModal.action === "approve" ? "Aprobar" : "Rechazar")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Response Modal */}
      {responseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Responder reseña</h3>
            <p className="text-sm text-white/60 mb-4">Esta respuesta será visible junto a la reseña del huésped.</p>
            <textarea
              value={responseModal.text}
              onChange={(e) => setResponseModal((prev) => prev ? { ...prev, text: e.target.value } : null)}
              placeholder="Escribe la respuesta del operador..."
              rows={4}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none mb-4"
            />
            {responseModal.error && <p className="text-sm text-red-400 mb-3">{responseModal.error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setResponseModal(null)} className="flex-1 py-2.5 bg-white/5 border border-white/15 text-white/70 font-semibold rounded-xl hover:bg-white/10 transition-colors">Cancelar</button>
              <button
                onClick={submitResponse}
                disabled={responseModal.loading || !responseModal.text.trim()}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {responseModal.loading ? "Enviando..." : "Publicar respuesta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

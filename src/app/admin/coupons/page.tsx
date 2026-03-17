"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { couponsApi, type AdminCoupon } from "@/lib/admin-api";

const STATUS_BADGE: Record<string, string> = {
  active:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  paused:  "bg-amber-500/15 text-amber-400 border-amber-500/20",
  expired: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  active:  "Activo",
  paused:  "Pausado",
  expired: "Expirado",
};

const EMPTY_FORM = {
  code: "",
  description: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: "",
  max_discount_amount: "",
  min_booking_amount: "0",
  max_uses: "",
  max_uses_per_user: "1",
  valid_from: new Date().toISOString().split("T")[0],
  valid_until: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await couponsApi.list({
        page: p,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setCoupons(data.results);
      setTotal(data.count);
      setNumPages(data.num_pages);
      setPage(data.page);
    } catch (e: any) {
      setError(e?.message || "Error al cargar cupones");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  function parseBackendError(raw: string): string {
    // raw viene en formato "API 400: {\"code\":[\"...\"]}" — extraer mensaje legible
    try {
      const match = raw.match(/^API \d+: ([\s\S]+)$/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        const fieldMap: Record<string, string> = {
          code: "Código",
          discount_value: "Valor de descuento",
          valid_until: "Fecha de expiración",
          valid_from: "Fecha de inicio",
          max_uses: "Usos máximos",
        };
        for (const [field, label] of Object.entries(fieldMap)) {
          if (parsed[field]) {
            const msg = Array.isArray(parsed[field]) ? parsed[field][0] : parsed[field];
            return `${label}: ${msg}`;
          }
        }
        if (parsed.detail) return parsed.detail;
        if (parsed.non_field_errors) return parsed.non_field_errors[0];
      }
    } catch {}
    return raw;
  }

  async function handleCreate() {
    setFormLoading(true);
    setFormError(null);

    // Validaciones client-side
    const discountNum = parseFloat(form.discount_value);
    if (isNaN(discountNum) || discountNum <= 0) {
      setFormError("El valor del descuento debe ser mayor a 0.");
      setFormLoading(false);
      return;
    }
    if (form.discount_type === "percentage" && discountNum > 100) {
      setFormError("El porcentaje no puede ser mayor a 100.");
      setFormLoading(false);
      return;
    }
    if (form.valid_until && form.valid_from && form.valid_until <= form.valid_from) {
      setFormError("La fecha de expiración debe ser posterior a la fecha de inicio.");
      setFormLoading(false);
      return;
    }

    try {
      await couponsApi.create({
        code: form.code,
        description: form.description || undefined,
        discount_type: form.discount_type,
        discount_value: form.discount_value || "0",
        max_discount_amount: form.max_discount_amount ? form.max_discount_amount : null,
        min_booking_amount: form.min_booking_amount || "0",
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        max_uses_per_user: parseInt(form.max_uses_per_user) || 1,
        valid_from: form.valid_from,
        valid_until: form.valid_until || null,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      load(1);
    } catch (e: any) {
      setFormError(parseBackendError(e.message));
    } finally {
      setFormLoading(false);
    }
  }

  async function handleStatusChange(coupon: AdminCoupon, newStatus: string) {
    try {
      await couponsApi.patch(coupon.id, { status: newStatus });
      load(page);
    } catch (e: any) {
      alert(e?.message || "Error al actualizar");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Seguro que quieres eliminar este cupón?")) return;
    try {
      await couponsApi.delete(id);
      load(page);
    } catch (e: any) {
      alert(e?.message || "Error al eliminar");
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cupones y promociones"
        subtitle="Crea y gestiona códigos de descuento para reservas en la plataforma."
      >
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Icon icon="solar:add-circle-bold" />
          Nuevo cupón
        </button>
      </AdminPageHeader>

      {/* Create form */}
      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-4">Crear cupón</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1">Código *</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="NEWAYZI20"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1">Tipo de descuento</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as any }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Valor fijo (COP)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1">
                Valor del descuento * {form.discount_type === "percentage" ? "(%)" : "(COP)"}
              </label>
              <input
                type="number"
                value={form.discount_value}
                onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === "percentage" ? "20" : "50000"}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
            {form.discount_type === "percentage" && (
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">
                  Descuento máximo (COP) <span className="text-white/30 normal-case font-normal">— opcional, cap del descuento</span>
                </label>
                <input
                  type="number"
                  value={form.max_discount_amount}
                  onChange={(e) => setForm((f) => ({ ...f, max_discount_amount: e.target.value }))}
                  placeholder="Ej: 50000 (sin límite si se deja vacío)"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1">Monto mínimo de reserva (COP)</label>
              <input
                type="number"
                value={form.min_booking_amount}
                onChange={(e) => setForm((f) => ({ ...f, min_booking_amount: e.target.value }))}
                placeholder="0"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1">Usos totales máximos</label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                placeholder="Ilimitado"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1">Usos por usuario</label>
              <input
                type="number"
                value={form.max_uses_per_user}
                onChange={(e) => setForm((f) => ({ ...f, max_uses_per_user: e.target.value }))}
                min="1"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1">Válido desde</label>
              <input
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1">Válido hasta (opcional)</label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-white/60 mb-1">Descripción</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descuento de bienvenida para nuevos usuarios"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
          </div>
          {formError && <p className="text-sm text-red-400 mt-3">{formError}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="flex-1 py-2.5 bg-white/5 border border-white/15 text-white/70 font-semibold rounded-xl hover:bg-white/10 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={formLoading || !form.code || !form.discount_value}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm"
            >
              {formLoading ? "Creando..." : "Crear cupón"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por código o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="paused">Pausados</option>
          <option value="expired">Expirados</option>
        </select>
        <button onClick={() => load(1)} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl">
          <Icon icon="solar:refresh-bold" className="inline mr-1" />Buscar
        </button>
      </div>

      <p className="text-sm text-white/50">{total} cupón{total !== 1 ? "es" : ""}</p>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Código</th>
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Descuento</th>
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Usos</th>
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Vigencia</th>
                <th className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Estado</th>
                <th className="text-center px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {coupons.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-white/40">No se encontraron cupones</td></tr>
              ) : coupons.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-violet-300 font-bold text-base">{c.code}</span>
                    {c.description && <div className="text-xs text-white/40 mt-0.5 max-w-[200px] truncate">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-white">
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `$${parseInt(c.discount_value).toLocaleString()}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {c.times_used} / {c.max_uses ?? "∞"}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">
                    <div>{new Date(c.valid_from).toLocaleDateString("es-CO")}</div>
                    {c.valid_until && <div>→ {new Date(c.valid_until).toLocaleDateString("es-CO")}</div>}
                    {!c.valid_until && <div className="text-white/30">Sin vencimiento</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {c.status === "active" ? (
                        <button
                          onClick={() => handleStatusChange(c, "paused")}
                          className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 text-xs font-semibold"
                        >
                          Pausar
                        </button>
                      ) : c.status === "paused" ? (
                        <button
                          onClick={() => handleStatusChange(c, "active")}
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 text-xs font-semibold"
                        >
                          Activar
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 text-xs font-semibold"
                      >
                        <Icon icon="solar:trash-bin-bold" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {numPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => load(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 text-sm">← Anterior</button>
          <span className="text-sm text-white/60">Página {page} de {numPages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= numPages} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 text-sm">Siguiente →</button>
        </div>
      )}
    </div>
  );
}

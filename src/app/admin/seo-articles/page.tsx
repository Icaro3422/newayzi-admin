"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { seoArticlesApi, type AdminSeoArticle } from "@/lib/admin-api";

const STATUS_BADGE: Record<string, string> = {
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  draft: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  archived: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  published: "Publicada",
  draft: "Borrador",
  archived: "Archivada",
};

const TYPE_LABEL: Record<string, string> = {
  property_guide: "Guía propiedad",
  city_guide: "Guía ciudad",
  segment_landing: "Landing segmento",
  editorial: "Editorial",
  industry_news: "Noticia sector",
  platform_event: "Evento / temporada",
  platform_promo: "Promo plataforma",
  operator_partner_spotlight: "Spotlight partner",
  rewards_spotlight: "Oferta Rewards",
};

function parseIds(raw: string): number[] | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const parts = s.split(/[\s,;]+/).filter(Boolean);
  const nums = parts.map((p) => parseInt(p, 10)).filter((n) => !Number.isNaN(n));
  return nums.length ? nums : undefined;
}

export default function AdminSeoArticlesPage() {
  const [articles, setArticles] = useState<AdminSeoArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{
    total_all: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    by_locale: Record<string, number>;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const pageSize = 50;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [localeFilter, setLocaleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [generatedFrom, setGeneratedFrom] = useState("");
  const [generatedTo, setGeneratedTo] = useState("");
  const [publishedFrom, setPublishedFrom] = useState("");
  const [publishedTo, setPublishedTo] = useState("");

  const [genOpen, setGenOpen] = useState(false);
  const [genLimit, setGenLimit] = useState("5");
  const [genLocales, setGenLocales] = useState("es, en");
  const [genPublished, setGenPublished] = useState(false);
  const [genPropertyIds, setGenPropertyIds] = useState("");
  const [genCityIds, setGenCityIds] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const [patchingId, setPatchingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await seoArticlesApi.list({
        status: statusFilter || undefined,
        article_type: typeFilter || undefined,
        locale: localeFilter || undefined,
        search: search || undefined,
        generated_from: generatedFrom || undefined,
        generated_to: generatedTo || undefined,
        published_from: publishedFrom || undefined,
        published_to: publishedTo || undefined,
        page,
        page_size: pageSize,
        order: "-updated_at",
      });
      setArticles(data.results);
      setTotal(data.total ?? data.count ?? data.results.length);
      setHasNext(Boolean(data.has_next));
      setSummary(data.summary ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar guías");
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    typeFilter,
    localeFilter,
    search,
    generatedFrom,
    generatedTo,
    publishedFrom,
    publishedTo,
    page,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const statusCount = summary?.by_status || {};
  const byType = summary?.by_type || {};
  const byLocale = summary?.by_locale || {};

  function fmtDate(value: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function patchStatus(id: number, status: string) {
    setPatchingId(id);
    try {
      await seoArticlesApi.patch(id, { status });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setPatchingId(null);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenLoading(true);
    setGenError(null);
    setGenMessage(null);
    const limit = Math.max(1, Math.min(50, parseInt(genLimit, 10) || 5));
    const locales = genLocales
      .split(/[\s,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const property_ids = parseIds(genPropertyIds);
    const city_ids = parseIds(genCityIds);
    try {
      const res = await seoArticlesApi.generate({
        limit,
        locales: locales.length ? locales : ["es"],
        as_published: genPublished,
        property_ids,
        city_ids,
      });
      if (res.queued && res.task_id) {
        setGenMessage(
          `Generación encolada (task ${res.task_id}). El proceso corre en background sin bloquear la página.`
        );
      } else {
        setGenMessage(
          `Creadas: ${res.created ?? 0}, omitidas: ${res.skipped ?? 0}, fallidas: ${res.failed ?? 0} (${res.execution_time_ms ?? 0} ms).`
        );
      }
      if (res.errors?.length) {
        setGenMessage((m) => `${m} Errores: ${res.errors!.slice(0, 3).join(" · ")}`);
      }
      setGenOpen(false);
      await load();
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Error en generación");
    } finally {
      setGenLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Guías SEO (IA)"
        subtitle="Artículos por propiedad o ciudad, generados con OpenAI y servidos en el sitio público bajo /[idioma]/guia/[slug]."
      >
        <button
          type="button"
          onClick={() => {
            setGenOpen(true);
            setGenError(null);
            setGenMessage(null);
          }}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl font-sora font-semibold text-sm text-white bg-gradient-to-br from-[#8a7346] to-[#b89a5e] hover:from-[#b89a5e] hover:to-[#9a7d4a] transition-all"
        >
          <Icon icon="solar:magic-stick-3-bold-duotone" className="text-lg" />
          Generar
        </button>
      </AdminPageHeader>

      {genMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 font-sora">
          {genMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200 font-sora flex gap-2">
          <Icon icon="solar:danger-circle-bold-duotone" className="text-lg shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-white/50 text-sm font-sora">Estado</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="bg-white/[0.08] border border-white/[0.15] rounded-xl px-3 py-2 text-sm text-white font-sora outline-none focus:border-[#b89a5e]"
        >
          <option value="">Todos</option>
          <option value="published">Publicadas</option>
          <option value="draft">Borradores</option>
          <option value="archived">Archivadas</option>
        </select>
        <label className="text-white/50 text-sm font-sora">Tipo</label>
        <select
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value);
          }}
          className="bg-white/[0.08] border border-white/[0.15] rounded-xl px-3 py-2 text-sm text-white font-sora outline-none focus:border-[#b89a5e]"
        >
          <option value="">Todos</option>
          {Object.keys(TYPE_LABEL).map((type) => (
            <option key={type} value={type}>
              {TYPE_LABEL[type]}
            </option>
          ))}
        </select>
        <label className="text-white/50 text-sm font-sora">Locale</label>
        <select
          value={localeFilter}
          onChange={(e) => {
            setPage(1);
            setLocaleFilter(e.target.value);
          }}
          className="bg-white/[0.08] border border-white/[0.15] rounded-xl px-3 py-2 text-sm text-white font-sora outline-none focus:border-[#b89a5e]"
        >
          <option value="">Todos</option>
          <option value="es">es</option>
          <option value="en">en</option>
        </select>
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Buscar por título, slug o descripción"
          className="min-w-[280px] bg-white/[0.08] border border-white/[0.15] rounded-xl px-3 py-2 text-sm text-white font-sora placeholder:text-white/30 outline-none focus:border-[#b89a5e]"
        />
        <div className="flex items-center gap-2">
          <label className="text-white/45 text-xs font-sora">Gen. desde</label>
          <input
            type="date"
            value={generatedFrom}
            onChange={(e) => {
              setPage(1);
              setGeneratedFrom(e.target.value);
            }}
            className="bg-white/[0.08] border border-white/[0.15] rounded-xl px-2 py-1.5 text-xs text-white font-sora"
          />
          <label className="text-white/45 text-xs font-sora">a</label>
          <input
            type="date"
            value={generatedTo}
            onChange={(e) => {
              setPage(1);
              setGeneratedTo(e.target.value);
            }}
            className="bg-white/[0.08] border border-white/[0.15] rounded-xl px-2 py-1.5 text-xs text-white font-sora"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-white/45 text-xs font-sora">Pub. desde</label>
          <input
            type="date"
            value={publishedFrom}
            onChange={(e) => {
              setPage(1);
              setPublishedFrom(e.target.value);
            }}
            className="bg-white/[0.08] border border-white/[0.15] rounded-xl px-2 py-1.5 text-xs text-white font-sora"
          />
          <label className="text-white/45 text-xs font-sora">a</label>
          <input
            type="date"
            value={publishedTo}
            onChange={(e) => {
              setPage(1);
              setPublishedTo(e.target.value);
            }}
            className="bg-white/[0.08] border border-white/[0.15] rounded-xl px-2 py-1.5 text-xs text-white font-sora"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            load();
          }}
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white font-sora"
        >
          <Icon icon="solar:refresh-bold-duotone" />
          Actualizar
        </button>
        <button
          type="button"
          onClick={() => {
            setStatusFilter("");
            setTypeFilter("");
            setLocaleFilter("");
            setSearch("");
            setGeneratedFrom("");
            setGeneratedTo("");
            setPublishedFrom("");
            setPublishedTo("");
            setPage(1);
          }}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 font-sora"
        >
          <Icon icon="solar:eraser-bold-duotone" />
          Limpiar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3">
          <p className="text-white/45 text-xs font-sora uppercase tracking-wider">Total (global)</p>
          <p className="text-white font-sora text-xl font-semibold">{summary?.total_all ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3">
          <p className="text-white/45 text-xs font-sora uppercase tracking-wider">Publicadas</p>
          <p className="text-emerald-300 font-sora text-xl font-semibold">{statusCount.published ?? 0}</p>
        </div>
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3">
          <p className="text-white/45 text-xs font-sora uppercase tracking-wider">Borradores</p>
          <p className="text-amber-300 font-sora text-xl font-semibold">{statusCount.draft ?? 0}</p>
        </div>
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3">
          <p className="text-white/45 text-xs font-sora uppercase tracking-wider">Resultado actual</p>
          <p className="text-white font-sora text-xl font-semibold">{total}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3">
          <p className="text-white/45 text-xs font-sora uppercase tracking-wider mb-2">Recuento por tipo</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byType).map(([key, value]) => (
              <span key={key} className="inline-flex rounded-lg border border-white/[0.15] px-2 py-1 text-xs text-white/80">
                {TYPE_LABEL[key] || key}: {value}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3">
          <p className="text-white/45 text-xs font-sora uppercase tracking-wider mb-2">Recuento por locale</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byLocale).map(([key, value]) => (
              <span key={key} className="inline-flex rounded-lg border border-white/[0.15] px-2 py-1 text-xs text-white/80">
                {key}: {value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {genOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#0f1228] p-6 shadow-2xl">
            <h2 className="font-sora font-bold text-lg text-white mb-1">Generar guías</h2>
            <p className="text-white/50 text-sm font-sora mb-4">
              Usa <code className="text-white/70">OPENAI_API_KEY</code> en el servidor. El cron suele usar{" "}
              <code className="text-white/70">SEO_GENERATE_DAILY_LIMIT</code> (p. ej. 66/día ≈ ~10 USD/mes si cada
              artículo ≈ 0.005 USD). Sin IDs: recorre propiedades publicadas; con IDs: solo esas filas.
            </p>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs text-white/45 mb-1 font-sora">Límite (1–50)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={genLimit}
                  onChange={(e) => setGenLimit(e.target.value)}
                  className="w-full bg-white/[0.08] border border-white/[0.15] rounded-xl px-3 py-2.5 text-white text-sm font-sora"
                />
              </div>
              <div>
                <label className="block text-xs text-white/45 mb-1 font-sora">Idiomas (coma)</label>
                <input
                  value={genLocales}
                  onChange={(e) => setGenLocales(e.target.value)}
                  placeholder="es, en"
                  className="w-full bg-white/[0.08] border border-white/[0.15] rounded-xl px-3 py-2.5 text-white text-sm font-sora placeholder:text-white/25"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="gen-pub"
                  type="checkbox"
                  checked={genPublished}
                  onChange={(e) => setGenPublished(e.target.checked)}
                  className="rounded border-white/20"
                />
                <label htmlFor="gen-pub" className="text-sm text-white/80 font-sora">
                  Publicar al crear
                </label>
              </div>
              <div>
                <label className="block text-xs text-white/45 mb-1 font-sora">IDs propiedad (opcional)</label>
                <input
                  value={genPropertyIds}
                  onChange={(e) => setGenPropertyIds(e.target.value)}
                  placeholder="1, 2, 3"
                  className="w-full bg-white/[0.08] border border-white/[0.15] rounded-xl px-3 py-2.5 text-white text-sm font-sora placeholder:text-white/25"
                />
              </div>
              <div>
                <label className="block text-xs text-white/45 mb-1 font-sora">IDs ciudad (opcional)</label>
                <input
                  value={genCityIds}
                  onChange={(e) => setGenCityIds(e.target.value)}
                  placeholder="solo si no usas propiedades"
                  className="w-full bg-white/[0.08] border border-white/[0.15] rounded-xl px-3 py-2.5 text-white text-sm font-sora placeholder:text-white/25"
                />
              </div>
              {genError ? (
                <p className="text-red-300 text-sm font-sora">{genError}</p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGenOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-sora text-white/70 hover:bg-white/[0.06]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={genLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-sora font-semibold text-white bg-gradient-to-br from-[#8a7346] to-[#b89a5e] disabled:opacity-50"
                >
                  {genLoading ? "Generando…" : "Ejecutar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-white/40 font-sora text-sm">Cargando…</div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-white/45 font-sora text-sm">
            No hay guías. Pulsa Generar o ejecuta{" "}
            <code className="text-white/60">python manage.py seo_generate_daily</code> en el backend.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sora">
              <thead>
                <tr className="border-b border-white/[0.08] text-white/40 uppercase text-[0.65rem] tracking-wider">
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Slug / locale</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Generada</th>
                  <th className="px-4 py-3">Publicada</th>
                  <th className="px-4 py-3">Actualizada</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white/90 max-w-[220px]">
                      <span className="line-clamp-2">{a.title}</span>
                    </td>
                    <td className="px-4 py-3 text-white/55 whitespace-nowrap">
                      {TYPE_LABEL[a.article_type] || a.article_type}
                    </td>
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">
                      /{a.locale}/guia/{a.slug}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-lg text-xs border ${
                          STATUS_BADGE[a.status] || "bg-white/10 text-white/50"
                        }`}
                      >
                        {STATUS_LABEL[a.status] || a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/55 text-xs whitespace-nowrap">{fmtDate(a.created_at)}</td>
                    <td className="px-4 py-3 text-white/55 text-xs whitespace-nowrap">{fmtDate(a.published_at)}</td>
                    <td className="px-4 py-3 text-white/55 text-xs whitespace-nowrap">{fmtDate(a.updated_at)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {a.status !== "published" ? (
                        <button
                          type="button"
                          disabled={patchingId === a.id}
                          onClick={() => patchStatus(a.id, "published")}
                          className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold mr-2 disabled:opacity-50"
                        >
                          Publicar
                        </button>
                      ) : null}
                      {a.status === "published" ? (
                        <button
                          type="button"
                          disabled={patchingId === a.id}
                          onClick={() => patchStatus(a.id, "draft")}
                          className="text-amber-400 hover:text-amber-300 text-xs font-semibold mr-2 disabled:opacity-50"
                        >
                          Borrador
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={patchingId === a.id}
                        onClick={() => patchStatus(a.id, "archived")}
                        className="text-white/35 hover:text-white/55 text-xs disabled:opacity-50"
                      >
                        Archivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-white/45 text-xs font-sora">
          Página {page} · Mostrando {articles.length} de {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg text-xs font-sora text-white/70 border border-white/[0.15] disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={!hasNext || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-sora text-white/70 border border-white/[0.15] disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

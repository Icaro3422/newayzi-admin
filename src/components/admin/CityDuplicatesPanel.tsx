"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";

type CityEntry = {
  id: number;
  name: string;
  country_name: string;
  country_code: string;
  property_count: number;
  is_active: boolean;
};

type DuplicateGroup = {
  cities: CityEntry[];
};

export function CityDuplicatesPanel() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.getAdminCityDuplicates();
      setGroups(res.duplicates ?? []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleMerge(group: DuplicateGroup) {
    // El canónico es el que tiene más propiedades (o menor ID en empate)
    const sorted = [...group.cities].sort((a, b) =>
      b.property_count !== a.property_count
        ? b.property_count - a.property_count
        : a.id - b.id
    );
    const canonical = sorted[0];
    const fromIds = sorted.slice(1).map((c) => c.id);
    const key = `${canonical.id}`;
    setMerging(key);
    try {
      const res = await adminApi.mergeAdminCities(canonical.id, fromIds);
      addToast({
        title: "Ciudades fusionadas",
        description: `${res.properties_moved} propiedad(es) movidas a "${canonical.name}" (id=${canonical.id}).`,
        color: "success",
      });
      await load();
    } catch (e) {
      addToast({
        title: "Error al fusionar",
        description: e instanceof Error ? e.message : "Error desconocido",
        color: "danger",
      });
    } finally {
      setMerging(null);
    }
  }

  if (!loading && groups.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <Icon icon="solar:danger-triangle-bold-duotone" className="text-amber-400 text-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-300 font-sora">
            {loading ? "Verificando ciudades duplicadas…" : `${groups.length} grupo(s) de ciudades duplicadas`}
          </p>
          <p className="text-xs text-amber-300/60">
            Afecta la búsqueda de alojamientos. Fusiona los duplicados para que todas las propiedades aparezcan al buscar por ciudad.
          </p>
        </div>
        <Icon
          icon={expanded ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
          className="text-amber-400/60 shrink-0"
          width={16}
        />
      </button>

      {/* Body */}
      {expanded && !loading && groups.length > 0 && (
        <div className="border-t border-amber-500/15 divide-y divide-amber-500/10">
          {groups.map((group, gi) => {
            const sorted = [...group.cities].sort((a, b) =>
              b.property_count !== a.property_count
                ? b.property_count - a.property_count
                : a.id - b.id
            );
            const canonical = sorted[0];
            const isMerging = merging === String(canonical.id);

            return (
              <div key={gi} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/90 font-sora">
                    {canonical.name}
                    <span className="ml-2 text-xs font-mono bg-white/10 rounded px-1.5 py-0.5 uppercase">
                      {canonical.country_code}
                    </span>
                    <span className="ml-1.5 text-xs text-white/40">{canonical.country_name}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sorted.map((c, ci) => (
                      <div
                        key={c.id}
                        className={`flex items-center gap-1.5 text-xs rounded-xl px-2.5 py-1 border ${
                          ci === 0
                            ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-300"
                            : "bg-white/[0.05] border-white/[0.1] text-white/60"
                        }`}
                      >
                        {ci === 0 && (
                          <Icon icon="solar:crown-bold" className="text-emerald-400" width={12} />
                        )}
                        <span className="font-mono">id={c.id}</span>
                        <span className="text-white/40">·</span>
                        <span>{c.property_count} prop.</span>
                        {ci === 0 && <span className="text-emerald-400/70 ml-0.5">canónico</span>}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-amber-300/60">
                    Se moverán las propiedades de id={sorted.slice(1).map((c) => c.id).join(", ")} → id={canonical.id}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!!isMerging}
                  onClick={() => handleMerge(group)}
                  className="shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-sm font-semibold transition disabled:opacity-50"
                >
                  {isMerging ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin" />
                      Fusionando…
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:merge-cells-bold" width={15} />
                      Fusionar
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

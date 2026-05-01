"use client";

import { useEffect, useRef } from "react";
import { Spinner } from "@heroui/react";
import { useMapbox } from "@/hooks/useMapbox";
import { MAPBOX_MAP_STYLE_URL } from "@/lib/mapbox-map-style";

type Props = {
  /** Cambia al elegir otra ciudad para reinicializar el mapa centrado */
  mapKey: string | number;
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
};

/**
 * Mapa Mapbox: clic para colocar el pin, pin arrastrable. Alineado con el stack del frontend público.
 */
export function PropertyLocationMapPicker({ mapKey, lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const draggingRef = useRef(false);
  const { mapboxgl, isLoaded } = useMapbox();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Montar mapa (o reiniciar al cambiar ciudad)
  useEffect(() => {
    if (!isLoaded || !mapboxgl || !containerRef.current) return;
    const container = containerRef.current;

    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      return;
    }

    if (mapRef.current) {
      try {
        markerRef.current?.remove();
        mapRef.current.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
      markerRef.current = null;
    }

    const map = new mapboxgl.Map({
      container,
      style: MAPBOX_MAP_STYLE_URL,
      center: [lng, lat],
      zoom: 15,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");

    const marker = new mapboxgl.Marker({ color: "#5e2cec", draggable: true })
      .setLngLat([lng, lat])
      .addTo(map);

    marker.on("dragstart", () => {
      draggingRef.current = true;
    });
    marker.on("dragend", () => {
      const p = marker.getLngLat();
      draggingRef.current = false;
      onChangeRef.current(p.lat, p.lng);
    });

    map.on("click", (e: { lngLat: { lat: number; lng: number } }) => {
      const { lng: glng, lat: glat } = e.lngLat;
      marker.setLngLat([glng, glat]);
      onChangeRef.current(glat, glng);
    });

    map.on("load", () => {
      map.resize();
    });

    mapRef.current = map;
    markerRef.current = marker;

    const ro = new ResizeObserver(() => {
      try {
        map.resize();
      } catch {
        /* ignore */
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      try {
        marker.remove();
        map.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [isLoaded, mapboxgl, mapKey]);

  // Sincronizar pin cuando lat/lng cambian desde fuera (geocodificación, centro ciudad)
  useEffect(() => {
    if (!markerRef.current || !mapRef.current || draggingRef.current) return;
    const cur = markerRef.current.getLngLat();
    if (Math.abs(cur.lat - lat) < 1e-5 && Math.abs(cur.lng - lng) < 1e-5) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: Math.max(mapRef.current.getZoom(), 15),
      duration: 700,
    });
  }, [lat, lng]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100/90">
        Configura <code className="text-xs bg-black/30 px-1 rounded">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> en el entorno
        del admin para usar el mapa (mismo token que el sitio público).
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[280px] flex items-center justify-center rounded-xl border border-white/10 bg-black/30">
        <Spinner size="md" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#9b74ff]" }} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/45">
        Haz clic en el mapa o arrastra el pin para la ubicación exacta del alojamiento.
      </p>
      <div
        ref={containerRef}
        className="h-[280px] w-full rounded-xl overflow-hidden border border-white/[0.12] bg-[#0a0c14]"
      />
    </div>
  );
}

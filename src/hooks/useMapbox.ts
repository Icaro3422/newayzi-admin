/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    mapboxgl: any;
  }
}

/**
 * Misma estrategia que en `frontend`: Mapbox GL JS vía CDN + token público.
 */
export function useMapbox() {
  const [mapboxgl, setMapboxgl] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.mapboxgl) {
      const cssLoaded = document.querySelector('link[href*="mapbox-gl.css"]');
      if (cssLoaded) {
        window.mapboxgl.accessToken =
          process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || window.mapboxgl.accessToken || "";
        setMapboxgl(window.mapboxgl);
        setIsLoaded(true);
        return;
      }
      const link = document.createElement("link");
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
      link.rel = "stylesheet";
      link.onload = () => {
        window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
        setMapboxgl(window.mapboxgl);
        setIsLoaded(true);
      };
      document.head.appendChild(link);
      return;
    }

    let cssLink = document.querySelector('link[href*="mapbox-gl.css"]') as HTMLLinkElement;
    if (!cssLink) {
      cssLink = document.createElement("link");
      cssLink.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
      cssLink.rel = "stylesheet";
      document.head.appendChild(cssLink);
    }

    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js";
    script.onload = () => {
      window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
      setTimeout(() => {
        setMapboxgl(window.mapboxgl);
        setIsLoaded(true);
      }, 50);
    };
    document.head.appendChild(script);
  }, []);

  return { mapboxgl, isLoaded };
}

/**
 * Geocodificación directa con Mapbox (mismo stack que el sitio público).
 * Requiere NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN en el admin.
 */

export type GeocodeResult = {
  lat: number;
  lng: number;
  placeName: string;
};

export async function mapboxForwardGeocode(
  query: string,
  proximity?: { lng: number; lat: number }
): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token || !query.trim()) return null;

  const q = encodeURIComponent(query.trim());
  let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${token}&limit=1&language=es`;
  if (proximity) {
    url += `&proximity=${proximity.lng},${proximity.lat}`;
  }

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: { center: [number, number]; place_name?: string }[];
  };
  const f = data.features?.[0];
  if (!f?.center) return null;
  const [lng, lat] = f.center;
  return {
    lat,
    lng,
    placeName: f.place_name || query,
  };
}

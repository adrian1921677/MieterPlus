/**
 * Mapbox Helper — Geocoding API + Static Images API.
 * Public-Token wird via NEXT_PUBLIC_MAPBOX_TOKEN aus ENV gelesen.
 *
 * Mapbox-Public-Tokens (pk.*) sind explizit für den Browser gedacht
 * und durch URL-Restriction im Mapbox-Dashboard abgesichert.
 */

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
export const MAPBOX_ENABLED = MAPBOX_TOKEN.length > 0;

export type GeocodingFeature = {
  /** Vollständig formatierte Adresse, z.B. "Musterstraße 12, 42103 Wuppertal, Deutschland" */
  place_name: string;
  /** [lng, lat] */
  center: [number, number];
  /** Extrahierte Adresskomponenten */
  address?: {
    street?: string;
    house_number?: string;
    postal_code?: string;
    city?: string;
    country_code?: string;
  };
};

type MapboxRawFeature = {
  id?: string;
  place_name?: string;
  text?: string;
  address?: string;
  center?: [number, number];
  context?: { id: string; text: string; short_code?: string }[];
};

function extractAddress(feature: MapboxRawFeature): GeocodingFeature['address'] {
  const ctx = feature.context ?? [];
  const findByPrefix = (prefix: string) =>
    ctx.find((c) => c.id.startsWith(prefix))?.text;
  const findShortCodeByPrefix = (prefix: string) =>
    ctx.find((c) => c.id.startsWith(prefix))?.short_code;

  return {
    street: feature.text,
    house_number: feature.address,
    postal_code: findByPrefix('postcode'),
    city: findByPrefix('place') ?? findByPrefix('locality'),
    country_code: findShortCodeByPrefix('country')?.toUpperCase(),
  };
}

/**
 * Adress-Suche via Mapbox Geocoding API (Forward Geocoding).
 * Standardmäßig auf Deutschland eingegrenzt + nur Adress-Features.
 */
export async function searchAddress(
  query: string,
  options?: { country?: string; limit?: number; signal?: AbortSignal },
): Promise<GeocodingFeature[]> {
  if (!MAPBOX_ENABLED || query.trim().length < 3) return [];

  const country = options?.country ?? 'de';
  const limit = options?.limit ?? 5;
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  );
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('country', country);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('language', 'de');
  url.searchParams.set('types', 'address,place');
  url.searchParams.set('autocomplete', 'true');

  const res = await fetch(url.toString(), { signal: options?.signal });
  if (!res.ok) throw new Error(`Mapbox Geocoding fehlgeschlagen (${res.status})`);
  const json: { features?: MapboxRawFeature[] } = await res.json();
  return (json.features ?? [])
    .filter((f): f is MapboxRawFeature & { place_name: string; center: [number, number] } =>
      Boolean(f.place_name && f.center),
    )
    .map((f) => ({
      place_name: f.place_name,
      center: f.center,
      address: extractAddress(f),
    }));
}

/**
 * Static-Map-URL für Adress-Anzeige (kein interaktives JS nötig).
 * Standard: 600x300 px, Marker auf der Position, Zoom 15.
 */
export function staticMapUrl({
  longitude,
  latitude,
  width = 600,
  height = 300,
  zoom = 15,
  retina = true,
  style = 'streets-v12',
}: {
  longitude: number;
  latitude: number;
  width?: number;
  height?: number;
  zoom?: number;
  retina?: boolean;
  style?: 'streets-v12' | 'light-v11' | 'dark-v11' | 'outdoors-v12';
}): string {
  if (!MAPBOX_ENABLED) return '';
  const marker = `pin-l+2563a8(${longitude},${latitude})`;
  const dims = retina ? `${width}x${height}@2x` : `${width}x${height}`;
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${marker}/${longitude},${latitude},${zoom},0/${dims}?access_token=${MAPBOX_TOKEN}`;
}

/**
 * Forward Geocoding für gespeicherte Adresse (street + house_number + postal_code + city)
 * → [lng, lat]. Wird zur Anzeige der Karte für bereits gespeicherte Properties verwendet,
 * wenn noch keine Koordinaten in der DB stehen.
 */
export async function geocodeStoredAddress(parts: {
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
}): Promise<[number, number] | null> {
  if (!MAPBOX_ENABLED) return null;
  const q = `${parts.street} ${parts.house_number}, ${parts.postal_code} ${parts.city}`;
  const results = await searchAddress(q, { limit: 1 });
  return results[0]?.center ?? null;
}

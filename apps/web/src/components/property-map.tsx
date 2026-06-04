import { staticMapUrl, geocodeStoredAddress, MAPBOX_ENABLED } from '@/lib/mapbox';

type Props = {
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  /** Falls schon Koordinaten in der DB stehen, direkt verwenden (spart 1 API-Call). */
  longitude?: number | null;
  latitude?: number | null;
  width?: number;
  height?: number;
  zoom?: number;
  className?: string;
};

/**
 * Server-Component: Zeigt eine Mapbox-Static-Map für eine Adresse.
 * Wenn lat/lng noch nicht in der DB stehen, wird die Adresse on-the-fly geocoded.
 * Rendert nichts, falls Mapbox nicht konfiguriert ist oder die Adresse
 * nicht gefunden werden kann.
 */
export async function PropertyMap({
  street,
  house_number,
  postal_code,
  city,
  longitude,
  latitude,
  width = 600,
  height = 240,
  zoom = 15,
  className = '',
}: Props) {
  if (!MAPBOX_ENABLED) return null;

  let lng = longitude;
  let lat = latitude;

  if (lng == null || lat == null) {
    try {
      const coords = await geocodeStoredAddress({ street, house_number, postal_code, city });
      if (!coords) return null;
      [lng, lat] = coords;
    } catch {
      return null;
    }
  }

  const url = staticMapUrl({ longitude: lng, latitude: lat, width, height, zoom });
  if (!url) return null;

  const alt = `Karte: ${street} ${house_number}, ${postal_code} ${city}`;

  return (
    <div className={`overflow-hidden rounded-md border border-zinc-200 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className="block h-auto w-full"
      />
    </div>
  );
}

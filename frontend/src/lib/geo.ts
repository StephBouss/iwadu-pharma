// Distances et positions. Formule de haversine : précise à quelques mètres
// près sur les distances d'une ville, sans extension PostGIS.

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

export function isValidLatLng(p: { lat?: unknown; lng?: unknown }): p is LatLng {
  return (
    typeof p.lat === 'number' &&
    typeof p.lng === 'number' &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

/** Le quartier le plus proche d'une position (journaux : jamais la position exacte). */
export function nearest<T extends LatLng>(from: LatLng, places: readonly T[]): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const p of places) {
    const d = distanceMeters(from, p);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

/** Lien d'itinéraire Google Maps vers une position, sans clé d'API. */
export function directionsUrl(to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`;
}

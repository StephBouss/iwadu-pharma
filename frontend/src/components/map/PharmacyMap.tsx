'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { LatLng } from '@/lib/geo';

// Carte des pharmacies (Leaflet). Chargée uniquement quand le visiteur
// l'ouvre (import dynamique), pour garder les pages légères. Le fournisseur
// de tuiles se règle par variable d'environnement.

export interface MapPharmacy {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  onDuty: boolean;
  openingLabel: string;
}

const TILES_URL =
  process.env.NEXT_PUBLIC_MAP_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

export default function PharmacyMap({
  pharmacies,
  position,
}: {
  pharmacies: readonly MapPharmacy[];
  position: LatLng | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | null = null;
    void import('leaflet').then((L) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer(TILES_URL, { attribution: TILES_ATTRIBUTION, maxZoom: 19 }).addTo(map);

      const bounds = L.latLngBounds([]);
      for (const p of pharmacies) {
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 9,
          weight: 3,
          color: p.onDuty ? '#6fdcc0' : '#ffffff',
          fillColor: p.onDuty ? '#021916' : '#0c7a68',
          fillOpacity: 1,
        }).addTo(map);
        marker.bindPopup(
          `<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.openingLabel)}<br><a href="/pharmacie/${encodeURIComponent(p.slug)}">Voir la pharmacie</a>`,
        );
        bounds.extend([p.lat, p.lng]);
      }
      if (position) {
        L.circleMarker([position.lat, position.lng], {
          radius: 7,
          weight: 3,
          color: '#ffffff',
          fillColor: '#2563eb',
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup('Vous êtes ici');
        bounds.extend([position.lat, position.lng]);
      }
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
      else map.setView([0.39, 9.45], 12);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pharmacies, position]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Carte des pharmacies"
      className="h-80 w-full overflow-hidden rounded-card border border-surface/60 shadow-glass lg:h-[32rem]"
    />
  );
}

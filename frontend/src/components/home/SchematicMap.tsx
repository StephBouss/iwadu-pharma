import { Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Plan schématique (sans tuiles de carte, quelques octets) : les pharmacies
// placées d'après leurs coordonnées réelles, sur une grille. Sert sur
// l'accueil, qui doit rester léger ; la vraie carte est sur /gardes.

export interface MapPin {
  label: string;
  lat: number;
  lng: number;
}

export function SchematicMap({
  pins,
  title,
  className,
}: {
  pins: MapPin[];
  title: string;
  className?: string | undefined;
}) {
  const lats = pins.map((p) => p.lat);
  const lngs = pins.map((p) => p.lng);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const spanLat = maxLat - minLat || 0.01;
  const spanLng = maxLng - minLng || 0.01;
  return (
    <div
      role="img"
      aria-label={`${title} : plan schématique avec ${pins.length} pharmacies.`}
      className={cn(
        'relative min-h-72 overflow-hidden rounded-card border border-mint/20 bg-deep/40',
        className,
      )}
    >
      <svg aria-hidden className="absolute inset-0 size-full opacity-15">
        <defs>
          <pattern id="grille" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#6fdcc0" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grille)" />
      </svg>
      <p className="type-label absolute top-4 left-4 flex items-center gap-2 text-mint">
        <Moon aria-hidden className="size-4" />
        {title}
      </p>
      {pins.map((pin) => {
        const top = 18 + ((maxLat - pin.lat) / spanLat) * 64;
        const left = 12 + ((pin.lng - minLng) / spanLng) * 70;
        return (
          <span
            key={pin.label}
            aria-hidden
            className="absolute flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <span className="type-caption rounded-field border border-mint/40 bg-ink px-2 py-1 whitespace-nowrap text-mint">
              {pin.label}
            </span>
            <span className="size-3 rounded-full bg-mint" />
          </span>
        );
      })}
    </div>
  );
}

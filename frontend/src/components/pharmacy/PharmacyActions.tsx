'use client';

import { Navigation, Phone } from 'lucide-react';
import { buttonStyles } from '@/components/ui/Button';
import { publicApi } from '@/lib/client/session';
import { directionsUrl } from '@/lib/geo';
import { cn } from '@/lib/utils';

// « Itinéraire » (Google Maps, sans clé d'API) et « Appeler ». Chaque geste
// est mesuré (itinéraires lancés, appels) sans bloquer la navigation.

function measure(name: 'directions_clicked' | 'call_clicked', pharmacySlug: string): void {
  void publicApi('/api/events', { method: 'POST', body: { name, pharmacySlug } }).catch(
    () => undefined,
  );
}

export function DirectionsLink({
  slug,
  lat,
  lng,
  variant = 'secondary',
  className,
}: {
  slug: string;
  lat: number;
  lng: number;
  variant?: 'primary' | 'secondary';
  className?: string | undefined;
}) {
  return (
    <a
      href={directionsUrl({ lat, lng })}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => measure('directions_clicked', slug)}
      className={cn(buttonStyles({ variant, size: 'sm', fullWidth: true }), className)}
    >
      <Navigation aria-hidden />
      Itinéraire
      <span className="sr-only"> (ouvre Google Maps)</span>
    </a>
  );
}

export function CallLink({
  slug,
  phone,
  variant = 'secondary',
  className,
}: {
  slug: string;
  phone: string | null;
  variant?: 'primary' | 'secondary';
  className?: string | undefined;
}) {
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone.replace(/\s/g, '')}`}
      onClick={() => measure('call_clicked', slug)}
      className={cn(buttonStyles({ variant, size: 'sm', fullWidth: true }), className)}
    >
      <Phone aria-hidden />
      Appeler
    </a>
  );
}

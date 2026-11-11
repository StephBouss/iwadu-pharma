'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { List, Map as MapIcon, RefreshCw } from 'lucide-react';
import { LocationPicker } from '@/components/location/LocationPicker';
import { useLocation } from '@/components/location/LocationProvider';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MapPharmacy } from '@/components/map/PharmacyMap';
import { CallLink, DirectionsLink } from './PharmacyActions';
import { PharmacyCard } from './PharmacyCard';

// Liste des pharmacies (de garde, ou autour de soi), triée par distance,
// avec une carte chargée seulement quand on l'ouvre.

const PharmacyMap = dynamic(() => import('@/components/map/PharmacyMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-card lg:h-[32rem]" />,
});

interface Item extends MapPharmacy {
  districtName: string | null;
  phone: string | null;
  distanceMeters: number | null;
  open: boolean;
  isDemo: boolean;
}

export function PharmacyFinder({ mode }: { mode: 'duty' | 'nearby' }) {
  const { position, status } = useLocation();
  const [items, setItems] = useState<Item[] | null>(null);
  const [upcoming, setUpcoming] = useState(false);
  const [error, setError] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (position) {
      qs.set('lat', String(position.lat));
      qs.set('lng', String(position.lng));
    }
    if (mode === 'duty') qs.set('onDuty', '1');
    setError(false);
    setItems(null);
    api<{ pharmacies: Item[]; upcoming?: boolean }>(`/api/pharmacies?${qs.toString()}`)
      .then((r) => {
        if (cancelled) return;
        setUpcoming(Boolean(r.upcoming));
        setItems(r.pharmacies);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [position, mode, reload]);

  const demo = items?.some((p) => p.isDemo) ?? false;

  return (
    <div className="flex flex-col gap-4">
      <LocationPicker />

      <div className="flex items-center justify-between gap-3">
        <p className="type-body-small text-ink-muted" aria-live="polite">
          {items === null
            ? 'Chargement…'
            : items.length === 0
              ? ''
              : `${items.length} ${items.length > 1 ? 'pharmacies' : 'pharmacie'}${
                  position ? ', de la plus proche à la plus éloignée' : ''
                }`}
        </p>
        {items && items.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setShowMap((v) => !v)}
            leadingIcon={showMap ? <List aria-hidden /> : <MapIcon aria-hidden />}
            aria-expanded={showMap}
          >
            {showMap ? 'Masquer la carte' : 'Voir la carte'}
          </Button>
        )}
      </div>

      {upcoming && items && items.length > 0 && (
        <Message tone="info" title="Aucune pharmacie n’est de garde en ce moment.">
          Voici celles qui prennent la garde dans les prochaines heures. Les pharmacies ouvertes
          sont dans « Autour de moi ».
        </Message>
      )}

      {demo && (
        <p className="type-caption text-ink-muted">Exemple fictif : données de démonstration.</p>
      )}

      {error && (
        <Message tone="error" title="La liste n’a pas pu être chargée.">
          <span className="flex flex-col items-start gap-2">
            Vérifiez votre connexion, puis réessayez.
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<RefreshCw aria-hidden />}
              onClick={() => setReload((n) => n + 1)}
            >
              Réessayer
            </Button>
          </span>
        </Message>
      )}

      <div
        className={cn(
          'flex flex-col gap-4',
          showMap && 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start',
        )}
      >
        {showMap && items && (
          <div className="lg:sticky lg:top-6 lg:order-2">
            <PharmacyMap pharmacies={items} position={position} />
          </div>
        )}

        <div
          className={cn('flex flex-col gap-3', !showMap && 'md:grid md:grid-cols-2 lg:grid-cols-3')}
        >
          {items === null &&
            !error &&
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full rounded-card" />)}

          {items?.length === 0 && (
            <GlassPanel className="p-5 md:col-span-2 lg:col-span-3">
              <p className="type-body text-ink">
                {mode === 'duty'
                  ? 'Aucune pharmacie de garde n’est enregistrée pour ce moment.'
                  : status === 'ready'
                    ? 'Aucune pharmacie active dans ce rayon.'
                    : 'Aucune pharmacie à afficher.'}
              </p>
              {mode === 'duty' && (
                <p className="type-body-small mt-1 text-ink-muted">
                  Les pharmacies ouvertes restent visibles dans « Autour de moi ».
                </p>
              )}
            </GlassPanel>
          )}

          {items?.map((p) => (
            <PharmacyCard
              key={p.slug}
              name={p.name}
              titleHref={`/pharmacie/${p.slug}`}
              distanceMeters={p.distanceMeters ?? undefined}
              openingLabel={p.openingLabel}
              onDuty={p.onDuty}
              actions={
                <>
                  <DirectionsLink
                    slug={p.slug}
                    lat={p.lat}
                    lng={p.lng}
                    className={p.phone ? '' : 'col-span-2'}
                  />
                  <CallLink slug={p.slug} phone={p.phone} />
                </>
              }
            >
              {p.districtName && (
                <p className="type-caption -mt-1 text-ink-muted">{p.districtName}</p>
              )}
            </PharmacyCard>
          ))}
        </div>
      </div>
    </div>
  );
}

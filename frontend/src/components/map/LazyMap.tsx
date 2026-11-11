'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MapPharmacy } from './PharmacyMap';

// Carte Leaflet chargée à part (import dynamique, sans rendu serveur) : la
// page s'affiche d'abord, la carte ensuite.

const PharmacyMap = dynamic(() => import('./PharmacyMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-72 w-full rounded-card" />,
});

export function LazyMap({ pharmacies }: { pharmacies: MapPharmacy[] }) {
  return <PharmacyMap pharmacies={pharmacies} position={null} />;
}

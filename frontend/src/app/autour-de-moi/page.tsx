import type { Metadata } from 'next';
import { PageTitle } from '@/components/layout/PageTitle';
import { PublicShell } from '@/components/layout/PublicShell';
import { LocationProvider } from '@/components/location/LocationProvider';
import { PharmacyFinder } from '@/components/pharmacy/PharmacyFinder';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pharmacies autour de moi',
  description:
    'Les pharmacies autour de votre position actuelle, ouvertes ou fermées, avec leurs horaires. Gratuit, sans compte.',
};

export default function NearbyPage() {
  return (
    <PublicShell width="wide">
      <LocationProvider>
        <PageTitle
          title="Pharmacies autour de moi"
          lead="Ouvertes ou fermées, avec leurs horaires et l’itinéraire."
        />
        <PharmacyFinder mode="nearby" />
      </LocationProvider>
    </PublicShell>
  );
}

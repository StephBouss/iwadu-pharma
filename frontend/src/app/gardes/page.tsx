import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Moon } from 'lucide-react';
import { DemoNotice, PublicShell } from '@/components/layout/PublicShell';
import { LocationProvider } from '@/components/location/LocationProvider';
import { PharmacyFinder } from '@/components/pharmacy/PharmacyFinder';
import { prisma } from '@/lib/server/prisma';

// Pharmacies de garde (maquette Banani « Pharmacies de garde ») : bandeau,
// puis la recherche par position ou quartier, la liste et la carte.
// Toujours gratuit, avec les noms. Les données de démonstration le disent.

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pharmacies de garde',
  description:
    'Les pharmacies de garde en ce moment près de chez vous, de la plus proche à la plus éloignée. Gratuit, sans compte.',
};

export default async function OnDutyPage() {
  const demo = (await prisma.pharmacy.count({ where: { status: 'ACTIVE', isDemo: true } })) > 0;
  return (
    <PublicShell
      width="wide"
      hero={
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="type-label flex min-h-11 items-center gap-2 self-start text-mint hover:text-surface"
          >
            <ArrowLeft aria-hidden className="size-4.5" />
            Retour
          </Link>
          <h1 className="flex items-center gap-3 font-display text-4xl leading-tight font-bold md:text-[3.5rem]">
            <Moon aria-hidden className="size-8 shrink-0 text-mint md:size-10" />
            Pharmacies de garde
          </h1>
          <p className="type-body max-w-3xl text-surface/85 md:text-lg">
            Les pharmacies ouvertes ce soir et cette nuit autour de vous. Horaires, téléphone et
            itinéraire. Gratuit, sans compte. La nuit, appelez avant de vous déplacer.
          </p>
          <DemoNotice show={demo} tone="dark" />
        </div>
      }
      className="pt-8 md:pt-12"
    >
      <LocationProvider>
        <PharmacyFinder mode="duty" />
      </LocationProvider>
    </PublicShell>
  );
}

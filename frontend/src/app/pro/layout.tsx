import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { PHARMACY_SPACE_ENABLED } from '@/lib/features';
import type { Metadata } from 'next';
import { AccountNav } from '@/components/account/AccountNav';
import { PublicShell } from '@/components/layout/PublicShell';
import { Message } from '@/components/ui/Message';
import { formatDayMonth } from '@/lib/format';
import { requirePagePharmacist } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Espace pharmacie', template: '%s · Espace pharmacie · Iwadu Pharma' },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: '/pro', label: 'Réservations' },
  { href: '/pro/fiche', label: 'Ma fiche' },
  { href: '/pro/stock', label: 'Stock' },
  { href: '/pro/abonnement', label: 'Abonnement' },
  { href: '/compte', label: 'Mon compte' },
];

export default async function ProLayout({ children }: { children: ReactNode }) {
  // Espace pharmacie opérationnel : V2. Dans le MVP, l'aperçu « côté pharmacie »
  // est dans la vue de démonstration du back-office.
  if (!PHARMACY_SPACE_ENABLED) redirect('/compte');
  const user = await requirePagePharmacist('/pro');
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: user.pharmacyId },
    select: { name: true, status: true, subscriptionEndsAt: true },
  });
  const now = new Date();
  const expired = pharmacy?.subscriptionEndsAt ? pharmacy.subscriptionEndsAt < now : false;
  return (
    <PublicShell width="wide">
      <div className="flex flex-col gap-1">
        <p className="type-overline text-action">Espace pharmacie</p>
        <p className="type-title-2 text-ink">{pharmacy?.name}</p>
      </div>
      {pharmacy?.status === 'PENDING' && (
        <Message tone="info" title="Votre pharmacie est en cours de validation.">
          Elle apparaîtra dans les résultats dès son activation par l’équipe Iwadu Pharma.
        </Message>
      )}
      {pharmacy?.status === 'SUSPENDED' && (
        <Message
          tone="warning"
          title="Votre pharmacie est suspendue : elle n’apparaît plus dans les résultats."
        >
          Contactez l’équipe Iwadu Pharma.
        </Message>
      )}
      {expired && pharmacy?.subscriptionEndsAt && (
        <Message
          tone="warning"
          title={`Votre abonnement a pris fin le ${formatDayMonth(pharmacy.subscriptionEndsAt).toLowerCase()}.`}
        >
          Renouvelez-le depuis « Abonnement ».
        </Message>
      )}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="lg:sticky lg:top-6">
          <AccountNav items={NAV} label="Espace pharmacie" />
        </div>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </PublicShell>
  );
}

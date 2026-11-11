import type { Metadata } from 'next';
import { PageTitle } from '@/components/layout/PageTitle';
import { ReservationsBoard } from '@/components/pro/ReservationsBoard';
import { proReservations } from '@/lib/server/iwadu/pro';
import { requirePagePharmacist } from '@/lib/server/iwadu/viewer';

export const metadata: Metadata = { title: 'Réservations' };

export default async function ProReservationsPage() {
  const user = await requirePagePharmacist('/pro');
  const rows = await proReservations(user.pharmacyId);
  return (
    <>
      <PageTitle
        title="Réservations"
        lead="Acceptez vite : le patient attend votre réponse. Il paie au retrait."
      />
      <ReservationsBoard initial={rows} />
    </>
  );
}

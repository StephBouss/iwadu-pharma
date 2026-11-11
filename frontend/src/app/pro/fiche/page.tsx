import type { Metadata } from 'next';
import Link from 'next/link';
import { PageTitle } from '@/components/layout/PageTitle';
import { PharmacyProfileForm } from '@/components/pro/PharmacyProfileForm';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { formatDateTime } from '@/lib/format';
import type { WeeklyHours } from '@/lib/opening-hours';
import { requirePagePharmacist } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Ma fiche' };

export default async function ProProfilePage() {
  const user = await requirePagePharmacist('/pro/fiche');
  const now = new Date();
  const [pharmacy, insurances] = await Promise.all([
    prisma.pharmacy.findUniqueOrThrow({
      where: { id: user.pharmacyId },
      include: {
        insurances: { select: { insuranceId: true } },
        dutyShifts: { where: { endsAt: { gt: now } }, orderBy: { startsAt: 'asc' }, take: 6 },
      },
    }),
    prisma.insurance.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageTitle
        title="Ma fiche"
        lead="Ce que voient les patients : horaires, contact, assurances, prix."
      />
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <GlassPanel className="p-5">
          <PharmacyProfileForm
            initial={{
              phone: pharmacy.phone,
              address: pharmacy.address,
              openingHours: pharmacy.openingHours as WeeklyHours,
              showPrices: pharmacy.showPrices,
              insuranceIds: pharmacy.insurances.map((i) => i.insuranceId),
            }}
            insurances={insurances}
          />
        </GlassPanel>
        <div className="flex flex-col gap-4">
          <GlassPanel as="section" aria-labelledby="gardes-pro" className="flex flex-col gap-2 p-5">
            <h2 id="gardes-pro" className="type-title-3 text-ink">
              Prochaines gardes
            </h2>
            {pharmacy.dutyShifts.length === 0 ? (
              <p className="type-body-small text-ink-muted">Aucune garde prévue.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {pharmacy.dutyShifts.map((d) => (
                  <li key={d.id} className="type-body-small text-ink">
                    {formatDateTime(d.startsAt)} → {formatDateTime(d.endsAt)}
                  </li>
                ))}
              </ul>
            )}
            <p className="type-caption text-ink-muted">
              Le tableau des gardes est tenu par l’équipe Iwadu Pharma.
            </p>
          </GlassPanel>
          {pharmacy.status === 'ACTIVE' && (
            <Link
              href={`/pharmacie/${pharmacy.slug}`}
              className="type-label text-action hover:underline"
            >
              Voir ma fiche publique
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminForm } from '@/components/admin/AdminForm';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RESERVATIONS_ENABLED } from '@/lib/features';
import { formatDateTime, formatDayMonth } from '@/lib/format';
import { PLAN_LABELS } from '@/lib/labels';
import { formatGabonPhone } from '@/lib/phone';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Patients' };

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePageAdmin('/admin/patients');
  const { q } = await searchParams;
  const now = new Date();
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q.replace(/\s+/g, '') } },
          ],
        }
      : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      emailVerifiedAt: true,
      coverageRate: true,
      pharmacyMember: { select: { pharmacy: { select: { name: true } } } },
      passes: {
        where: { startsAt: { lte: now }, endsAt: { gt: now } },
        select: { plan: true, endsAt: true },
        take: 1,
      },
      _count: { select: { reservations: true, familyMembers: true } },
    },
  });

  return (
    <>
      <AdminHeader title="Patients" />
      <KpiPanel
        title="Accorder un crédit"
        subtitle="Une recherche offerte, au titre des garanties (inscrit au journal)"
      >
        <AdminForm
          action="credit.grant"
          submitLabel="Accorder"
          successMessage="Crédit accordé"
          resetOnSuccess
          variant="secondary"
          fields={[
            { name: 'email', label: 'E-mail du compte', type: 'email', required: true },
            { name: 'note', label: 'Motif', type: 'text', nullable: true },
          ]}
        />
      </KpiPanel>
      <KpiPanel title={q ? `Résultats pour « ${q} »` : 'Derniers comptes'} subtitle="100 au plus">
        <form action="/admin/patients" className="flex gap-2">
          <label htmlFor="q-patient" className="sr-only">
            Rechercher un compte
          </label>
          <input
            id="q-patient"
            name="q"
            defaultValue={q ?? ''}
            placeholder="E-mail, nom ou téléphone"
            className="type-body-small h-11 w-full max-w-sm rounded-full border border-hairline bg-surface px-4 text-ink"
          />
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left">
            <thead>
              <tr className="type-caption text-ink-muted">
                <th scope="col" className="pb-2 font-medium">
                  Compte
                </th>
                <th scope="col" className="pb-2 pl-4 font-medium">
                  Créé le
                </th>
                <th scope="col" className="pb-2 pl-4 font-medium">
                  Pass
                </th>
                <th scope="col" className="pb-2 pl-4 font-medium">
                  Assurance
                </th>
                {RESERVATIONS_ENABLED && (
                  <th scope="col" className="pb-2 pl-4 text-right font-medium">
                    Réservations
                  </th>
                )}
                <th scope="col" className="pb-2 pl-4 text-right font-medium">
                  Proches
                </th>
                <th scope="col" className="pb-2 pl-6 font-medium">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="type-body-small divide-y divide-hairline text-ink">
              {users.map((u) => {
                const pass = u.passes[0];
                return (
                  <tr key={u.id}>
                    <th scope="row" className="py-2 font-normal">
                      <span className="block font-semibold">{u.name ?? u.email}</span>
                      <span className="block text-ink-muted">
                        {u.name ? u.email : ''}
                        {u.phone ? ` ${formatGabonPhone(u.phone)}` : ''}
                        {u.pharmacyMember ? ` · ${u.pharmacyMember.pharmacy.name}` : ''}
                        {u.role !== 'USER'
                          ? ` · ${u.role === 'SUPERADMIN' ? 'Super-admin' : 'Admin'}`
                          : ''}
                      </span>
                    </th>
                    <td className="py-2 pl-4">{formatDateTime(u.createdAt)}</td>
                    <td className="py-2 pl-4">
                      {pass
                        ? `${PLAN_LABELS[pass.plan] ?? 'Pass'} → ${formatDayMonth(pass.endsAt).toLowerCase()}`
                        : '·'}
                    </td>
                    <td className="py-2 pl-4">{u.coverageRate ? `${u.coverageRate} %` : '·'}</td>
                    {RESERVATIONS_ENABLED && (
                      <td className="py-2 pl-4 text-right tabular-nums">{u._count.reservations}</td>
                    )}
                    <td className="py-2 pl-4 text-right tabular-nums">{u._count.familyMembers}</td>
                    <td className="py-2 pl-6">
                      {u.status !== 'ACTIVE' ? (
                        <StatusBadge status="unavailable">Suspendu</StatusBadge>
                      ) : !u.emailVerifiedAt ? (
                        <StatusBadge status="verify">E-mail non confirmé</StatusBadge>
                      ) : (
                        <StatusBadge status="available">Actif</StatusBadge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="type-caption text-ink-muted">
          Les paiements d’un compte se retrouvent dans{' '}
          <Link href="/admin/paiements" className="font-semibold text-action hover:underline">
            Paiements
          </Link>
          , en cherchant son e-mail.
        </p>
      </KpiPanel>
    </>
  );
}

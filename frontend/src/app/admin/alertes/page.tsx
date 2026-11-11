import type { Metadata } from 'next';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { Message } from '@/components/ui/Message';
import { formatDateTime } from '@/lib/format';
import { SETTINGS } from '@/lib/settings-registry';
import { fairUseOverages } from '@/lib/server/iwadu/admin-kpis';
import { getSettings, missingRequired } from '@/lib/server/iwadu/settings';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Alertes' };

export default async function AdminAlertsPage() {
  await requirePageAdmin('/admin/alertes');
  const now = new Date();
  const settings = await getSettings();
  const syncAlertMs = (settings['pharmacy.syncAlertMinutes'] ?? 60) * 60_000;
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [syncRows, pending, applications, staleSent, failedPayments, aiFailures, expiring] =
    await Promise.all([
      prisma.pharmacy.findMany({
        where: { status: 'ACTIVE', softwareId: { not: null } },
        select: { id: true, name: true, lastSyncAt: true },
      }),
      prisma.pharmacy.findMany({
        where: { status: 'PENDING' },
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.pharmacyApplication.count({ where: { status: 'NEW' } }),
      prisma.reservation.findMany({
        where: { status: 'SENT', createdAt: { lt: new Date(now.getTime() - 15 * 60_000) } },
        include: { pharmacy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.count({
        where: { status: 'FAILED', purpose: { not: null }, createdAt: { gte: dayAgo } },
      }),
      prisma.prescriptionRead.count({ where: { failed: true, createdAt: { gte: dayAgo } } }),
      prisma.pharmacy.findMany({
        where: {
          status: 'ACTIVE',
          isDemo: false,
          subscriptionEndsAt: { lt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, name: true, subscriptionEndsAt: true },
      }),
    ]);
  const syncLate = syncRows.filter(
    (p) => !p.lastSyncAt || now.getTime() - p.lastSyncAt.getTime() > syncAlertMs,
  );
  const missing = missingRequired(settings);
  const fairUse = await fairUseOverages(now);
  const total =
    fairUse.length +
    syncLate.length +
    pending.length +
    applications +
    staleSent.length +
    missing.length +
    (failedPayments > 0 ? 1 : 0) +
    (aiFailures > 0 ? 1 : 0) +
    expiring.length;

  return (
    <>
      <AdminHeader title="Alertes" />
      {total === 0 && (
        <div role="status" className="flex items-center gap-3 rounded-card bg-available-soft p-4">
          <CircleCheck aria-hidden className="size-5 text-available" />
          <p className="type-body text-ink">Aucune alerte en cours.</p>
        </div>
      )}
      {missing.length > 0 && (
        <Message
          tone="error"
          title={`${missing.length} paramètre${missing.length > 1 ? 's' : ''} obligatoire${missing.length > 1 ? 's' : ''} non renseigné${missing.length > 1 ? 's' : ''}.`}
        >
          {missing.map((k) => SETTINGS[k].label).join(', ')}.{' '}
          <Link href="/admin/parametres" className="font-semibold text-action hover:underline">
            Compléter les paramètres
          </Link>
        </Message>
      )}
      {fairUse.length > 0 && (
        <KpiPanel
          title={`Comptes au-delà de l’usage raisonnable (${fairUse.length})`}
          subtitle={`Moyenne de plus de ${settings['fairUse.monthlyAverage']} recherches par mois sur ${settings['fairUse.averageMonths']} mois · alerte, sans coupure`}
        >
          <ul className="type-body-small flex flex-col gap-1 text-ink">
            {fairUse.map((r) => (
              <li key={r.userId}>
                <Link
                  href={`/admin/patients?q=${encodeURIComponent(r.email)}`}
                  className="font-semibold text-action hover:underline"
                >
                  {r.email}
                </Link>{' '}
                · {r.searches} recherches · {r.average} par mois
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}
      {staleSent.length > 0 && (
        <KpiPanel
          title={`Réservations sans réponse depuis plus de 15 min (${staleSent.length})`}
          subtitle="Appelez la pharmacie"
        >
          <ul className="type-body-small flex flex-col gap-1 text-ink">
            {staleSent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/pharmacies/${r.pharmacy.id}`}
                  className="font-semibold text-action hover:underline"
                >
                  {r.pharmacy.name}
                </Link>{' '}
                · {r.code} · reçue {formatDateTime(r.createdAt)}
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}
      {syncLate.length > 0 && (
        <KpiPanel
          title={`Synchronisations en retard (${syncLate.length})`}
          subtitle={`Au-delà de ${settings['pharmacy.syncAlertMinutes'] ?? 60} min`}
        >
          <ul className="type-body-small flex flex-col gap-1 text-ink">
            {syncLate.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/pharmacies/${p.id}`}
                  className="font-semibold text-action hover:underline"
                >
                  {p.name}
                </Link>{' '}
                ·{' '}
                {p.lastSyncAt
                  ? `dernière le ${formatDateTime(p.lastSyncAt)}`
                  : 'jamais synchronisée'}
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}
      {(pending.length > 0 || applications > 0) && (
        <KpiPanel
          title="Pharmacies à valider"
          href="/admin/pharmacies?statut=PENDING"
          linkLabel="Ouvrir"
        >
          <p className="type-body-small text-ink">
            {pending.length} fiche{pending.length > 1 ? 's' : ''} à valider · {applications} demande
            {applications > 1 ? 's' : ''} d’inscription reçue{applications > 1 ? 's' : ''}.
          </p>
        </KpiPanel>
      )}
      {expiring.length > 0 && (
        <KpiPanel
          title={`Abonnements qui finissent dans 7 jours ou déjà finis (${expiring.length})`}
        >
          <ul className="type-body-small flex flex-col gap-1 text-ink">
            {expiring.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/pharmacies/${p.id}`}
                  className="font-semibold text-action hover:underline"
                >
                  {p.name}
                </Link>{' '}
                · {p.subscriptionEndsAt ? formatDateTime(p.subscriptionEndsAt) : ''}
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}
      {failedPayments > 0 && (
        <KpiPanel
          title="Paiements échoués, 24 h"
          href="/admin/paiements?statut=FAILED"
          linkLabel="Voir"
        >
          <p className="type-body-small text-ink">
            {failedPayments} paiement{failedPayments > 1 ? 's' : ''} échoué
            {failedPayments > 1 ? 's' : ''}.
          </p>
        </KpiPanel>
      )}
      {aiFailures > 0 && (
        <KpiPanel
          title="Lectures d’ordonnance échouées, 24 h"
          href="/admin/ordonnances"
          linkLabel="Voir"
        >
          <p className="type-body-small text-ink">
            {aiFailures} lecture{aiFailures > 1 ? 's' : ''} sans résultat.
          </p>
        </KpiPanel>
      )}
    </>
  );
}

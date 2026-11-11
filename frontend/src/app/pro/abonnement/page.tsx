import type { Metadata } from 'next';
import Link from 'next/link';
import { PageTitle } from '@/components/layout/PageTitle';
import { SubscriptionPanel } from '@/components/pro/SubscriptionPanel';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, formatDayMonth, formatFcfa } from '@/lib/format';
import { ORDER_STATUS_LABELS, orderTone } from '@/lib/labels';
import { subscriptionOrders } from '@/lib/server/iwadu/pro';
import { getSettings } from '@/lib/server/iwadu/settings';
import { requirePagePharmacist } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Abonnement' };

export default async function ProSubscriptionPage() {
  const user = await requirePagePharmacist('/pro/abonnement');
  const [pharmacy, settings, orders] = await Promise.all([
    prisma.pharmacy.findUniqueOrThrow({
      where: { id: user.pharmacyId },
      select: { subscriptionEndsAt: true, plan: true, launchPricing: true },
    }),
    getSettings(),
    subscriptionOrders(user.id, user.pharmacyId),
  ]);
  const monthly = pharmacy.launchPricing
    ? (settings['pharmacy.subscriptionLaunch'] ?? settings['pharmacy.subscriptionMonthly'])
    : settings['pharmacy.subscriptionMonthly'];
  const annual = settings['pharmacy.subscriptionAnnual'];
  const active = pharmacy.subscriptionEndsAt && pharmacy.subscriptionEndsAt > new Date();

  return (
    <>
      <PageTitle
        title="Abonnement"
        lead="Payé par Mobile Money. Un nouveau paiement prolonge la période en cours."
      />
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
        <GlassPanel as="section" aria-labelledby="etat" className="flex flex-col gap-3 p-5">
          <h2 id="etat" className="type-title-3 text-ink">
            Mon abonnement
          </h2>
          {pharmacy.subscriptionEndsAt ? (
            <p className="type-body text-ink">
              {active ? 'Actif' : 'Terminé'} · jusqu’au{' '}
              {formatDayMonth(pharmacy.subscriptionEndsAt).toLowerCase()}
              {pharmacy.plan === 'ANNUAL' ? ' (annuel)' : ''}
            </p>
          ) : (
            <p className="type-body text-ink">Pas encore d’abonnement payé.</p>
          )}
          {pharmacy.launchPricing && settings['pharmacy.subscriptionLaunch'] && (
            <p className="type-body-small text-ink-muted">Vous bénéficiez du tarif de lancement.</p>
          )}
        </GlassPanel>
        <GlassPanel as="section" aria-labelledby="payer" className="flex flex-col gap-4 p-5">
          <h2 id="payer" className="type-title-3 text-ink">
            {active ? 'Prolonger' : 'Payer mon abonnement'}
          </h2>
          {monthly || annual ? (
            <SubscriptionPanel monthly={monthly} annual={annual} defaultPhone={user.phone} />
          ) : (
            <Message
              tone="info"
              title="Le tarif n’est pas encore fixé. Contactez l’équipe Iwadu Pharma."
            />
          )}
        </GlassPanel>
      </div>
      <GlassPanel as="section" aria-labelledby="factures" className="flex flex-col gap-2 p-5">
        <h2 id="factures" className="type-title-3 text-ink">
          Reçus
        </h2>
        {orders.length === 0 ? (
          <p className="type-body-small text-ink-muted">Aucun paiement.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/compte/paiements/${o.id}`}
                  className="flex flex-wrap items-center gap-3 py-2 hover:text-action"
                >
                  <span className="type-body-small flex-1 text-ink">
                    {formatDateTime(o.paidAt ?? o.createdAt)}
                  </span>
                  <span className="type-body-strong text-ink tabular-nums">
                    {formatFcfa(o.amount)}
                  </span>
                  <StatusBadge status={orderTone(o.status)}>
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </>
  );
}

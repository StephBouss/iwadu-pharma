import type { Metadata } from 'next';
import { PassOffers } from '@/components/account/PassOffers';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { Message } from '@/components/ui/Message';
import { formatDayMonth } from '@/lib/format';
import { PLAN_LABELS } from '@/lib/labels';
import { activePass } from '@/lib/server/iwadu/entitlements';
import { passOffers } from '@/lib/server/iwadu/offers';
import { isSimulatorEnabled } from '@/lib/server/iwadu/payments/provider';
import { requirePageUser } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Pass' };

export default async function PassPage({
  searchParams,
}: {
  searchParams: Promise<{ offre?: string }>;
}) {
  const { offre } = await searchParams;
  const user = await requirePageUser(
    `/compte/pass${offre ? `?offre=${encodeURIComponent(offre)}` : ''}`,
  );
  const [pass, history, offers] = await Promise.all([
    activePass(user.id),
    prisma.pass.findMany({ where: { userId: user.id }, orderBy: { startsAt: 'desc' }, take: 10 }),
    passOffers(),
  ]);

  return (
    <>
      <PageHeading
        title="Le Pass"
        subtitle="Un paiement Mobile Money, sans abonnement : il s’arrête tout seul à la fin de la période. Géré par vous seul, pour qui vous voulez."
      />
      {pass && (
        <Message
          tone="info"
          title={`${PLAN_LABELS[pass.plan] ?? 'Pass'} actif jusqu’au ${formatDayMonth(pass.endsAt).toLowerCase()}.`}
        >
          Un nouveau Pass commencera à la fin de celui-ci.
        </Message>
      )}
      {offers.length > 0 ? (
        <PassOffers
          offers={offers}
          defaultPhone={user.phone}
          initial={offers.find((o) => o.purpose === offre)?.purpose ?? null}
          simulated={isSimulatorEnabled()}
        />
      ) : (
        <Message tone="info" title="Le Pass n’est pas encore proposé." />
      )}
      {history.length > 0 && (
        <KpiPanel title="Mes Pass">
          <ul className="flex flex-col divide-y divide-hairline">
            {history.map((p) => (
              <li key={p.id} className="type-body-small flex justify-between gap-3 py-2 text-ink">
                <span>{PLAN_LABELS[p.plan] ?? 'Pass'}</span>
                <span className="text-ink-muted">
                  du {formatDayMonth(p.startsAt).toLowerCase()} au{' '}
                  {formatDayMonth(p.endsAt).toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}
    </>
  );
}

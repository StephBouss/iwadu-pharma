import type { Metadata } from 'next';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { PageHeading, SectionTitle } from '@/components/dashboard/PageHeading';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, formatFcfa } from '@/lib/format';
import { ORDER_STATUS_LABELS, PURPOSE_LABELS, orderTone } from '@/lib/labels';
import { listOrders } from '@/lib/server/iwadu/account';
import { requirePageUser } from '@/lib/server/iwadu/viewer';

export const metadata: Metadata = { title: 'Reçus' };

export default async function PaymentsPage() {
  const user = await requirePageUser('/compte/paiements');
  const orders = await listOrders(user.id);
  return (
    <>
      <PageHeading
        title="Mes reçus"
        subtitle="Vos reçus Mobile Money. Les achats en pharmacie n’apparaissent pas ici."
      />
      <section aria-labelledby="recus" className="flex flex-col gap-4">
        <SectionTitle id="recus">
          {orders.length} paiement{orders.length > 1 ? 's' : ''}
        </SectionTitle>
        <GlassPanel className="overflow-hidden">
          {orders.length === 0 ? (
            <p className="type-body p-5 text-ink lg:p-6">Aucun paiement pour le moment.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/compte/paiements/${o.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 hover:bg-mint-soft/40 lg:px-6"
                  >
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action/10 text-action"
                    >
                      <Receipt className="size-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="type-body-strong text-ink">
                        {PURPOSE_LABELS[o.purpose ?? ''] ?? 'Paiement'}
                      </span>
                      <span className="type-caption text-ink-muted">
                        {formatDateTime(o.createdAt)}
                        {o.paymentMethod
                          ? ` · ${o.paymentMethod === 'MOOV' ? 'Moov Money' : 'Airtel Money'}`
                          : ''}
                      </span>
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
      </section>
    </>
  );
}

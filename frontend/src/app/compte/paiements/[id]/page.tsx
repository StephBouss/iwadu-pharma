import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/account/PrintButton';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, formatFcfa } from '@/lib/format';
import { ORDER_STATUS_LABELS, PURPOSE_LABELS, orderTone } from '@/lib/labels';
import { getOrder } from '@/lib/server/iwadu/account';
import { getSettings } from '@/lib/server/iwadu/settings';
import { requirePageUser } from '@/lib/server/iwadu/viewer';

export const metadata: Metadata = { title: 'Reçu' };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/compte/paiements/${id}`);
  const [order, settings] = await Promise.all([getOrder(user.id, id), getSettings()]);
  if (!order) notFound();
  const rows: [string, string][] = [
    ['Objet', PURPOSE_LABELS[order.purpose ?? ''] ?? 'Paiement'],
    ['Montant', formatFcfa(order.amount)],
    ['Date', formatDateTime(order.paidAt ?? order.createdAt)],
    [
      'Moyen',
      order.paymentMethod === 'MOOV'
        ? 'Moov Money'
        : order.paymentMethod === 'AIRTEL'
          ? 'Airtel Money'
          : 'Mobile Money',
    ],
    ['Référence', order.id],
  ];
  if (order.refundedAt) rows.push(['Remboursé le', formatDateTime(order.refundedAt)]);

  return (
    <>
      <PageHeading
        title="Reçu de paiement"
        subtitle="Gardez-le ou imprimez-le : il fait foi du paiement."
        actions={<PrintButton />}
      />
      <GlassPanel
        radius="sheet"
        className="flex max-w-xl flex-col gap-4 p-6 lg:p-8 print:shadow-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl leading-7 font-bold text-brand">Iwadu Pharma</p>
            {settings['legal.publisher'] && (
              <p className="type-caption text-ink-muted">{settings['legal.publisher']}</p>
            )}
          </div>
          <StatusBadge status={orderTone(order.status)}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </StatusBadge>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="type-body-small text-ink-muted">{k}</dt>
              <dd className="type-body-small break-all text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="type-caption text-ink-muted">
          Paiement d’un service numérique. Les médicaments se paient en pharmacie.
        </p>
      </GlassPanel>
    </>
  );
}

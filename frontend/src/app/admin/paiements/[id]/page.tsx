import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminForm } from '@/components/admin/AdminForm';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiList, KpiPanel } from '@/components/admin/KpiBlocks';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, formatFcfa } from '@/lib/format';
import { ORDER_STATUS_LABELS, PURPOSE_LABELS, orderTone } from '@/lib/labels';
import { formatGabonPhone } from '@/lib/phone';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Paiement' };

export default async function AdminPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageAdmin(`/admin/paiements/${id}`);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) notFound();
  const [logs, journal] = await Promise.all([
    order.providerChargeId
      ? prisma.webhookLog
          .findMany({
            where: { payload: { path: ['chargeId'], equals: order.providerChargeId } },
            orderBy: { createdAt: 'asc' },
            take: 20,
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.adminAction.findMany({
      where: { targetType: 'Order', targetId: order.id },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { email: true } } },
    }),
  ]);

  return (
    <>
      <AdminHeader title="Paiement" />
      <p className="type-body-small">
        <Link href="/admin/paiements" className="font-semibold text-action hover:underline">
          ← Tous les paiements
        </Link>
      </p>
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <KpiPanel
          title={`${PURPOSE_LABELS[order.purpose ?? ''] ?? 'Paiement'} · ${formatFcfa(order.amount)}`}
        >
          <StatusBadge status={orderTone(order.status)}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </StatusBadge>
          <KpiList
            rows={[
              { label: 'Référence', value: order.id },
              {
                label: 'Prestataire',
                value:
                  order.provider === 'simulator' ? 'Simulateur (développement)' : order.provider,
              },
              { label: 'Identifiant du prestataire', value: order.providerChargeId ?? '·' },
              {
                label: 'Opérateur',
                value:
                  order.paymentMethod === 'MOOV'
                    ? 'Moov Money'
                    : order.paymentMethod === 'AIRTEL'
                      ? 'Airtel Money'
                      : '·',
              },
              {
                label: 'Téléphone',
                value: order.customerPhone ? formatGabonPhone(order.customerPhone) : '·',
              },
              { label: 'E-mail', value: order.customerEmail ?? '·' },
              {
                label: 'Frais du prestataire',
                value: order.feeAmount !== null ? formatFcfa(order.feeAmount) : '·',
              },
              { label: 'Créé le', value: formatDateTime(order.createdAt) },
              { label: 'Confirmé le', value: order.paidAt ? formatDateTime(order.paidAt) : '·' },
              {
                label: 'Remboursé le',
                value: order.refundedAt ? formatDateTime(order.refundedAt) : '·',
              },
              ...(order.refundReason
                ? [{ label: 'Motif du remboursement', value: order.refundReason }]
                : []),
            ]}
          />
        </KpiPanel>
        <div className="flex flex-col gap-4">
          {order.status === 'PAID' && (
            <KpiPanel
              title="Rembourser à la main"
              subtitle="Après avoir renvoyé l’argent au client. Le déblocage ou le Pass est retiré ; l’action est tracée."
            >
              <AdminForm
                action="order.refund"
                hidden={{ id: order.id }}
                columns={1}
                submitLabel="Marquer comme remboursé"
                successMessage="Paiement marqué remboursé."
                variant="secondary"
                fields={[
                  {
                    name: 'reason',
                    label: 'Motif',
                    type: 'text',
                    required: true,
                    placeholder: 'Ex. débité sans déblocage',
                  },
                ]}
              />
            </KpiPanel>
          )}
          <KpiPanel title="Webhooks reçus">
            {logs.length === 0 ? (
              <p className="type-body-small text-ink-muted">
                Aucun webhook enregistré pour ce paiement.
              </p>
            ) : (
              <ul className="type-body-small flex flex-col gap-1 text-ink">
                {logs.map((l) => (
                  <li key={l.id}>
                    {formatDateTime(l.createdAt)} · {l.eventType}
                    {l.processedAt ? ' · traité' : ' · non traité'}
                  </li>
                ))}
              </ul>
            )}
          </KpiPanel>
          <KpiPanel title="Journal">
            {journal.length === 0 ? (
              <p className="type-body-small text-ink-muted">Aucune action d’administration.</p>
            ) : (
              <ul className="type-body-small flex flex-col gap-1 text-ink">
                {journal.map((j) => (
                  <li key={j.id}>
                    {formatDateTime(j.createdAt)} · {j.action} · {j.actor.email}
                  </li>
                ))}
              </ul>
            )}
          </KpiPanel>
        </div>
      </div>
    </>
  );
}

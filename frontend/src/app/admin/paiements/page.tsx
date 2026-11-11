import type { Metadata } from 'next';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, formatFcfa } from '@/lib/format';
import { ORDER_STATUS_LABELS, PURPOSE_LABELS, orderTone } from '@/lib/labels';
import { normalizeGabonPhone } from '@/lib/phone';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Paiements' };

const STATUSES = ['PAID', 'PENDING', 'FAILED', 'EXPIRED', 'REFUNDED'] as const;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; objet?: string }>;
}) {
  await requirePageAdmin('/admin/paiements');
  const { q, statut, objet } = await searchParams;
  const where: Prisma.OrderWhereInput = {
    purpose: objet && objet in PURPOSE_LABELS ? objet : { not: null },
  };
  if (statut && (STATUSES as readonly string[]).includes(statut)) where.status = statut;
  if (q) {
    const phone = normalizeGabonPhone(q);
    where.OR = [
      { id: q.trim() },
      { providerChargeId: q.trim() },
      { customerEmail: { contains: q.trim(), mode: 'insensitive' } },
      ...(phone ? [{ customerPhone: phone }] : []),
    ];
  }
  const orders = await prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'type-label flex h-10 items-center rounded-full border px-4',
        active
          ? 'border-action bg-action text-surface'
          : 'border-hairline bg-surface/80 text-ink hover:border-action',
      )}
    >
      {label}
    </Link>
  );
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, statut, objet, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/paiements${s ? `?${s}` : ''}`;
  };

  return (
    <>
      <AdminHeader title="Paiements" />
      <KpiPanel
        title="Rechercher un paiement"
        subtitle="Référence, e-mail, téléphone ou identifiant du prestataire"
      >
        <form action="/admin/paiements" className="flex flex-wrap gap-2">
          {statut && <input type="hidden" name="statut" value={statut} />}
          {objet && <input type="hidden" name="objet" value={objet} />}
          <label htmlFor="q-pay" className="sr-only">
            Rechercher
          </label>
          <input
            id="q-pay"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Ex. 074 82 60 61"
            className="type-body-small h-11 w-full max-w-sm rounded-full border border-hairline bg-surface px-4 text-ink"
          />
        </form>
        <nav aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
          {chip(qs({ statut: undefined }), 'Tous les statuts', !statut)}
          {STATUSES.map((s) => chip(qs({ statut: s }), ORDER_STATUS_LABELS[s] ?? s, statut === s))}
        </nav>
        <nav aria-label="Filtrer par objet" className="flex flex-wrap gap-2">
          {chip(qs({ objet: undefined }), 'Tous les objets', !objet)}
          {Object.entries(PURPOSE_LABELS).map(([k, v]) => chip(qs({ objet: k }), v, objet === k))}
        </nav>
      </KpiPanel>

      <KpiPanel
        title={`${orders.length} paiement${orders.length > 1 ? 's' : ''}`}
        subtitle="100 au plus, les plus récents d’abord"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left">
            <thead>
              <tr className="type-caption text-ink-muted">
                <th scope="col" className="pb-2 font-medium">
                  Date
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Objet
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Client
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Montant
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Frais
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="type-body-small divide-y divide-hairline text-ink">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2">
                    <Link
                      href={`/admin/paiements/${o.id}`}
                      className="font-semibold text-action hover:underline"
                    >
                      {formatDateTime(o.createdAt)}
                    </Link>
                  </td>
                  <td className="py-2">{PURPOSE_LABELS[o.purpose ?? ''] ?? 'Paiement'}</td>
                  <td className="py-2 text-ink-muted">
                    {o.customerEmail ?? o.customerPhone ?? 'Sans compte'}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatFcfa(o.amount)}</td>
                  <td className="py-2 text-right tabular-nums text-ink-muted">
                    {o.feeAmount !== null ? formatFcfa(o.feeAmount) : '·'}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={orderTone(o.status)}>
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </KpiPanel>
    </>
  );
}

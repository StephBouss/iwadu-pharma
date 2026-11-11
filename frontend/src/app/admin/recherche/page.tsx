import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { formatDateTime, formatFcfa } from '@/lib/format';
import { PURPOSE_LABELS, RESERVATION_STATUS_LABELS } from '@/lib/labels';
import { normalizeGabonPhone } from '@/lib/phone';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Recherche' };

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePageAdmin('/admin/recherche');
  const q = ((await searchParams).q ?? '').trim().slice(0, 100);
  const phone = q ? normalizeGabonPhone(q) : null;
  const [pharmacies, users, orders, reservations] = q
    ? await Promise.all([
        prisma.pharmacy.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q.toLowerCase() } },
            ],
          },
          take: 10,
        }),
        prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              ...(phone ? [{ phone }] : []),
            ],
          },
          take: 10,
          select: { id: true, email: true, name: true },
        }),
        prisma.order.findMany({
          where: {
            purpose: { not: null },
            OR: [{ id: q }, { providerChargeId: q }, ...(phone ? [{ customerPhone: phone }] : [])],
          },
          take: 10,
        }),
        prisma.reservation.findMany({
          where: { code: q.toUpperCase() },
          take: 10,
          include: { pharmacy: { select: { id: true, name: true } } },
        }),
      ])
    : [[], [], [], []];
  const empty = q && pharmacies.length + users.length + orders.length + reservations.length === 0;

  return (
    <>
      <AdminHeader title="Recherche" />
      <form action="/admin/recherche" className="flex gap-2">
        <label htmlFor="q-global" className="sr-only">
          Rechercher
        </label>
        <input
          id="q-global"
          name="q"
          defaultValue={q}
          placeholder="Pharmacie, e-mail, téléphone, référence de paiement, code de réservation"
          className="type-body h-12 w-full rounded-full border border-hairline bg-surface px-5 text-ink"
        />
      </form>
      {!q && (
        <p className="type-body-small text-ink-muted">
          Tapez un nom, un e-mail, un numéro ou une référence.
        </p>
      )}
      {empty && <p className="type-body-small text-ink-muted">Aucun résultat pour « {q} ».</p>}
      {pharmacies.length > 0 && (
        <KpiPanel title="Pharmacies">
          <ul className="type-body-small flex flex-col gap-1">
            {pharmacies.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/pharmacies/${p.id}`}
                  className="font-semibold text-action hover:underline"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}
      {users.length > 0 && (
        <KpiPanel title="Comptes">
          <ul className="type-body-small flex flex-col gap-1">
            {users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/patients?q=${encodeURIComponent(u.email)}`}
                  className="font-semibold text-action hover:underline"
                >
                  {u.name ?? u.email}
                </Link>
                {u.name ? ` · ${u.email}` : ''}
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}
      {orders.length > 0 && (
        <KpiPanel title="Paiements">
          <ul className="type-body-small flex flex-col gap-1">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/paiements/${o.id}`}
                  className="font-semibold text-action hover:underline"
                >
                  {PURPOSE_LABELS[o.purpose ?? ''] ?? 'Paiement'} · {formatFcfa(o.amount)}
                </Link>{' '}
                · {formatDateTime(o.createdAt)}
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}
      {reservations.length > 0 && (
        <KpiPanel title="Réservations">
          <ul className="type-body-small flex flex-col gap-1">
            {reservations.map((r) => (
              <li key={r.id}>
                {r.code} · {RESERVATION_STATUS_LABELS[r.status]} ·{' '}
                <Link
                  href={`/admin/pharmacies/${r.pharmacy.id}`}
                  className="font-semibold text-action hover:underline"
                >
                  {r.pharmacy.name}
                </Link>{' '}
                · {formatDateTime(r.createdAt)}
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}
    </>
  );
}

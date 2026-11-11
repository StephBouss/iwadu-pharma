import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminActionButton, AdminForm } from '@/components/admin/AdminForm';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { FunnelBars, KpiList, KpiPanel } from '@/components/admin/KpiBlocks';
import { formatFcfa, formatGroupedInt } from '@/lib/format';
import { monthKey, startOfLocalDay } from '@/lib/server/iwadu/admin-kpis';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Statistiques' };

const PERIODS = { '7': '7 jours', '30': '30 jours', '90': '90 jours' } as const;
const FUNNEL = [
  ['landing_view', 'Visites'],
  ['photo_sent', 'Photos envoyées'],
  ['list_validated', 'Listes validées'],
  ['free_result_shown', 'Résultats gratuits'],
  ['unlock_clicked', 'Déblocages demandés'],
  ['payment_started', 'Paiements lancés'],
  ['payment_confirmed', 'Paiements confirmés'],
  ['reservation_created', 'Réservations'],
] as const;

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  await requirePageAdmin('/admin/statistiques');
  const { periode } = await searchParams;
  const days = periode && periode in PERIODS ? Number(periode) : 30;
  const now = new Date();
  const since = new Date(startOfLocalDay(now).getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const key = monthKey(now);

  const [
    events,
    reads,
    readsUncorrected,
    reservations,
    responded,
    expenses,
    forecasts,
    campaigns,
    adEvents,
    pharmacyCalls,
  ] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ['name'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.prescriptionRead.aggregate({
      where: { createdAt: { gte: since }, failed: false },
      _count: true,
      _avg: { durationMs: true, costMicroUsd: true },
    }),
    prisma.prescriptionRead.count({
      where: { createdAt: { gte: since }, failed: false, linesCorrected: 0 },
    }),
    prisma.reservation.groupBy({
      by: ['status'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.reservation.findMany({
      where: { createdAt: { gte: since }, respondedAt: { not: null } },
      select: { createdAt: true, respondedAt: true },
    }),
    prisma.expense.findMany({ where: { month: key }, orderBy: { createdAt: 'asc' } }),
    prisma.forecast.findMany({ orderBy: { month: 'asc' } }),
    prisma.adCampaign.findMany({ orderBy: { startsAt: 'desc' }, take: 50 }),
    prisma.adEvent.groupBy({
      by: ['campaignId', 'kind'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.analyticsEvent.count({ where: { name: 'call_clicked', createdAt: { gte: since } } }),
  ]);
  const count = (name: string) => events.find((e) => e.name === name)?._count ?? 0;
  const resTotal = reservations.reduce((a, r) => a + r._count, 0);
  const resOf = (s: string) => reservations.find((r) => r.status === s)?._count ?? 0;
  const avgResponse = responded.length
    ? Math.round(
        responded.reduce((a, r) => a + (r.respondedAt!.getTime() - r.createdAt.getTime()), 0) /
          responded.length /
          60_000,
      )
    : null;

  return (
    <>
      <AdminHeader title="Statistiques" />
      <nav aria-label="Période" className="flex flex-wrap gap-2">
        {Object.entries(PERIODS).map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/statistiques?periode=${k}`}
            aria-current={days === Number(k) ? 'page' : undefined}
            className={cn(
              'type-label flex h-10 items-center rounded-full border px-4',
              days === Number(k)
                ? 'border-action bg-action text-surface'
                : 'border-hairline bg-surface/80 text-ink hover:border-action',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 xl:grid-cols-2">
        <KpiPanel
          title="Entonnoir"
          subtitle={`Sur ${PERIODS[String(days) as keyof typeof PERIODS]}`}
        >
          <FunnelBars steps={FUNNEL.map(([name, label]) => ({ label, count: count(name) }))} />
        </KpiPanel>
        <div className="flex flex-col gap-4">
          <KpiPanel title="Lecture des ordonnances">
            <KpiList
              rows={[
                { label: 'Lectures réussies', value: formatGroupedInt(reads._count) },
                {
                  label: 'Validées sans correction',
                  value: reads._count
                    ? `${Math.round((readsUncorrected / reads._count) * 100)} %`
                    : '·',
                },
                {
                  label: 'Durée moyenne',
                  value: reads._avg.durationMs
                    ? `${(reads._avg.durationMs / 1000).toFixed(1).replace('.', ',')} s`
                    : '·',
                },
                {
                  label: 'Coût moyen par lecture',
                  value: reads._avg.costMicroUsd
                    ? `${(reads._avg.costMicroUsd / 1_000_000).toFixed(3).replace('.', ',')} $`
                    : '·',
                },
              ]}
            />
          </KpiPanel>
          <KpiPanel title="Réservations et contacts">
            <KpiList
              rows={[
                { label: 'Réservations', value: formatGroupedInt(resTotal) },
                { label: 'Retirées', value: formatGroupedInt(resOf('PICKED_UP')) },
                { label: 'Refusées', value: formatGroupedInt(resOf('REFUSED')) },
                { label: 'Expirées sans réponse', value: formatGroupedInt(resOf('EXPIRED')) },
                {
                  label: 'Délai moyen de réponse',
                  value: avgResponse === null ? '·' : `${avgResponse} min`,
                },
                {
                  label: 'Itinéraires lancés',
                  value: formatGroupedInt(count('directions_clicked')),
                },
                { label: 'Appels lancés', value: formatGroupedInt(pharmacyCalls) },
              ]}
            />
          </KpiPanel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <KpiPanel
          title="Charges du mois"
          subtitle="Déduites du chiffre d’affaires pour le résultat"
        >
          {expenses.length === 0 ? (
            <p className="type-body-small text-ink-muted">Aucune charge saisie ce mois.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="type-body-small text-ink">{e.label}</span>
                  <span className="flex items-center gap-3">
                    <span className="type-body-small tabular-nums text-ink">
                      {formatFcfa(e.amountFcfa)}
                    </span>
                    <AdminActionButton
                      action="expense.delete"
                      body={{ id: e.id }}
                      label="Supprimer"
                      variant="ghost"
                      confirm="Supprimer cette charge ?"
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <AdminForm
            action="expense.create"
            hidden={{ month: key }}
            submitLabel="Ajouter la charge"
            successMessage="Charge ajoutée."
            resetOnSuccess
            variant="secondary"
            fields={[
              {
                name: 'label',
                label: 'Libellé',
                type: 'text',
                required: true,
                placeholder: 'Hébergement, salaires…',
              },
              { name: 'amountFcfa', label: 'Montant (FCFA)', type: 'number', required: true },
            ]}
          />
        </KpiPanel>

        <KpiPanel title="Prévisions du plan" subtitle="Importées depuis le plan d’investissement">
          {forecasts.length > 0 && (
            <ul className="type-body-small grid gap-1 text-ink sm:grid-cols-2">
              {forecasts.map((f) => (
                <li key={f.month} className="tabular-nums">
                  {f.month} : {formatFcfa(f.revenueFcfa)}
                  {f.expensesFcfa !== null ? ` · charges ${formatFcfa(f.expensesFcfa)}` : ''}
                </li>
              ))}
            </ul>
          )}
          <AdminForm
            action="forecast.import"
            columns={1}
            submitLabel="Importer les prévisions"
            successMessage="Prévisions importées"
            resetOnSuccess
            variant="secondary"
            fields={[
              {
                name: 'csv',
                label: 'Une ligne par mois : AAAA-MM;chiffre d’affaires;charges',
                type: 'textarea',
                required: true,
                placeholder: '2026-12;0;0',
                hint: 'Montants en FCFA, sans espace. Un mois déjà présent est remplacé.',
              },
            ]}
          />
        </KpiPanel>
      </div>

      <KpiPanel
        title="Rapport des annonces"
        subtitle="Vues et clics sur la période, par campagne"
        href="/admin/annonces"
        linkLabel="Campagnes"
      >
        {campaigns.length === 0 ? (
          <p className="type-body-small text-ink-muted">Aucune campagne.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="type-caption text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">
                    Annonceur
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Annonce
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Vues
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Clics
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Taux de clic
                  </th>
                </tr>
              </thead>
              <tbody className="type-body-small divide-y divide-hairline text-ink tabular-nums">
                {campaigns.map((c) => {
                  const views =
                    adEvents.find((e) => e.campaignId === c.id && e.kind === 'VIEW')?._count ?? 0;
                  const clicks =
                    adEvents.find((e) => e.campaignId === c.id && e.kind === 'CLICK')?._count ?? 0;
                  return (
                    <tr key={c.id}>
                      <th scope="row" className="py-2 font-normal">
                        {c.advertiser}
                      </th>
                      <td className="py-2">{c.title}</td>
                      <td className="py-2 text-right">{formatGroupedInt(views)}</td>
                      <td className="py-2 text-right">{formatGroupedInt(clicks)}</td>
                      <td className="py-2 text-right">
                        {views ? `${((clicks / views) * 100).toFixed(1).replace('.', ',')} %` : '·'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </KpiPanel>
    </>
  );
}

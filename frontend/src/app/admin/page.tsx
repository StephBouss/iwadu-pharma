import type { Metadata } from 'next';
import { Banknote, FileSearch, Store, UserPlus } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { FunnelBars, KpiList, KpiPanel } from '@/components/admin/KpiBlocks';
import { DailyLineChart } from '@/components/admin/DailyLineChart';
import { OutcomeDonut, RecentActivity, TopPharmacies } from '@/components/admin/OverviewBlocks';
import { StatCard, type StatTrend } from '@/components/admin/StatCard';
import { ADS_ENABLED } from '@/lib/features';
import { formatDateTime, formatFcfa, formatGroupedInt } from '@/lib/format';
import { dashboardKpis } from '@/lib/server/iwadu/admin-kpis';
import { dashboardOverview, OVERVIEW_DAYS, type Trend } from '@/lib/server/iwadu/admin-overview';
import { getSettings } from '@/lib/server/iwadu/settings';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Tableau de bord' };

function signed(n: number): string {
  return n > 0 ? `+${formatFcfa(n)}` : formatFcfa(n);
}

/** Pastille de tendance : début du mois face à la même durée du mois dernier. */
function trendOf(t: Trend): StatTrend | undefined {
  if (t.pct === null)
    return t.current > 0
      ? { label: 'Nouveau', tone: 'positive', comparison: 'aucun le mois dernier à la même date' }
      : undefined;
  const sign = t.pct > 0 ? '+' : t.pct < 0 ? String.fromCharCode(0x2212) : '';
  return {
    label: `${sign}${Math.abs(t.pct)} %`,
    tone: t.pct > 0 ? 'positive' : t.pct < 0 ? 'negative' : 'neutral',
    comparison: 'par rapport au mois dernier à la même date',
  };
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y!, m! - 1, 1)));
}

export default async function AdminDashboardPage() {
  await requirePageAdmin('/admin');
  const [k, o, settings] = await Promise.all([dashboardKpis(), dashboardOverview(), getSettings()]);
  const partner = settings['share.partnerName']
    ? `Part ${settings['share.partnerName']}`
    : 'Part du partenaire';
  const r = k.revenue;

  return (
    <>
      <AdminHeader title="Tableau de bord" />

      <section
        aria-label="Indicateurs clés"
        className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 xl:grid-cols-4 xl:gap-6"
      >
        <StatCard
          icon={Banknote}
          label="Revenus du mois"
          value={formatGroupedInt(o.revenue.current)}
          unit="FCFA"
          trend={trendOf(o.revenue)}
          accent
        />
        <StatCard
          icon={FileSearch}
          label="Ordonnances cherchées ce mois"
          value={formatGroupedInt(o.searches.current)}
          trend={trendOf(o.searches)}
        />
        <StatCard
          icon={UserPlus}
          label="Nouveaux comptes ce mois"
          value={formatGroupedInt(o.accounts.current)}
          unit={`/ ${formatGroupedInt(o.accounts.total)}`}
          trend={trendOf(o.accounts)}
        />
        <StatCard
          icon={Store}
          label="Pharmacies actives"
          value={formatGroupedInt(o.pharmacies.active)}
          unit={`/ ${formatGroupedInt(o.pharmacies.total)}`}
          trend={
            k.alerts.total > 0
              ? {
                  label: `${k.alerts.total} alerte${k.alerts.total > 1 ? 's' : ''}`,
                  tone: 'negative',
                  comparison: 'en attente',
                }
              : undefined
          }
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr] xl:gap-8">
        <KpiPanel
          title="Ordonnances par jour"
          subtitle={`${OVERVIEW_DAYS} derniers jours`}
          href="/admin/ordonnances"
          linkLabel="Ordonnances"
        >
          <DailyLineChart days={o.days} />
        </KpiPanel>
        <KpiPanel title="Distribution des ordonnances" subtitle="Résultat des recherches, ce mois">
          <OutcomeDonut distribution={o.distribution} />
        </KpiPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr] xl:gap-8">
        <KpiPanel
          title="Top pharmacies"
          subtitle="Ordonnances complètes servies ce mois"
          href="/admin/pharmacies"
          linkLabel="Toutes les pharmacies"
        >
          <TopPharmacies rows={o.top} />
        </KpiPanel>
        <KpiPanel title="Activité récente" href="/admin/journal" linkLabel="Journal">
          <RecentActivity items={o.activity} />
        </KpiPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr] xl:gap-8">
        <KpiPanel
          title="Chiffre d’affaires"
          subtitle="Paiements confirmés uniquement"
          href="/admin/paiements"
          linkLabel="Paiements"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left">
              <caption className="sr-only">Chiffre d’affaires par source</caption>
              <thead>
                <tr className="type-caption text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">
                    Source
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Aujourd’hui
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Ce mois
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Cumulé
                  </th>
                </tr>
              </thead>
              <tbody className="type-body-small divide-y divide-hairline text-ink tabular-nums">
                {r.month.bySource.map((s, i) => (
                  <tr key={s.key}>
                    <th scope="row" className="py-2 font-normal">
                      {s.label}
                    </th>
                    <td className="py-2 text-right">{formatFcfa(r.day.bySource[i]!.amount)}</td>
                    <td className="py-2 text-right">{formatFcfa(s.amount)}</td>
                    <td className="py-2 text-right">{formatFcfa(r.all.bySource[i]!.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <th scope="row" className="py-2">
                    Total
                  </th>
                  <td className="py-2 text-right">{formatFcfa(r.day.total)}</td>
                  <td className="py-2 text-right">{formatFcfa(r.month.total)}</td>
                  <td className="py-2 text-right">{formatFcfa(r.all.total)}</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 font-normal text-ink-muted">
                    Frais du prestataire de paiement
                  </th>
                  <td className="py-2 text-right">{formatFcfa(-r.day.fees)}</td>
                  <td className="py-2 text-right">{formatFcfa(-r.month.fees)}</td>
                  <td className="py-2 text-right">{formatFcfa(-r.all.fees)}</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 font-normal text-ink-muted">
                    {partner} ({k.sharePct} %{ADS_ENABLED ? ', hors annonces' : ''})
                  </th>
                  <td className="py-2 text-right">{formatFcfa(-r.day.partner)}</td>
                  <td className="py-2 text-right">{formatFcfa(-r.month.partner)}</td>
                  <td className="py-2 text-right">{formatFcfa(-r.all.partner)}</td>
                </tr>
                <tr className="font-semibold">
                  <th scope="row" className="py-2">
                    Il reste à Iwadu
                  </th>
                  <td className="py-2 text-right">
                    {formatFcfa(r.day.total - r.day.fees - r.day.partner)}
                  </td>
                  <td className="py-2 text-right">
                    {formatFcfa(r.month.total - r.month.fees - r.month.partner)}
                  </td>
                  <td className="py-2 text-right">
                    {formatFcfa(r.all.total - r.all.fees - r.all.partner)}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 font-normal text-ink-muted">
                    Charges saisies
                  </th>
                  <td className="py-2 text-right">·</td>
                  <td className="py-2 text-right">{formatFcfa(-r.month.expenses)}</td>
                  <td className="py-2 text-right">{formatFcfa(-r.all.expenses)}</td>
                </tr>
                <tr className="font-semibold">
                  <th scope="row" className="py-2">
                    Résultat
                  </th>
                  <td className="py-2 text-right">{formatFcfa(r.day.result)}</td>
                  <td className="py-2 text-right">{formatFcfa(r.month.result)}</td>
                  <td className="py-2 text-right">{formatFcfa(r.all.result)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </KpiPanel>

        <KpiPanel
          title="Réel et prévision"
          subtitle="Écart avec le plan, mois par mois"
          href="/admin/statistiques"
          linkLabel="Prévisions et charges"
        >
          {k.plan.length === 0 ? (
            <p className="type-body-small text-ink-muted">Aucune prévision importée.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Chiffre d’affaires réel et prévu</caption>
                <thead>
                  <tr className="type-caption text-ink-muted">
                    <th scope="col" className="pb-2 font-medium">
                      Mois
                    </th>
                    <th scope="col" className="pb-2 text-right font-medium">
                      Réel
                    </th>
                    <th scope="col" className="pb-2 text-right font-medium">
                      Prévu
                    </th>
                    <th scope="col" className="pb-2 text-right font-medium">
                      Écart
                    </th>
                  </tr>
                </thead>
                <tbody className="type-body-small divide-y divide-hairline text-ink tabular-nums">
                  {k.plan.map((m) => (
                    <tr key={m.month}>
                      <th scope="row" className="py-2 font-normal">
                        {monthLabel(m.month)}
                      </th>
                      <td className="py-2 text-right">{formatFcfa(m.actual)}</td>
                      <td className="py-2 text-right">
                        {m.forecast === null ? '·' : formatFcfa(m.forecast)}
                      </td>
                      <td
                        className={cn(
                          'py-2 text-right',
                          m.gap !== null && m.gap < 0 && 'text-error',
                        )}
                      >
                        {m.gap === null
                          ? '·'
                          : `${signed(m.gap)} ${m.gap < 0 ? '(sous le plan)' : ''}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </KpiPanel>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
        <KpiPanel title="Comptes" href="/admin/patients" linkLabel="Patients">
          <KpiList
            rows={[
              {
                label: 'Nouveaux comptes aujourd’hui',
                value: formatGroupedInt(k.accounts.newToday),
              },
              { label: 'Nouveaux comptes ce mois', value: formatGroupedInt(k.accounts.newMonth) },
              { label: 'Pass Solo actifs', value: formatGroupedInt(k.accounts.passSolo) },
              { label: 'Pass Famille actifs', value: formatGroupedInt(k.accounts.passFamily) },
              { label: 'Renouvellements ce mois', value: formatGroupedInt(k.accounts.renewals) },
            ]}
          />
        </KpiPanel>

        <KpiPanel title="Ordonnances, ce mois" href="/admin/ordonnances" linkLabel="Ordonnances">
          <KpiList
            rows={[
              { label: 'Lues par l’IA', value: formatGroupedInt(k.prescriptions.aiRead) },
              {
                label: 'Validées sans correction',
                value: formatGroupedInt(k.prescriptions.uncorrected),
              },
              {
                label: 'Corrigées par le patient',
                value: formatGroupedInt(k.prescriptions.corrected),
              },
              { label: 'Lectures échouées', value: formatGroupedInt(k.prescriptions.failed) },
              { label: 'Saisies à la main', value: formatGroupedInt(k.prescriptions.manual) },
              { label: 'Recherches par nom', value: formatGroupedInt(k.prescriptions.byName) },
              {
                label: 'Coût de l’IA',
                value: `${k.prescriptions.aiCostUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`,
                strong: true,
              },
            ]}
          />
        </KpiPanel>

        <KpiPanel
          title="Entonnoir, ce mois"
          subtitle="Photos, recherches, déblocages, Pass"
          href="/admin/statistiques"
          linkLabel="Statistiques"
        >
          <FunnelBars steps={k.funnel} />
        </KpiPanel>

        <KpiPanel title="Pharmacies" href="/admin/pharmacies" linkLabel="Gérer">
          <KpiList
            rows={[
              { label: 'Actives', value: formatGroupedInt(k.pharmacies.active) },
              { label: 'En tarif de lancement', value: formatGroupedInt(k.pharmacies.launch) },
              { label: 'À valider', value: formatGroupedInt(k.pharmacies.pending) },
              { label: 'Demandes reçues', value: formatGroupedInt(k.pharmacies.applicationsNew) },
              {
                label: 'Dernière synchronisation',
                value: k.pharmacies.lastSync ? formatDateTime(k.pharmacies.lastSync) : 'Aucune',
              },
              {
                label: 'Synchronisations en retard',
                value: formatGroupedInt(k.pharmacies.syncAlerts.length),
                strong: k.pharmacies.syncAlerts.length > 0,
              },
            ]}
          />
        </KpiPanel>

        <KpiPanel
          title="Vue de démonstration"
          subtitle="Pour la présentation au partenaire logiciel"
          href="/admin/demo"
          linkLabel="Ouvrir"
        >
          <p className="type-body-small text-ink">
            Transactions de la démo, part du partenaire cumulée, demande par quartier, médicaments
            les plus cherchés et aperçu côté pharmacie.
          </p>
        </KpiPanel>
      </div>

      <KpiPanel
        title="Carte de la demande, ce mois"
        subtitle="Par quartier : recherches, médicaments non trouvés, itinéraires lancés"
        href="/admin/statistiques"
        linkLabel="Statistiques"
      >
        {k.demand.length === 0 ? (
          <p className="type-body-small text-ink-muted">Pas encore de recherche ce mois.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left">
              <thead>
                <tr className="type-caption text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">
                    Quartier
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Recherches
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Rien trouvé
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Partielles
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Itinéraires
                  </th>
                  <th scope="col" className="pb-2 pl-4 font-medium">
                    Médicaments les plus manquants
                  </th>
                </tr>
              </thead>
              <tbody className="type-body-small divide-y divide-hairline text-ink tabular-nums">
                {k.demand.map((d) => (
                  <tr key={d.districtId}>
                    <th scope="row" className="py-2 font-normal">
                      {d.district}
                    </th>
                    <td className="py-2 text-right">{d.searches}</td>
                    <td className="py-2 text-right">{d.notFound}</td>
                    <td className="py-2 text-right">{d.partial}</td>
                    <td className="py-2 text-right">{d.directions}</td>
                    <td className="py-2 pl-4 text-ink-muted">{d.topMissing.join(', ') || '·'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </KpiPanel>
    </>
  );
}

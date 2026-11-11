import type { Metadata } from 'next';
import { Banknote, FlaskConical, Handshake, Search } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiList, KpiPanel } from '@/components/admin/KpiBlocks';
import { StatCard } from '@/components/admin/StatCard';
import { formatDateTime, formatFcfa, formatGroupedInt } from '@/lib/format';
import { PURPOSE_LABELS } from '@/lib/labels';
import { demoView } from '@/lib/server/iwadu/demo-view';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';

// Vue de démonstration pour le partenaire logiciel, sous un bandeau
// « Données de démonstration » : transactions et part cumulée, demande par
// quartier, médicaments les plus cherchés, aperçu côté pharmacie.

export const metadata: Metadata = { title: 'Vue de démonstration' };

export default async function DemoViewPage({
  searchParams,
}: {
  searchParams: Promise<{ pharmacie?: string }>;
}) {
  await requirePageAdmin('/admin/demo');
  const { pharmacie } = await searchParams;
  const d = await demoView(pharmacie ?? null);
  const partner = d.partnerName ?? 'Partenaire';
  const maxDemand = d.demand[0]?.count ?? 1;

  return (
    <>
      <p
        role="note"
        className="type-body-strong flex items-center gap-2 rounded-card bg-ink px-4 py-3 text-mint"
      >
        <FlaskConical aria-hidden className="size-5 shrink-0" />
        Données de démonstration : pharmacies, stocks et paiements fictifs.
      </p>
      <AdminHeader title={`Vue de démonstration · ${partner}`} />

      <section
        aria-label="Chiffres clés"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      >
        <StatCard
          icon={Banknote}
          label="Transactions confirmées"
          value={formatGroupedInt(d.totals.count)}
        />
        <StatCard
          icon={Banknote}
          label="Montant payé par les patients"
          value={formatGroupedInt(d.totals.amount)}
          unit="FCFA"
        />
        <StatCard
          icon={Handshake}
          label={`Part ${partner}${d.sharePct !== null ? ` (${d.sharePct} %)` : ''}, cumulée`}
          value={formatGroupedInt(d.totals.share)}
          unit="FCFA"
          accent
        />
        <StatCard
          icon={Search}
          label="Ordonnances cherchées"
          value={formatGroupedInt(d.totalSearches)}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <KpiPanel
          title="Transactions par formule"
          subtitle={`Part calculée sur le montant payé, avant les frais du prestataire${d.feePct !== null ? ` (${d.feePct} %)` : ''}`}
        >
          {d.byPurpose.length === 0 ? (
            <p className="type-body-small text-ink-muted">
              Aucun paiement confirmé. Faites un paiement de démonstration depuis un résultat.
            </p>
          ) : (
            <KpiList
              rows={[
                ...d.byPurpose.map((r) => ({
                  label: `${PURPOSE_LABELS[r.purpose] ?? r.purpose} · ${r.count}`,
                  value: `${formatFcfa(r.amount)} → ${formatFcfa(r.share)}`,
                })),
                {
                  label: `Total · part ${partner}`,
                  value: formatFcfa(d.totals.share),
                  strong: true,
                },
              ]}
            />
          )}
        </KpiPanel>

        <KpiPanel title="Derniers paiements de la démo">
          {d.recent.length === 0 ? (
            <p className="type-body-small text-ink-muted">Aucun paiement pour le moment.</p>
          ) : (
            <ul className="type-body-small flex flex-col divide-y divide-hairline text-ink">
              {d.recent.map((o) => (
                <li key={o.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {PURPOSE_LABELS[o.purpose ?? ''] ?? 'Paiement'} ·{' '}
                    <span className="text-ink-muted">
                      {o.paidAt ? formatDateTime(o.paidAt) : ''}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {formatFcfa(o.amount)} · part {formatFcfa(o.commissionAmount ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </KpiPanel>

        <KpiPanel title="Demande par quartier" subtitle="Ordonnances cherchées, tous les temps">
          {d.demand.length === 0 ? (
            <p className="type-body-small text-ink-muted">Pas encore de recherche.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.demand.slice(0, 12).map((r) => (
                <li key={r.district} className="flex items-center gap-3">
                  <span className="type-body-small w-32 shrink-0 truncate text-ink">
                    {r.district}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-action"
                      style={{ width: `${Math.max(4, (r.count / maxDemand) * 100)}%` }}
                    />
                  </span>
                  <span className="type-body-small w-10 text-right text-ink tabular-nums">
                    {r.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </KpiPanel>

        <KpiPanel title="Médicaments les plus cherchés">
          {d.topMedicines.length === 0 ? (
            <p className="type-body-small text-ink-muted">Pas encore de recherche.</p>
          ) : (
            <KpiList
              rows={d.topMedicines.map((m) => ({
                label: m.label,
                value: formatGroupedInt(m.count),
              }))}
            />
          )}
        </KpiPanel>
      </div>

      <KpiPanel
        title="Aperçu côté pharmacie"
        subtitle="La demande de son quartier et les ordonnances qu’elle aurait pu servir"
      >
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" action="/admin/demo">
          <label className="flex flex-1 flex-col gap-2">
            <span className="type-label text-ink">Pharmacie</span>
            <select
              name="pharmacie"
              defaultValue={d.selectedSlug ?? ''}
              className="type-body h-12 rounded-field border border-outline bg-surface px-4 text-ink"
            >
              {d.pharmacies.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="type-label h-12 rounded-full border border-outline bg-surface px-6 text-action hover:bg-ivory"
          >
            Afficher
          </button>
        </form>
        {d.side && (
          <KpiList
            rows={[
              { label: 'Quartier', value: d.side.district ?? '·' },
              {
                label: 'Ordonnances cherchées dans son quartier',
                value: formatGroupedInt(d.side.districtSearches),
              },
              {
                label: 'Ordonnances qu’elle avait en entier',
                value: formatGroupedInt(d.side.couldServeFull),
                strong: true,
              },
              {
                label: 'Ordonnances qu’elle avait en partie',
                value: formatGroupedInt(d.side.couldServePart),
              },
              {
                label: 'Ce qui lui manquait le plus',
                value: d.side.missingTop.join(', ') || '·',
              },
            ]}
          />
        )}
      </KpiPanel>
    </>
  );
}

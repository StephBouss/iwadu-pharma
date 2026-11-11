import Link from 'next/link';
import {
  Banknote,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  FileSearch,
  Store,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { StatusBadge, type Status } from '@/components/ui/StatusBadge';
import { formatDateTime, formatGroupedInt } from '@/lib/format';
import type { ActivityItem, DashboardOverview, SyncState } from '@/lib/server/iwadu/admin-overview';
import { cn } from '@/lib/utils';

// Blocs de la maquette « Admin – Tableau de bord » : répartition des
// résultats (anneau), pharmacies qui servent le plus d'ordonnances
// complètes, activité récente. Jamais la couleur seule : chaque part a son
// icône, son libellé, son nombre et son pourcentage écrits à côté.

const OUTCOMES = [
  {
    key: 'complete',
    label: 'Trouvées complètes',
    hint: 'Une pharmacie a toute l’ordonnance',
    icon: CircleCheck,
    stroke: 'stroke-chart-1',
    swatch: 'bg-chart-1',
  },
  {
    key: 'partial',
    label: 'Partielles',
    hint: 'Une partie seulement, dans une même pharmacie',
    icon: CircleDashed,
    stroke: 'stroke-chart-3',
    swatch: 'bg-chart-3',
  },
  {
    key: 'none',
    label: 'Rien trouvé',
    hint: 'Aucun médicament en stock à proximité',
    icon: CircleSlash,
    stroke: 'stroke-chart-rest',
    swatch: 'bg-chart-rest',
  },
] as const;

const R = 60;
const STROKE = 20;
const CIRC = 2 * Math.PI * R;
/** Espace de 2 px entre deux parts (couleur du fond). */
const GAP = 2;

function pct(v: number, total: number): number {
  return total > 0 ? Math.round((v / total) * 100) : 0;
}

export function OutcomeDonut({
  distribution,
}: {
  distribution: DashboardOverview['distribution'];
}) {
  const total = distribution.complete + distribution.partial + distribution.none;
  const shown = OUTCOMES.filter((o) => distribution[o.key] > 0);
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center xl:flex-col 2xl:flex-row">
      <svg
        viewBox="0 0 160 160"
        className="size-40 shrink-0"
        role="img"
        aria-label={
          total === 0
            ? 'Aucune ordonnance cherchée ce mois'
            : OUTCOMES.map(
                (o) => `${o.label} : ${distribution[o.key]} (${pct(distribution[o.key], total)} %)`,
              ).join(', ')
        }
      >
        <g transform="rotate(-90 80 80)">
          <circle cx={80} cy={80} r={R} fill="none" strokeWidth={STROKE} className="stroke-muted" />
          {total > 0 &&
            shown.map((o) => {
              const len = (distribution[o.key] / total) * CIRC;
              const dash = shown.length > 1 ? Math.max(len - GAP, 0.5) : len;
              const el = (
                <circle
                  key={o.key}
                  cx={80}
                  cy={80}
                  r={R}
                  fill="none"
                  strokeWidth={STROKE}
                  strokeDasharray={`${dash} ${CIRC - dash}`}
                  strokeDashoffset={-offset}
                  className={o.stroke}
                >
                  <title>{`${o.label} : ${formatGroupedInt(distribution[o.key])} (${pct(distribution[o.key], total)} %)`}</title>
                </circle>
              );
              offset += len;
              return el;
            })}
        </g>
        <text
          x={80}
          y={76}
          textAnchor="middle"
          className="fill-ink font-display text-[26px] font-bold tabular-nums"
        >
          {formatGroupedInt(total)}
        </text>
        <text x={80} y={98} textAnchor="middle" className="fill-ink-muted text-[12px]">
          ordonnances
        </text>
      </svg>

      <ul className="flex w-full min-w-0 flex-col gap-3">
        {OUTCOMES.map((o) => {
          const Icon = o.icon;
          return (
            <li key={o.key} className="flex items-start gap-3">
              <span aria-hidden className={cn('mt-1.5 size-3 shrink-0 rounded-sm', o.swatch)} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="type-body-small flex items-center gap-1.5 font-semibold text-ink">
                  <Icon aria-hidden className="size-4 text-ink-muted" />
                  {o.label}
                </span>
                <span className="type-caption text-ink-muted">{o.hint}</span>
              </div>
              <span className="type-body-small text-right whitespace-nowrap text-ink tabular-nums">
                <strong>{formatGroupedInt(distribution[o.key])}</strong>
                <span className="block text-ink-muted">{pct(distribution[o.key], total)} %</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const SYNC: Record<SyncState, { status: Status; label: string }> = {
  online: { status: 'available', label: 'En ligne' },
  late: { status: 'low', label: 'En retard' },
  manual: { status: 'verify', label: 'Saisie manuelle' },
};

export function TopPharmacies({ rows }: { rows: DashboardOverview['top'] }) {
  if (rows.length === 0) {
    return (
      <p className="type-body-small text-ink-muted">
        Pas encore d’ordonnance cherchée ce mois. Le classement apparaîtra avec les premières
        recherches.
      </p>
    );
  }
  return (
    <>
      {/* Mobile : une ligne par pharmacie, sans défilement horizontal. */}
      <ol className="flex flex-col divide-y divide-hairline sm:hidden">
        {rows.map((p, i) => (
          <li key={p.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <span className="type-caption flex size-7 shrink-0 items-center justify-center rounded-full bg-action/10 font-semibold text-action tabular-nums">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`/admin/pharmacies/${p.id}`}
                  className="type-body-strong text-action hover:underline"
                >
                  {p.name}
                </Link>
                <span className="type-caption text-ink-muted">
                  {p.district ?? 'Sans quartier'}
                  {p.isDemo ? ' · Exemple fictif' : ''}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pl-10">
              <span className="type-body-small text-ink tabular-nums">
                <strong>{formatGroupedInt(p.complete)}</strong> complètes sur{' '}
                {formatGroupedInt(p.proposed)}
              </span>
              <StatusBadge status={SYNC[p.sync].status}>{SYNC[p.sync].label}</StatusBadge>
            </div>
          </li>
        ))}
      </ol>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left">
          <caption className="sr-only">
            Pharmacies qui servent le plus d’ordonnances complètes ce mois
          </caption>
          <thead>
            <tr className="type-caption text-ink-muted">
              <th scope="col" className="pb-3 font-medium">
                Pharmacie
              </th>
              <th scope="col" className="pb-3 text-right font-medium">
                Ordonnances complètes
              </th>
              <th scope="col" className="pb-3 text-right font-medium">
                Proposée
              </th>
              <th scope="col" className="pb-3 pl-6 font-medium">
                Stock
              </th>
            </tr>
          </thead>
          <tbody className="type-body-small divide-y divide-hairline text-ink tabular-nums">
            {rows.map((p, i) => (
              <tr key={p.id}>
                <th scope="row" className="py-3 font-normal">
                  <div className="flex items-center gap-3">
                    <span className="type-caption flex size-7 shrink-0 items-center justify-center rounded-full bg-action/10 font-semibold text-action">
                      {i + 1}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={`/admin/pharmacies/${p.id}`}
                        className="font-semibold text-action hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="text-ink-muted">
                        {p.district ?? 'Sans quartier'}
                        {p.isDemo ? ' · Exemple fictif' : ''}
                      </span>
                    </div>
                  </div>
                </th>
                <td className="py-3 text-right font-semibold">{formatGroupedInt(p.complete)}</td>
                <td className="py-3 text-right text-ink-muted">{formatGroupedInt(p.proposed)}</td>
                <td className="py-3 pl-6">
                  <StatusBadge status={SYNC[p.sync].status}>{SYNC[p.sync].label}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const ACTIVITY_ICON: Record<ActivityItem['kind'], LucideIcon> = {
  payment: Banknote,
  account: UserPlus,
  application: Store,
  search: FileSearch,
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="type-body-small text-ink-muted">Aucune activité pour l’instant.</p>;
  }
  return (
    <ol className="flex flex-col gap-4">
      {items.map((it) => {
        const Icon = ACTIVITY_ICON[it.kind];
        return (
          <li key={it.id} className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action/10 text-action"
            >
              <Icon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="type-body-small font-semibold text-ink">{it.title}</span>
              <span className="type-caption text-ink-muted">{it.detail}</span>
              <time dateTime={it.at.toISOString()} className="type-caption text-ink-muted">
                {formatDateTime(it.at)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

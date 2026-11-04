import { StatusBadge, type Status } from '@/components/ui/StatusBadge';
import { formatFcfa } from '@/lib/format';

// Maquette Banani « Recent Orders Table ». Ordinateur et tablette : un vrai
// tableau (lignes alternées). Mobile : une liste de fiches, plus lisible
// qu'un tableau à 6 colonnes sur 360 px.

export interface RecentOrder {
  ref: string;
  patient: string;
  pharmacy: string;
  /** FCFA entiers. */
  amount: number;
  status: Status;
  statusLabel: string;
  /** Ancienneté déjà rédigée, ex. « Il y a 5 min ». */
  timeLabel: string;
}

const HEADERS = ['Réf.', 'Patient', 'Pharmacie', 'Montant', 'Statut', 'Heure'] as const;

export function RecentOrdersTable({ rows }: { rows: readonly RecentOrder[] }) {
  return (
    <>
      <ul className="divide-y divide-hairline md:hidden">
        {rows.map((row) => (
          <li key={row.ref} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{row.ref}</span>
              <StatusBadge status={row.status}>{row.statusLabel}</StatusBadge>
            </div>
            <p className="type-body-small text-ink">
              {row.patient} <span className="text-ink-muted">· {row.pharmacy}</span>
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink tabular-nums">
                {formatFcfa(row.amount)}
              </span>
              <span className="type-caption text-ink-muted">{row.timeLabel}</span>
            </div>
          </li>
        ))}
      </ul>

      <table className="hidden w-full text-left md:table">
        <thead>
          <tr className="border-b border-hairline">
            {HEADERS.map((h) => (
              <th
                key={h}
                scope="col"
                className="type-caption px-4 pt-3 pb-2 font-semibold text-ink-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.ref} className={i % 2 === 0 ? 'bg-surface/55' : undefined}>
              <td className="px-4 py-3 text-sm font-semibold text-ink">{row.ref}</td>
              <td className="type-body-small px-4 py-3 text-ink">{row.patient}</td>
              <td className="type-body-small px-4 py-3 text-ink-muted">{row.pharmacy}</td>
              <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap text-ink tabular-nums">
                {formatFcfa(row.amount)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status}>{row.statusLabel}</StatusBadge>
              </td>
              <td className="type-caption px-4 py-3 whitespace-nowrap text-ink-muted">
                {row.timeLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

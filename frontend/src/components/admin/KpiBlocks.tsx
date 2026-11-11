import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { formatGroupedInt } from '@/lib/format';
import { cn } from '@/lib/utils';

// Blocs du tableau de bord : panneau titré, liste « libellé → valeur »,
// barres horizontales d'entonnoir (valeur écrite à côté de chaque barre :
// jamais la longueur seule).

export function KpiPanel({
  title,
  subtitle,
  href,
  linkLabel = 'Voir le détail',
  className,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  href?: string | undefined;
  linkLabel?: string;
  className?: string | undefined;
  children: ReactNode;
}) {
  // Maquette « Admin – Tableau de bord » : titre de section en vert au-dessus
  // de la carte de verre clair, lien éventuel à droite du titre.
  return (
    <section className={cn('flex min-w-0 flex-col gap-4', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-7 font-bold text-brand">{title}</h2>
          {subtitle && <p className="type-body-small text-ink-muted">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold whitespace-nowrap text-action hover:underline"
          >
            {linkLabel} <ChevronRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
      <GlassPanel className="flex min-w-0 flex-1 flex-col gap-4 p-5 lg:p-6">{children}</GlassPanel>
    </section>
  );
}

export function KpiList({
  rows,
}: {
  rows: { label: string; value: ReactNode; strong?: boolean }[];
}) {
  return (
    <dl className="flex flex-col divide-y divide-hairline">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"
        >
          <dt
            className={cn(
              'type-body-small',
              r.strong ? 'font-semibold text-ink' : 'text-ink-muted',
            )}
          >
            {r.label}
          </dt>
          <dd
            className={cn(
              'tabular-nums',
              r.strong ? 'type-body-strong text-ink' : 'type-body-small text-ink',
            )}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function FunnelBars({ steps }: { steps: { label: string; count: number }[] }) {
  const first = Math.max(steps[0]?.count ?? 0, 1);
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1]!.count : null;
        // Taux seulement quand l'étape est un sous-ensemble de la précédente.
        const rate = prev && s.count <= prev ? Math.round((s.count / prev) * 100) : null;
        return (
          <li key={s.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="type-body-small text-ink">{s.label}</span>
              <span className="type-body-small text-ink tabular-nums">
                <strong>{formatGroupedInt(s.count)}</strong>
                {rate !== null && (
                  <span className="text-ink-muted"> · {rate} % de l’étape précédente</span>
                )}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full bg-action"
                style={{ width: `${Math.min((s.count / first) * 100, 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

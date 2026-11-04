import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge, type Status } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

// Panneau des statuts d'ordonnances du tableau de bord. Titre de la maquette
// (« Statuts en temps réel ») remplacé : la charte n'autorise « en temps
// réel » que pour un stock réellement connecté.

export interface StatusCount {
  status: Status;
  label: string;
  count: number;
}

export function StatusCounts({
  title,
  rows,
  className,
}: {
  title: string;
  rows: readonly StatusCount[];
  className?: string | undefined;
}) {
  return (
    <GlassPanel as="section" className={cn('flex flex-col gap-3 p-5', className)}>
      <h2 className="type-title-3 text-ink">{title}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3">
            <StatusBadge status={row.status}>{row.label}</StatusBadge>
            <span className="font-display text-base font-bold text-ink tabular-nums">
              {row.count}
            </span>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

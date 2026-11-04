import type { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils';

// Maquette Banani « Stat Card » : indicateur clé du back-office. La couleur
// de la tendance dit si l'évolution est bonne ou mauvaise, pas si le nombre
// monte : « -3 alertes » est une bonne nouvelle, donc en vert.

export interface StatTrend {
  /** Texte affiché, ex. « +12 % » ou « -3 ». */
  label: string;
  tone: 'positive' | 'negative';
  /** Base de comparaison lue par les lecteurs d'écran, ex. « par rapport à hier ». */
  comparison: string;
}

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  /** Valeur déjà mise en forme, ex. « 1 248 000 ». */
  value: string;
  unit?: string | undefined;
  trend?: StatTrend | undefined;
  /** Icône sur fond vert d'action : l'indicateur principal de la ligne. */
  accent?: boolean | undefined;
  className?: string | undefined;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  accent = false,
  className,
}: StatCardProps) {
  return (
    <GlassPanel className={cn('flex flex-col gap-3 p-4 lg:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-field',
            accent ? 'bg-action text-surface' : 'bg-available-soft text-action',
          )}
        >
          <Icon className="size-5" />
        </span>
        {trend && (
          <span
            className={cn(
              'rounded-full px-2 py-1 text-[0.8125rem] leading-4 font-semibold tabular-nums',
              trend.tone === 'positive'
                ? 'bg-available-soft text-available'
                : 'bg-error-soft text-error',
            )}
          >
            {trend.label}
            <span className="sr-only"> {trend.comparison}</span>
          </span>
        )}
      </div>
      <div>
        <p className="type-caption text-ink-muted">{label}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 font-display text-2xl leading-tight font-bold text-ink tabular-nums lg:text-[1.75rem]">
          {value}
          {unit && <span className="type-body text-ink-muted">{unit}</span>}
        </p>
      </div>
    </GlassPanel>
  );
}

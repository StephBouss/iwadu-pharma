import type { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils';

// Maquette « Admin – Tableau de bord » : carte d'indicateur en verre clair,
// pastille d'icône verte, pastille de tendance en haut à droite, valeur en
// grand. La couleur de la tendance dit si l'évolution est bonne ou mauvaise,
// pas si le nombre monte : « −3 alertes » est une bonne nouvelle, donc en vert.

export interface StatTrend {
  /** Texte affiché, ex. « +12 % » ou « −3 ». */
  label: string;
  tone: 'positive' | 'negative' | 'neutral';
  /** Base de comparaison lue par les lecteurs d'écran, ex. « par rapport au mois dernier ». */
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
    <GlassPanel className={cn('flex flex-col gap-4 p-5 lg:p-6', className)}>
      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-field',
            accent ? 'bg-action text-surface' : 'bg-action/15 text-action',
          )}
        >
          <Icon className="size-6" />
        </span>
        {trend && (
          <span
            className={cn(
              'type-caption rounded-md px-3 py-1 font-semibold whitespace-nowrap tabular-nums',
              trend.tone === 'positive' && 'bg-available-soft text-available',
              trend.tone === 'negative' && 'bg-error-soft text-error',
              trend.tone === 'neutral' && 'bg-muted text-ink-muted',
            )}
          >
            {trend.label}
            <span className="sr-only"> {trend.comparison}</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="type-body-small text-ink-muted">{label}</p>
        <p className="flex flex-wrap items-baseline gap-x-1.5 font-display text-[1.75rem] leading-none font-bold text-ink tabular-nums lg:text-[2rem]">
          {value}
          {unit && <span className="type-body font-normal text-ink-muted">{unit}</span>}
        </p>
      </div>
    </GlassPanel>
  );
}

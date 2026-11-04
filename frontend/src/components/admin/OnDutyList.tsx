import { Moon } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

// Panneau « De garde cette nuit » du tableau de bord. La maquette colore la
// lune en menthe ; la charte réserve la menthe aux fonds sombres : icône en
// encre ici, le badge « De garde » portant déjà la menthe sur fond encre.

export interface OnDutyPharmacy {
  name: string;
  /** Quartier, ex. « Glass ». */
  district: string;
  /** Fin de garde déjà rédigée, ex. « Jusqu'à 7 h ». */
  until: string;
}

export function OnDutyList({
  pharmacies,
  className,
}: {
  pharmacies: readonly OnDutyPharmacy[];
  className?: string | undefined;
}) {
  return (
    <GlassPanel as="section" className={cn('flex flex-col gap-3 p-5', className)}>
      <h2 className="type-title-3 flex items-center gap-2 text-ink">
        <Moon aria-hidden className="size-4 shrink-0" />
        De garde cette nuit
      </h2>
      <ul className="flex flex-col">
        {pharmacies.map((p) => (
          <li
            key={p.name}
            className="flex flex-col gap-1.5 border-b border-hairline py-3 first:pt-0 last:border-0 last:pb-0"
          >
            {/* Nom sur toute la largeur ; le badge passe sur la ligne du
                quartier, qui va à la ligne si la colonne est étroite. */}
            <span className="text-sm font-semibold text-ink">{p.name}</span>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <p className="type-caption flex gap-3 text-ink-muted">
                <span>{p.district}</span>
                <span>{p.until}</span>
              </p>
              <StatusBadge status="on-duty" className="shrink-0" />
            </div>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

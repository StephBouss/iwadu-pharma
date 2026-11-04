import type { ReactNode } from 'react';
import { ChevronRight, Store } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatClock, formatDistance } from '@/lib/format';
import { cn } from '@/lib/utils';

// Maquette Banani « Pharmacy Card » (charte V1.0) : nom, distance et
// ouverture, badge « De garde » en haut à droite, couverture de l'ordonnance,
// heure de mise à jour du stock, action. La pharmacie qui a toute
// l'ordonnance est cerclée de vert d'action.

export interface PharmacyCardProps {
  name: string;
  /** Distance depuis la position actuelle du visiteur, en mètres. */
  distanceMeters?: number | undefined;
  /** Ouverture déjà rédigée : « Ouverte jusqu'à 21 h », « De garde cette nuit »… */
  openingLabel?: string | undefined;
  /** Pharmacie de garde : badge « De garde » à côté du nom. */
  onDuty?: boolean | undefined;
  /** Badges d'état (`StatusBadge`), en général la couverture de l'ordonnance. */
  badges?: ReactNode;
  /** Heure de mise à jour du stock : un stock affiche toujours son heure. */
  stockUpdatedAt?: Date | undefined;
  /** Met la carte en avant : la pharmacie a toute l'ordonnance. */
  highlighted?: boolean | undefined;
  /** Lien vers la fiche ; affiche le bouton « Voir la pharmacie ». */
  href?: string | undefined;
  className?: string | undefined;
}

export function PharmacyCard({
  name,
  distanceMeters,
  openingLabel,
  onDuty = false,
  badges,
  stockUpdatedAt,
  highlighted = false,
  href,
  className,
}: PharmacyCardProps) {
  const subline = [
    distanceMeters !== undefined ? `À ${formatDistance(distanceMeters)}` : null,
    openingLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <GlassPanel
      as="article"
      className={cn('flex flex-col gap-3 p-4', highlighted && 'ring-2 ring-action', className)}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-field bg-available-soft text-action"
        >
          <Store className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="type-title-3 wrap-break-word text-ink">{name}</h3>
          {subline && <p className="type-body-small text-ink-muted">{subline}</p>}
        </div>
        {onDuty && <StatusBadge status="on-duty" className="shrink-0" />}
      </div>

      {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}

      {stockUpdatedAt && (
        <p className="type-caption text-ink-muted">
          Stock mis à jour à {formatClock(stockUpdatedAt)}
        </p>
      )}

      {href && (
        <ButtonLink
          href={href}
          variant="secondary"
          fullWidth
          trailingIcon={<ChevronRight aria-hidden />}
          className="mt-auto"
        >
          Voir la pharmacie
        </ButtonLink>
      )}
    </GlassPanel>
  );
}

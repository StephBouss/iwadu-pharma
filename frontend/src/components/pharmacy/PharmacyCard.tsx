import type { ReactNode } from 'react';
import { ChevronRight, Store } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { formatClock, formatDistance } from '@/lib/format';
import { cn } from '@/lib/utils';

// Charte V1.0 — carte de pharmacie : nom, distance et ouverture, états de
// l'ordonnance, heure de mise à jour du stock, action. La pharmacie qui a
// toute l'ordonnance est mise en avant (fond teinté, contour vert d'action).

export interface PharmacyCardProps {
  name: string;
  /** Distance depuis la position actuelle du visiteur, en mètres. */
  distanceMeters?: number | undefined;
  /** Ouverture déjà rédigée : « Ouverte jusqu'à 21 h », « De garde cette nuit »… */
  openingLabel?: string | undefined;
  /** Badges d'état (`StatusBadge`) : couverture de l'ordonnance, garde… */
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
    <article
      className={cn(
        'flex flex-col gap-4 rounded-card p-5',
        highlighted
          ? 'border-2 border-action bg-brand/8'
          : 'border border-hairline bg-surface shadow-card',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ivory text-action"
        >
          <Store className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="type-title-2 text-ink">{name}</h3>
          {subline && <p className="type-body-small text-ink-muted">{subline}</p>}
        </div>
      </div>

      {badges && <div className="flex flex-wrap gap-2">{badges}</div>}

      {stockUpdatedAt && (
        <p className="type-body-small text-ink-muted">
          Stock mis à jour à {formatClock(stockUpdatedAt)}
        </p>
      )}

      {href && (
        <ButtonLink
          href={href}
          variant="secondary"
          fullWidth
          trailingIcon={<ChevronRight aria-hidden />}
        >
          Voir la pharmacie
        </ButtonLink>
      )}
    </article>
  );
}

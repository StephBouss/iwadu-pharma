import { formatGroupedInt, NBSP } from '@/lib/format';
import { cn } from '@/lib/utils';

// Charte V1.0 — montants en Figtree, chiffres tabulaires, espace entre les
// milliers ; « FCFA » plus petit et plus léger que le nombre.

export interface AmountProps {
  /** Montant entier en FCFA. */
  value: number;
  /** `lg` : montant mis en avant (32 px) ; `md` : ligne de récapitulatif (20 px). */
  size?: 'lg' | 'md' | undefined;
  className?: string | undefined;
}

export function Amount({ value, size = 'md', className }: AmountProps) {
  return (
    <span
      className={cn(
        'whitespace-nowrap',
        size === 'lg' ? 'type-amount-lg' : 'type-amount',
        className,
      )}
    >
      {formatGroupedInt(value)}
      {NBSP}
      <span className="text-[0.6em] font-medium">FCFA</span>
    </span>
  );
}

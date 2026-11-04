import { Smartphone } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';

// Maquette Banani « Bottom Action Bar » : l'action principale de l'écran
// (« Réserver et payer · 4 500 FCFA »), en vert d'action. Collée en bas de
// l'écran sur mobile pour rester à portée du pouce.

export interface ReserveBarProps {
  /** Montant à payer, en FCFA entiers. */
  amount: number;
  href: string;
  /** Affiche la mention « Exemple fictif » sous le bouton. */
  demo?: boolean | undefined;
  className?: string | undefined;
}

export function ReserveBar({ amount, href, demo = false, className }: ReserveBarProps) {
  return (
    <GlassPanel className={cn('flex flex-col gap-3 p-4', className)}>
      <ButtonLink href={href} fullWidth leadingIcon={<Smartphone aria-hidden />}>
        Réserver et payer · {formatFcfa(amount)}
      </ButtonLink>
      {demo && <p className="type-caption text-center text-ink-muted">Exemple fictif</p>}
    </GlassPanel>
  );
}

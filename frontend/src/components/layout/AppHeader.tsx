import Link from 'next/link';
import { User } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils';

// Maquette Banani « App Header » : panneau en verre, logo horizontal, rappel
// du contexte (« Près de votre position · Louis ») et accès au compte.
// Cibles tactiles de 48 px ; le rond visible du compte fait 32 px.

export interface AppHeaderProps {
  /** Contexte affiché à droite ; passe sur 2 lignes plutôt que d'être coupé. */
  subtitle?: string | undefined;
  className?: string | undefined;
}

export function AppHeader({ subtitle, className }: AppHeaderProps) {
  return (
    <GlassPanel
      as="header"
      className={cn('flex items-center justify-between gap-2 py-1 pr-1 pl-4', className)}
    >
      <Link href="/" aria-label="Iwadu Pharma, accueil" className="flex h-12 shrink-0 items-center">
        <Logo variant="horizontal-couleur" height={32} priority />
      </Link>
      <div className="flex min-w-0 items-center">
        {subtitle && (
          <span className="type-caption line-clamp-2 text-right text-ink-muted">{subtitle}</span>
        )}
        <Link
          href="/compte"
          aria-label="Mon compte"
          className="group flex size-12 shrink-0 items-center justify-center rounded-full"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-ink-muted transition-colors group-hover:bg-hairline">
            <User aria-hidden className="size-4" />
          </span>
        </Link>
      </div>
    </GlassPanel>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HeroMapPattern } from './HeroMapPattern';

// Bandeau des maquettes Banani : dégradé du vert profond au vert Iwadu,
// halos menthe et carrés translucides en escalier (motif du logo). Le
// dégradé reste sombre derrière le texte (vert profond → vert d'action) pour
// garder un contraste AA ; le vert Iwadu n'apparaît que dans l'angle décoré.
// Décor masqué aux lecteurs d'écran et transparent aux clics.

export function HeroBanner({
  children,
  className,
  decor = 'full',
  backdrop = false,
}: {
  children: ReactNode;
  className?: string | undefined;
  /** `full` : halos et carrés ; `light` : halo seul (bandeaux courts). */
  decor?: 'full' | 'light';
  /**
   * Photo de rayonnages (domaine public, Wikimedia Commons) et motif de carte,
   * à peine visibles. La photo est fondue en « multiplier » : elle ne peut
   * qu'assombrir le dégradé, jamais réduire le contraste du texte blanc.
   */
  backdrop?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-linear-[135deg] from-deep via-action to-brand text-surface',
        className,
      )}
    >
      {backdrop && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img
            src="/images/hero-rayonnages-1600.webp"
            srcSet="/images/hero-rayonnages-800.webp 800w, /images/hero-rayonnages-1600.webp 1600w"
            sizes="100vw"
            alt=""
            decoding="async"
            fetchPriority="low"
            className="absolute inset-0 size-full object-cover opacity-20 mix-blend-multiply"
          />
          <HeroMapPattern className="absolute inset-0 size-full text-mint opacity-25 mask-l-from-30% mask-l-to-90% md:opacity-40 md:mask-l-from-40%" />
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 size-[28rem] rounded-full bg-radial from-mint/22 to-transparent to-70% md:size-[37rem]" />
        {decor === 'full' && (
          <>
            <div className="absolute top-52 right-24 hidden size-[22rem] rounded-full bg-radial from-mint/12 to-transparent to-70% md:block" />
            <div className="absolute top-10 -right-10 size-28 rotate-12 rounded-[1.5rem] border border-surface/12 bg-surface/6 md:top-16 md:right-80 md:size-40 md:rounded-[2rem]" />
            <div className="absolute top-36 right-6 size-20 rotate-20 rounded-[1.25rem] border border-surface/10 bg-surface/5 md:top-44 md:right-52 md:size-30 md:rounded-[1.5rem]" />
            <div className="absolute top-60 right-28 hidden size-20 rotate-30 rounded-[1.125rem] border border-surface/8 bg-surface/4 md:block" />
          </>
        )}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

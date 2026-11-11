import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Maquettes Banani « Verre Menthe » : panneau blanc translucide, flou
// d'arrière-plan, liseré blanc, ombre douce. Posé sur le fond ivoire décoré
// (BgShapes). Sans `backdrop-filter` (vieux navigateurs), le fond devient
// presque opaque pour garder la lisibilité.

type GlassElement = 'div' | 'section' | 'header' | 'article' | 'aside' | 'nav';

export type GlassPanelProps = ComponentProps<'div'> & {
  as?: GlassElement | undefined;
  /** `card` : 16 px (cartes, en-têtes) ; `sheet` : 24 px (récapitulatifs). */
  radius?: 'card' | 'sheet' | undefined;
};

export function GlassPanel({
  as: Tag = 'div',
  radius = 'card',
  className,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <Tag
      className={cn(
        // `glass-panel` : repère du style « verre clair » des espaces (globals.css).
        'glass-panel border border-surface/60 bg-surface/92 shadow-glass supports-backdrop-filter:bg-surface/72 supports-backdrop-filter:backdrop-blur-glass',
        radius === 'sheet' ? 'rounded-sheet' : 'rounded-card',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

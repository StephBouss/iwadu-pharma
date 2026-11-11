import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Verre posé sur le bandeau dégradé (maquettes Banani). Fond vert profond
// translucide plutôt que blanc : le texte blanc garde un contraste AA, même
// quand le flou est coupé (petits Android, transparence réduite).

type GlassElement = 'div' | 'section' | 'article' | 'aside';

export function GlassDark({
  as: Tag = 'div',
  className,
  children,
  ...props
}: ComponentProps<'div'> & { as?: GlassElement | undefined }) {
  return (
    <Tag
      className={cn(
        'rounded-sheet border border-surface/25 bg-deep/70 text-surface supports-backdrop-filter:bg-deep/45 supports-backdrop-filter:backdrop-blur-[24px]',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

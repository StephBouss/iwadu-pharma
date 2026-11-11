import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Maquette « Admin – Tableau de bord » : grand titre en vert Iwadu (texte
// large, contraste suffisant), sous-titre gris, actions éventuelles à droite.

export function PageHeading({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-tight font-bold text-brand lg:text-[2.5rem]">
          {title}
        </h1>
        {subtitle && <p className="type-body text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Titre de section posé au-dessus d'une carte, comme dans la maquette. */
export function SectionTitle({
  id,
  children,
  className,
}: {
  id?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <h2 id={id} className={cn('font-display text-xl leading-7 font-bold text-brand', className)}>
      {children}
    </h2>
  );
}

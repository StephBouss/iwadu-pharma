import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Titre de page (Outfit, vert Iwadu : grand texte, contraste suffisant) et chapeau. */
export function PageTitle({
  title,
  lead,
  overline,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  overline?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {overline && <p className="type-overline text-action">{overline}</p>}
      <h1 className="type-title-1 text-brand lg:type-display">{title}</h1>
      {lead && <p className="type-body text-ink-muted">{lead}</p>}
    </div>
  );
}

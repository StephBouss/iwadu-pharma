import type { ReactNode } from 'react';
import { PageTitle } from '@/components/layout/PageTitle';
import { PublicShell } from '@/components/layout/PublicShell';
import { GlassPanel } from '@/components/ui/GlassPanel';

/** Gabarit des pages de compte : titre, carte de verre, liens sous la carte. */
export function AuthCard({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <PublicShell width="patient">
      <PageTitle title={title} lead={lead} />
      <GlassPanel radius="sheet" className="flex flex-col gap-4 p-5">
        {children}
      </GlassPanel>
      {footer && <div className="type-body-small text-center text-ink-muted">{footer}</div>}
    </PublicShell>
  );
}

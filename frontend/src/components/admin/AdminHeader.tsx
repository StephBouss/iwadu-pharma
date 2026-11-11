import type { ReactNode } from 'react';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { formatLongDate } from '@/lib/format';

/** Titre d'une page du back-office ; la date du jour par défaut en sous-titre. */
export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <PageHeading
      title={title}
      subtitle={subtitle ?? formatLongDate(new Date())}
      actions={actions}
    />
  );
}

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { DashboardFrame } from '@/components/dashboard/DashboardFrame';
import { activeNavId } from '@/components/dashboard/types';
import { ADMIN_NAV, ADMIN_NAV_SECONDARY } from './nav';

// Cadre du back-office (maquette « Admin – Tableau de bord ») : la recherche
// et la cloche des alertes restent dans le bandeau du haut.

const ALL = [...ADMIN_NAV, ...ADMIN_NAV_SECONDARY];

export function AdminChrome({
  adminName,
  adminRole,
  hasAlerts,
  children,
}: {
  adminName: string;
  adminRole: string;
  hasAlerts: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith('/admin/recherche')
    ? null
    : activeNavId(pathname, ALL, '/admin');
  return (
    <DashboardFrame
      homeHref="/admin"
      homeLabel="Iwadu Pharma, tableau de bord"
      caption="Back-office"
      navLabel="Back-office"
      items={ADMIN_NAV}
      secondary={ADMIN_NAV_SECONDARY}
      activeId={active}
      userName={adminName}
      userRole={adminRole}
      stripLeading={
        <form role="search" action="/admin/recherche">
          <label className="flex h-11 w-72 items-center gap-2 rounded-full border border-hairline bg-surface/85 px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action">
            <Search aria-hidden className="size-4 shrink-0 text-ink-muted" />
            <span className="sr-only">Rechercher dans le back-office</span>
            <input
              type="search"
              name="q"
              placeholder="Rechercher un patient, une pharmacie…"
              className="type-body-small min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-muted focus-visible:outline-none"
            />
          </label>
        </form>
      }
      stripTrailing={
        <Link
          href="/admin/alertes"
          aria-label={hasAlerts ? 'Alertes, nouvelles alertes en attente' : 'Alertes'}
          className="relative flex size-11 items-center justify-center rounded-full border border-hairline bg-surface/85 text-ink"
        >
          <Bell aria-hidden className="size-4.5" />
          {hasAlerts && (
            <span aria-hidden className="absolute top-2.5 right-2.5 size-2 rounded-full bg-error" />
          )}
        </Link>
      }
    >
      {children}
    </DashboardFrame>
  );
}

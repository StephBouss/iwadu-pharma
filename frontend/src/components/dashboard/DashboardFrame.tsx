import type { ReactNode } from 'react';
import { DashboardMobileNav } from './DashboardMobileNav';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopStrip } from './DashboardTopStrip';
import type { DashboardNavItem } from './types';

// Cadre commun des espaces (back-office, Mon espace), d'après la maquette
// « Admin – Tableau de bord » : barre latérale en dégradé sur ordinateur,
// bandeau fin, pastilles de navigation sur mobile, contenu sur fond ivoire →
// menthe pâle (classe `dashboard`, qui passe aussi les panneaux en verre clair).

export interface DashboardFrameProps {
  homeHref: string;
  homeLabel: string;
  caption: string;
  navLabel: string;
  items: readonly DashboardNavItem[];
  secondary?: readonly DashboardNavItem[] | undefined;
  activeId: string | null;
  userName: string;
  userRole: string;
  stripLeading?: ReactNode;
  stripTrailing?: ReactNode;
  children: ReactNode;
}

export function DashboardFrame({
  homeHref,
  homeLabel,
  caption,
  navLabel,
  items,
  secondary,
  activeId,
  userName,
  userRole,
  stripLeading,
  stripTrailing,
  children,
}: DashboardFrameProps) {
  return (
    <div className="dashboard relative flex min-h-dvh text-ink">
      <DashboardSidebar
        homeHref={homeHref}
        homeLabel={homeLabel}
        caption={caption}
        navLabel={navLabel}
        items={items}
        secondary={secondary}
        activeId={activeId}
        userName={userName}
        userRole={userRole}
        className="sticky top-0 hidden h-dvh lg:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopStrip
          homeHref={homeHref}
          homeLabel={homeLabel}
          leading={stripLeading}
          trailing={stripTrailing}
        />
        <main
          id="contenu"
          className="mx-auto flex w-full max-w-350 min-w-0 flex-1 flex-col gap-6 px-4 py-6 lg:gap-8 lg:px-10 lg:py-10"
        >
          <DashboardMobileNav
            label={navLabel}
            items={[...items, ...(secondary ?? [])]}
            activeId={activeId}
            className="lg:hidden"
          />
          {children}
        </main>
      </div>
    </div>
  );
}

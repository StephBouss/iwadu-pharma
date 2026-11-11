import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { LogoutAction } from './LogoutAction';
import type { DashboardNavItem } from './types';

// Maquette « Admin – Tableau de bord » : barre latérale de 280 px en dégradé
// vert, halos menthe, rubrique active en verre clair. Le dégradé va du vert
// profond au vert d'action (et non jusqu'au vert Iwadu) : le texte blanc y
// garde un contraste AA. Ordinateur seulement ; sur mobile, DashboardMobileNav.

export interface DashboardSidebarProps {
  homeHref: string;
  homeLabel: string;
  /** Sous le logo, ex. « Back-office ». */
  caption: string;
  navLabel: string;
  items: readonly DashboardNavItem[];
  secondary?: readonly DashboardNavItem[] | undefined;
  activeId: string | null;
  userName: string;
  userRole: string;
  className?: string | undefined;
}

function NavLink({ item, active }: { item: DashboardNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-[0.9375rem] leading-5 font-semibold transition-colors',
        active
          ? 'border-surface/20 bg-surface/15 text-surface backdrop-blur-md'
          : 'border-transparent text-surface/85 hover:bg-surface/10 hover:text-surface',
      )}
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      {item.label}
    </Link>
  );
}

export function DashboardSidebar({
  homeHref,
  homeLabel,
  caption,
  navLabel,
  items,
  secondary,
  activeId,
  userName,
  userRole,
  className,
}: DashboardSidebarProps) {
  return (
    <aside
      className={cn(
        'relative w-70 shrink-0 flex-col overflow-hidden bg-linear-to-b from-deep to-action px-5 pt-8 pb-6 text-surface print:hidden',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -right-15 size-75 rounded-full bg-radial from-mint/15 to-transparent to-70%" />
        <div className="absolute -bottom-25 -left-20 size-70 rounded-full bg-radial from-mint/10 to-transparent to-70%" />
      </div>

      <div className="relative mb-8 flex flex-col gap-2 px-1">
        <Link href={homeHref} aria-label={homeLabel} className="self-start">
          <Logo variant="horizontal-blanc" height={32} />
        </Link>
        <p className="type-caption text-surface/75">{caption}</p>
      </div>

      <nav
        aria-label={navLabel}
        className="relative -mx-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1 [scrollbar-width:thin]"
      >
        {items.map((item) => (
          <NavLink key={item.id} item={item} active={item.id === activeId} />
        ))}
        {secondary && secondary.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 border-t border-surface/15 pt-3">
            {secondary.map((item) => (
              <NavLink key={item.id} item={item} active={item.id === activeId} />
            ))}
          </div>
        )}
      </nav>

      <div className="relative mt-4 flex flex-col gap-3 border-t border-surface/15 pt-5">
        <div className="flex items-center gap-3 px-1">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface/20">
            <User aria-hidden className="size-4.5" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm leading-5 font-semibold">{userName}</span>
            <span className="type-caption truncate text-surface/75">{userRole}</span>
          </span>
        </div>
        <LogoutAction className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-surface/20 bg-surface/15 px-3 text-sm font-semibold text-surface transition-colors hover:bg-surface/25 disabled:opacity-60">
          <LogOut aria-hidden className="size-4" />
          Déconnexion
        </LogoutAction>
      </div>
    </aside>
  );
}

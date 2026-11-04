import Link from 'next/link';
import { User } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { ADMIN_NAV, ADMIN_NAV_SECONDARY, type AdminSection } from './nav';

// Maquette Banani « Admin Sidebar » : barre latérale sombre (encre en verre),
// rubrique active en menthe — la menthe n'est permise que sur fond sombre.
// Ordinateur seulement ; sur mobile, voir AdminMobileNav.

export interface AdminSidebarProps {
  active: AdminSection;
  adminName: string;
  adminRole: string;
  className?: string | undefined;
}

export function AdminSidebar({ active, adminName, adminRole, className }: AdminSidebarProps) {
  return (
    <aside
      className={cn(
        'flex w-55 shrink-0 flex-col border-r border-mint/15 bg-ink/92 backdrop-blur-glass',
        className,
      )}
    >
      <div className="flex items-center border-b border-mint/12 px-5 py-6">
        <Link href="/admin" aria-label="Iwadu Pharma, tableau de bord">
          <Logo variant="horizontal-blanc" height={32} />
        </Link>
      </div>

      <nav aria-label="Back-office" className="flex flex-1 flex-col gap-1 px-3 pt-4">
        {ADMIN_NAV.map(({ id, label, href, icon: Icon }) => {
          const isActive = id === active;
          return (
            <Link
              key={id}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'type-caption flex items-center gap-3 rounded-card border-l-3 px-3 py-2.5 transition-colors',
                isActive
                  ? 'border-mint bg-mint/15 text-mint'
                  : 'border-transparent text-surface/65 hover:bg-surface/5 hover:text-surface',
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-mint/12 px-3 pt-4 pb-4">
        {ADMIN_NAV_SECONDARY.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="type-caption flex items-center gap-3 rounded-card px-3 py-2.5 text-surface/50 transition-colors hover:bg-surface/5 hover:text-surface"
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
        <div className="mt-2 flex items-center gap-3 rounded-card bg-surface/6 px-3 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action text-surface">
            <User aria-hidden className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[0.8125rem] leading-[1.125rem] font-semibold text-surface">
              {adminName}
            </span>
            <span className="truncate text-[0.8125rem] leading-[1.125rem] text-surface/45">
              {adminRole}
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
}

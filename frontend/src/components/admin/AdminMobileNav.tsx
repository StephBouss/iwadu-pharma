import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ADMIN_NAV, type AdminSection } from './nav';

// Navigation du back-office sur mobile et tablette (la maquette Banani est
// en version ordinateur seulement) : rubriques en pastilles de 48 px, qui
// défilent horizontalement. Rubrique active : encre et menthe, comme la
// barre latérale. Aucun JavaScript nécessaire.

export interface AdminMobileNavProps {
  active: AdminSection;
  className?: string | undefined;
}

export function AdminMobileNav({ active, className }: AdminMobileNavProps) {
  return (
    <nav
      aria-label="Back-office"
      className={cn('-mx-4 overflow-x-auto px-4 [scrollbar-width:none]', className)}
    >
      <ul className="flex w-max gap-2">
        {ADMIN_NAV.map(({ id, label, href, icon: Icon }) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'type-caption flex h-12 items-center gap-2 rounded-full border px-4 whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-ink bg-ink text-mint'
                    : 'border-surface/60 bg-surface/72 text-ink-muted hover:text-ink',
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

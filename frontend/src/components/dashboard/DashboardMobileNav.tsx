import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { DashboardNavItem } from './types';

// Navigation d'un espace sur mobile et tablette (la maquette est en version
// ordinateur) : rubriques en pastilles de 44 px qui défilent, rubrique active
// en vert d'action. Aucun JavaScript nécessaire.

export function DashboardMobileNav({
  label,
  items,
  activeId,
  className,
}: {
  label: string;
  items: readonly DashboardNavItem[];
  activeId: string | null;
  className?: string | undefined;
}) {
  return (
    <nav
      aria-label={label}
      className={cn('-mx-4 overflow-x-auto px-4 [scrollbar-width:none] print:hidden', className)}
    >
      <ul className="flex w-max gap-2">
        {items.map(({ id, label: text, href, icon: Icon }) => {
          const active = id === activeId;
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'type-caption flex h-11 items-center gap-2 rounded-full border px-4 font-semibold whitespace-nowrap transition-colors',
                  active
                    ? 'border-action bg-action text-surface'
                    : 'border-surface/60 bg-surface/85 text-ink-muted shadow-glass hover:text-ink',
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

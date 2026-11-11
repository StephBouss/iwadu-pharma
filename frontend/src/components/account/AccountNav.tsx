'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Navigation de l'espace (patient, pharmacie, administration) : pastilles
// défilantes sur mobile, colonne de verre sur ordinateur.

export interface NavItem {
  href: string;
  label: string;
}

export function AccountNav({ items, label }: { items: readonly NavItem[]; label: string }) {
  const pathname = usePathname();
  const root = items[0]?.href ?? '';
  const isActive = (href: string) =>
    href === root ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav
      aria-label={label}
      className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-2 lg:flex-col lg:gap-1 lg:rounded-card lg:border lg:border-surface/60 lg:bg-surface/72 lg:p-2 lg:shadow-glass lg:backdrop-blur-glass">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'type-label flex h-11 items-center rounded-full px-4 whitespace-nowrap transition-colors lg:rounded-field',
                  active
                    ? 'bg-action text-surface'
                    : 'border border-hairline bg-surface/80 text-ink hover:border-action lg:border-transparent lg:bg-transparent lg:hover:bg-mint-soft/60',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

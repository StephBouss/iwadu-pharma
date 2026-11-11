'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LifeBuoy } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { AccountLink } from './AccountLink';
import { MobileMenu } from './MobileMenu';
import { SITE_NAV } from './site-nav';

// En-tête du site. `light` : panneau de verre sur fond ivoire ; `dark` :
// verre transparent sur le bandeau dégradé (maquettes Banani). Aucun bouton
// principal : l'action principale appartient à la page.

export function SiteHeader({
  tone = 'light',
  className,
}: {
  tone?: 'light' | 'dark';
  className?: string | undefined;
}) {
  const pathname = usePathname();
  const dark = tone === 'dark';
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-2 rounded-card py-1 pr-1 pl-4',
        dark
          ? 'border border-surface/15 bg-surface/8 supports-backdrop-filter:backdrop-blur-[24px]'
          : 'border border-surface/60 bg-surface/92 shadow-glass supports-backdrop-filter:bg-surface/72 supports-backdrop-filter:backdrop-blur-glass',
        className,
      )}
    >
      <Link href="/" aria-label="Iwadu Pharma, accueil" className="flex h-12 shrink-0 items-center">
        <Logo variant={dark ? 'horizontal-blanc' : 'horizontal-couleur'} height={32} priority />
      </Link>
      <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
        {SITE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-12 items-center rounded-full px-3 text-sm font-semibold transition-colors',
                dark
                  ? 'text-surface/85 hover:text-surface aria-[current=page]:text-mint'
                  : 'text-ink-muted hover:text-action aria-[current=page]:text-action',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-1">
        <Link
          href="/aide"
          aria-current={pathname === '/aide' ? 'page' : undefined}
          className={cn(
            'hidden h-12 items-center gap-1.5 rounded-full px-3 text-sm font-semibold lg:flex',
            dark ? 'text-mint hover:text-surface' : 'text-action hover:underline',
          )}
        >
          <LifeBuoy aria-hidden className="size-4" />
          FAQ
        </Link>
        <AccountLink tone={tone} />
        <MobileMenu tone={tone} />
      </div>
    </header>
  );
}

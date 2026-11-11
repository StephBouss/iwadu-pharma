'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { LifeBuoy, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SITE_NAV } from './site-nav';

// Menu du site sur mobile (< lg) : un <details> natif, utilisable sans
// JavaScript, refermé à chaque changement de page.

export function MobileMenu({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  return (
    <details ref={ref} className="group relative lg:hidden">
      <summary
        className={cn(
          'flex size-12 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden',
          tone === 'dark' ? 'text-surface' : 'text-ink',
        )}
      >
        <Menu aria-hidden className="size-6 group-open:hidden" />
        <X aria-hidden className="hidden size-6 group-open:block" />
        <span className="sr-only">Menu</span>
      </summary>
      <nav
        aria-label="Menu principal"
        className="absolute top-14 right-0 z-30 flex w-64 flex-col rounded-card border border-hairline bg-surface p-2 text-ink shadow-glass"
      >
        <Link
          href="/ordonnance"
          className="flex h-12 items-center rounded-field px-4 type-body-strong text-action hover:bg-ivory"
        >
          Mon ordonnance
        </Link>
        {SITE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
            className="flex h-12 items-center rounded-field px-4 type-body text-ink hover:bg-ivory aria-[current=page]:font-semibold aria-[current=page]:text-action"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/aide"
          aria-current={pathname === '/aide' ? 'page' : undefined}
          className="flex h-12 items-center gap-2 rounded-field px-4 type-body text-action hover:bg-ivory aria-[current=page]:font-semibold"
        >
          <LifeBuoy aria-hidden className="size-4" />
          FAQ
        </Link>
        <Link
          href="/pharmacies"
          className="mt-1 flex h-12 items-center rounded-field border-t border-hairline px-4 type-body-small text-ink-muted hover:bg-ivory"
        >
          Vous êtes pharmacien ?
        </Link>
      </nav>
    </details>
  );
}

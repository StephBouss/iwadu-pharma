import type { ReactNode } from 'react';
import Link from 'next/link';
import { LifeBuoy, LogOut } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { LogoutAction } from './LogoutAction';

// Maquette « Admin – Tableau de bord » : bandeau fin et translucide en haut de
// la colonne principale, liens FAQ et Déconnexion à droite. Sur mobile, le
// symbole de la marque remplace la barre latérale masquée.

export function DashboardTopStrip({
  homeHref,
  homeLabel,
  leading,
  trailing,
}: {
  homeHref: string;
  homeLabel: string;
  /** À gauche, à partir de la tablette (ex. la recherche du back-office). */
  leading?: ReactNode;
  /** Avant la FAQ (ex. la cloche des alertes). */
  trailing?: ReactNode;
}) {
  return (
    <div className="border-b border-mint/20 bg-surface/40 px-4 backdrop-blur-xl print:hidden lg:px-10">
      <div className="mx-auto flex max-w-350 items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={homeHref} aria-label={homeLabel} className="lg:hidden">
            <Logo variant="symbole-couleur" height={36} />
          </Link>
          {leading && <div className="hidden md:block">{leading}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {trailing}
          <Link
            href="/aide"
            className="flex min-h-11 items-center gap-2 rounded-full px-2 font-semibold text-action hover:underline"
          >
            <LifeBuoy aria-hidden className="size-4.5" />
            FAQ
          </Link>
          <span aria-hidden className="h-6 w-px bg-mint/40" />
          <LogoutAction className="flex min-h-11 items-center gap-2 rounded-full px-2 font-semibold text-action hover:underline disabled:opacity-60">
            <LogOut aria-hidden className="size-4.5" />
            <span className="hidden sm:inline">Déconnexion</span>
            <span className="sr-only sm:hidden">Déconnexion</span>
          </LogoutAction>
        </div>
      </div>
    </div>
  );
}

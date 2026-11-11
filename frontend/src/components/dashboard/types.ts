import type { LucideIcon } from 'lucide-react';

/** Une rubrique de la barre latérale d'un espace (back-office, Mon espace). */
export interface DashboardNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Rubrique active : correspondance exacte pour la racine, préfixe sinon. */
export function activeNavId(
  pathname: string,
  items: readonly DashboardNavItem[],
  rootHref: string,
): string | null {
  if (pathname === rootHref) return items.find((n) => n.href === rootHref)?.id ?? null;
  const hit = items
    .filter((n) => n.href !== rootHref && !n.href.includes('?'))
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return hit?.id ?? null;
}

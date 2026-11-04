import Link from 'next/link';
import { Bell, Search, User } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils';

// Maquette Banani « Admin Top Bar » : titre et date, recherche, alertes,
// compte. Sur mobile, le symbole remplace la barre latérale masquée ; la
// recherche et les alertes apparaissent dès la tablette.

export interface AdminTopBarProps {
  title: string;
  /** Date déjà rédigée, ex. « Mercredi 4 novembre 2026 ». */
  date: string;
  /** Pastille rouge sur la cloche : des alertes attendent. */
  hasAlerts?: boolean | undefined;
  className?: string | undefined;
}

export function AdminTopBar({ title, date, hasAlerts = false, className }: AdminTopBarProps) {
  return (
    <GlassPanel
      as="header"
      className={cn(
        'flex items-center justify-between gap-3 py-2 pr-2 pl-4 lg:px-6 lg:py-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Logo variant="symbole-couleur" height={32} className="lg:hidden" />
        <div className="min-w-0">
          <h1 className="type-title-2 text-ink">{title}</h1>
          <p className="type-caption text-ink-muted">{date}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <form role="search" action="/admin/recherche" className="hidden md:block">
          <label className="flex h-10 w-55 items-center gap-2 rounded-full border border-hairline bg-surface/85 px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action">
            <Search aria-hidden className="size-4 shrink-0 text-ink-muted" />
            <span className="sr-only">Rechercher dans le back-office</span>
            <input
              type="search"
              name="q"
              placeholder="Rechercher…"
              className="type-body-small min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-muted focus-visible:outline-none"
            />
          </label>
        </form>
        <Link
          href="/admin/alertes"
          aria-label={hasAlerts ? 'Alertes, nouvelles alertes en attente' : 'Alertes'}
          className="relative hidden size-10 items-center justify-center rounded-full border border-hairline bg-surface/85 text-ink md:flex"
        >
          <Bell aria-hidden className="size-4" />
          {hasAlerts && (
            <span aria-hidden className="absolute top-2 right-2 size-2 rounded-full bg-error" />
          )}
        </Link>
        <Link
          href="/compte"
          aria-label="Mon compte"
          className="flex size-12 items-center justify-center rounded-full lg:size-10"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-action text-surface">
            <User aria-hidden className="size-4" />
          </span>
        </Link>
      </div>
    </GlassPanel>
  );
}

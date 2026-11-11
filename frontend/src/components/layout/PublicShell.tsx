import type { ReactNode } from 'react';
import { BgShapes } from '@/components/brand/BgShapes';
import { HeroBanner } from '@/components/brand/HeroBanner';
import { cn } from '@/lib/utils';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

// Enveloppe des pages publiques et des espaces : en-tête, contenu, pied de
// page.
//   • sans `hero` : fond ivoire décoré, en-tête de verre clair ;
//   • avec `hero` : bandeau dégradé des maquettes Banani, en-tête de verre
//     transparent, puis le contenu sur fond ivoire.
// Largeurs : patient (480 px, charte), reading (768 px), wide (1152 px).

const WIDTHS = {
  patient: 'max-w-patient',
  reading: 'max-w-3xl',
  wide: 'max-w-6xl',
} as const;

export function PublicShell({
  children,
  width = 'patient',
  footer = true,
  hero,
  heroClassName,
  className,
}: {
  children?: ReactNode;
  width?: keyof typeof WIDTHS;
  footer?: boolean;
  /** Contenu du bandeau dégradé (titre, chiffres…), sous l'en-tête. */
  hero?: ReactNode;
  heroClassName?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      {hero ? (
        <HeroBanner>
          <div className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-8">
            <SiteHeader tone="dark" />
          </div>
          <div
            className={cn(
              'mx-auto w-full px-4 pt-8 pb-10 md:px-8 md:pt-12 md:pb-14',
              WIDTHS[width],
              heroClassName,
            )}
          >
            {hero}
          </div>
        </HeroBanner>
      ) : (
        <>
          <BgShapes />
          <div className="relative mx-auto w-full max-w-6xl px-4 pt-4">
            <SiteHeader />
          </div>
        </>
      )}
      <main
        id="contenu"
        className={cn(
          'relative mx-auto flex w-full flex-1 flex-col gap-4 px-4 pt-6 pb-6',
          hero && 'md:px-8',
          WIDTHS[width],
          className,
        )}
      >
        {children}
      </main>
      {footer && <SiteFooter />}
    </div>
  );
}

/** Mention des données fictives (critère A3 : « Démonstration »). */
export function DemoNotice({
  show = true,
  tone = 'light',
  className,
}: {
  show?: boolean;
  tone?: 'light' | 'dark';
  className?: string | undefined;
}) {
  if (!show) return null;
  return (
    <p
      className={cn(
        'type-caption',
        tone === 'dark' ? 'text-surface/75' : 'text-ink-muted',
        className,
      )}
    >
      Démonstration · exemple fictif, données inventées.
    </p>
  );
}

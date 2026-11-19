'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Un point avec son explication dans une petite bulle, discrète : elle
// s'ouvre au survol (après un court délai, pour ne pas clignoter quand la
// souris passe), au clavier (focus) et au toucher (appui), et se ferme en
// sortant, avec Échap ou en touchant ailleurs. Elle ne déplace rien et ne
// bloque rien : posée au-dessus du contenu, sans fond qui assombrit.
// Le texte de la bulle est relié au point (aria-describedby) : les lecteurs
// d'écran le lisent sans l'ouvrir.

export function HintPoint({
  children,
  hint,
  tone = 'light',
  className,
}: {
  children: ReactNode;
  hint: ReactNode;
  /**
   * `dark` : point posé sur un fond vert foncé ; `warning` : bulle rouge, pour
   * un problème ou une limite (colonne « Avant »).
   */
  tone?: 'light' | 'dark' | 'warning';
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLSpanElement>(null);

  function later(next: boolean, ms: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), ms);
  }

  useEffect(() => {
    if (!open) return;
    function outside(e: PointerEvent) {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <span
      ref={root}
      className={cn('relative inline', className)}
      onMouseEnter={() => later(true, 180)}
      onMouseLeave={() => later(false, 120)}
    >
      <button
        type="button"
        aria-describedby={id}
        // Toucher : ouvre (le focus l’a souvent déjà fait) ; on ferme ailleurs.
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className={cn(
          'cursor-help text-left [font:inherit] underline decoration-dotted underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2',
          tone === 'dark'
            ? 'decoration-surface/45 focus-visible:outline-mint'
            : tone === 'warning'
              ? 'decoration-error/45 focus-visible:outline-error'
              : 'decoration-ink-muted/45 focus-visible:outline-action',
        )}
      >
        {children}
      </button>
      <span
        role="tooltip"
        id={id}
        className={cn(
          'type-body-small pointer-events-none absolute top-full left-0 z-30 mt-2 block w-72 max-w-[min(18rem,calc(100vw-3rem))] rounded-field px-3.5 py-2.5 font-normal shadow-glass-lg transition-[opacity,translate] duration-150 motion-reduce:transition-none',
          tone === 'dark'
            ? 'bg-surface text-ink'
            : tone === 'warning'
              ? 'bg-error text-surface'
              : 'bg-ink text-surface',
          open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0',
        )}
      >
        {hint}
      </span>
    </span>
  );
}

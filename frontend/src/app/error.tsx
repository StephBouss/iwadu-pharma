'use client';

import { RotateCw } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button, ButtonLink } from '@/components/ui/Button';

// Erreur inattendue dans une page. On n'affiche jamais le message technique
// (il peut révéler des détails internes) ; seulement la référence, utile au
// support pour retrouver l'erreur dans Sentry.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-patient flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo variant="symbole-couleur" height={48} />
      <div className="flex flex-col gap-2">
        <h1 className="type-title-1 text-ink">Une erreur est survenue</h1>
        <p className="type-body text-ink-muted">
          Réessayez dans un instant. Si le problème continue, revenez à l’accueil.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Button onClick={reset} fullWidth leadingIcon={<RotateCw aria-hidden />}>
          Réessayer
        </Button>
        <ButtonLink href="/" variant="secondary" fullWidth>
          Revenir à l’accueil
        </ButtonLink>
      </div>
      {error.digest && <p className="type-caption text-ink-muted">Référence : {error.digest}</p>}
    </main>
  );
}

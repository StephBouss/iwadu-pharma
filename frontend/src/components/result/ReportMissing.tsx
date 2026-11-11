'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { errorMessage, publicApi } from '@/lib/client/session';

// Garantie « Trajet utile » : la pharmacie affichée comme ayant tout ne
// l'avait pas. Signalée dans le délai, une recherche est rendue en crédit
// (compte nécessaire pour la recevoir).

export function ReportMissing({
  token,
  slug,
  loggedIn,
  hours,
}: {
  token: string;
  slug: string;
  loggedIn: boolean;
  hours: number;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const self = `/resultat/${token}`;

  async function report() {
    setState('sending');
    setError(null);
    try {
      await publicApi(`/api/searches/${token}/report`, {
        method: 'POST',
        body: { pharmacySlug: slug },
      });
      setState('done');
    } catch (err) {
      setError(errorMessage(err, 'Le signalement n’a pas abouti. Réessayez.'));
      setState('idle');
    }
  }

  return (
    <GlassPanel className="flex flex-col gap-3 p-5">
      <p className="type-body-strong flex items-start gap-2 text-ink">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-available" />
        Médicaments absents à votre arrivée ?
      </p>
      <p className="type-body-small text-ink-muted">
        Signalez-le sous {hours} h : une recherche vous est rendue en crédit.
      </p>
      {state === 'done' ? (
        <Message
          tone="success"
          title="Merci. Une recherche vous est rendue : elle est dans Mon espace."
        />
      ) : loggedIn ? (
        <Button
          variant="secondary"
          size="sm"
          loading={state === 'sending'}
          onClick={() => void report()}
        >
          Signaler un trajet inutile
        </Button>
      ) : (
        <Link
          href={`/connexion?next=${encodeURIComponent(self)}`}
          className="type-label min-h-11 text-action hover:underline"
        >
          Se connecter pour signaler
        </Link>
      )}
      {error && <Message tone="error" title={error} />}
    </GlassPanel>
  );
}

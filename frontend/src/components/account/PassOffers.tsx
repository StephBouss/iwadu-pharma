'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { PaymentDialog } from '@/components/payment/PaymentDialog';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { formatFcfa } from '@/lib/format';
import type { Offer } from '@/lib/offer-types';
import { cn } from '@/lib/utils';

// Choix du Pass (cartes radio) puis paiement Mobile Money dans la fenêtre de
// paiement. Le Pass n'est activé qu'à la confirmation vérifiée du paiement ;
// s'il en existe déjà un, le nouveau commence à sa fin.

export function PassOffers({
  offers,
  defaultPhone,
  initial,
  simulated,
}: {
  offers: Offer[];
  defaultPhone: string | null;
  initial: Offer['purpose'] | null;
  simulated: boolean;
}) {
  const [selected, setSelected] = useState<Offer['purpose'] | null>(
    offers.some((o) => o.purpose === initial) ? initial : null,
  );
  const [paying, setPaying] = useState(false);
  const offer = offers.find((o) => o.purpose === selected) ?? null;
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="grid gap-3 md:grid-cols-3">
        <legend className="mb-4 font-display text-xl leading-7 font-bold text-brand">
          Choisissez votre Pass
        </legend>
        {offers.map((o) => {
          const active = o.purpose === selected;
          return (
            <label key={o.purpose} className="relative flex cursor-pointer">
              <input
                type="radio"
                name="pass"
                value={o.purpose}
                checked={active}
                onChange={() => setSelected(o.purpose)}
                className="peer sr-only"
              />
              <GlassPanel
                className={cn(
                  'flex w-full flex-col gap-3 p-5 transition-shadow peer-focus-visible:ring-2 peer-focus-visible:ring-action',
                  active && 'ring-2 ring-action',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="type-title-3 text-ink">{o.title}</span>
                    {o.tagline && <span className="type-caption text-action">{o.tagline}</span>}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                      active ? 'border-action bg-action text-surface' : 'border-outline',
                    )}
                  >
                    {active && <Check className="size-3.5" />}
                  </span>
                </div>
                <p>
                  <span className="type-amount text-ink">{formatFcfa(o.price)}</span>{' '}
                  <span className="type-body-small text-ink-muted">{o.period}</span>
                </p>
                <p className="type-body-small text-ink">
                  <strong>{o.searches}</strong>
                  {o.perSearch ? `, soit ${formatFcfa(o.perSearch)} la recherche` : ''}
                  {o.rule ? <span className="block text-ink-muted">{o.rule}</span> : null}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {o.points.map((p) => (
                    <li key={p} className="type-body-small flex gap-2 text-ink">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
                      {p}
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            </label>
          );
        })}
      </fieldset>

      <Button
        fullWidth
        size="lg"
        disabled={!offer}
        onClick={() => setPaying(true)}
        className="md:max-w-patient"
      >
        {offer ? `Payer ${formatFcfa(offer.price)} · ${offer.title}` : 'Choisissez un Pass'}
      </Button>

      {offer && (
        <PaymentDialog
          open={paying}
          onClose={() => setPaying(false)}
          purpose={offer.purpose}
          amount={offer.price}
          title={offer.title}
          description={[offer.searches, offer.rule, offer.period].filter(Boolean).join(' · ')}
          defaultPhone={defaultPhone}
          simulated={simulated}
          doneLabel="Voir mon Pass"
          onDone={() => setPaying(false)}
        />
      )}
    </div>
  );
}

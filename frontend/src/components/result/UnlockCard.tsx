'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleCheck, Gift, ShieldCheck } from 'lucide-react';
import { PaymentDialog } from '@/components/payment/PaymentDialog';
import { Button, ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { errorMessage, publicApi } from '@/lib/client/session';
import { formatFcfa, NBSP } from '@/lib/format';
import type { Offer } from '@/lib/offer-types';
import { cn } from '@/lib/utils';

// Carte de déblocage du résultat gratuit (maquette Banani) : ce que l'on
// obtient, le choix de la formule, la garantie, un seul bouton principal.
// Débloquer sans payer quand c'est possible : Pass en cours, première
// ordonnance offerte avec un compte, crédit « Trajet utile ».

type Choice =
  | 'UNLOCK'
  | 'PASS_SOLO'
  | 'PASS_FAMILY'
  | 'PASS_FAMILY_ANNUAL'
  | 'PASS'
  | 'OFFERED'
  | 'CREDIT';

export interface UnlockCardProps {
  token: string;
  completeCount: number;
  partial: boolean;
  offers: Offer[];
  loggedIn: boolean;
  pass: { plan: string; remaining: number | null } | null;
  passBlocked: 'SOLO_EXHAUSTED' | 'DAILY_MAX' | null;
  offered: boolean;
  offerForAccounts: boolean;
  credits: number;
  linkHours: number | null;
  guarantee: string | null;
  defaultPhone: string | null;
  simulated: boolean;
}

export function UnlockCard({
  token,
  completeCount,
  partial,
  offers,
  loggedIn,
  pass,
  passBlocked,
  offered,
  offerForAccounts,
  credits,
  linkHours,
  guarantee,
  defaultPhone,
  simulated,
}: UnlockCardProps) {
  const router = useRouter();
  const unlock = offers.find((o) => o.purpose === 'UNLOCK') ?? null;
  const passOffers = offers.filter((o) => o.purpose !== 'UNLOCK');
  const free: { value: Choice; label: string; sub: string }[] = [
    ...(pass
      ? [
          {
            value: 'PASS' as const,
            label: `Mon Pass ${pass.plan === 'SOLO' ? 'Solo' : 'Famille'}`,
            sub:
              pass.remaining === null
                ? 'Inclus dans votre Pass'
                : `Inclus : il vous reste ${pass.remaining} recherche${pass.remaining > 1 ? 's' : ''}`,
          },
        ]
      : []),
    ...(offered
      ? [
          {
            value: 'OFFERED' as const,
            label: 'Ordonnance offerte',
            sub: 'Votre première ordonnance complète, avec votre compte',
          },
        ]
      : []),
    ...(credits > 0
      ? [
          {
            value: 'CREDIT' as const,
            label: 'Utiliser un crédit',
            sub: `${credits} crédit${credits > 1 ? 's' : ''} « Trajet utile » disponible${credits > 1 ? 's' : ''}`,
          },
        ]
      : []),
  ];
  const initial: Choice | null =
    free[0]?.value ??
    (passBlocked === 'SOLO_EXHAUSTED' && passOffers.some((o) => o.purpose === 'PASS_FAMILY')
      ? 'PASS_FAMILY'
      : unlock
        ? 'UNLOCK'
        : (passOffers[0]?.purpose ?? null));
  const [choice, setChoice] = useState<Choice | null>(initial);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const self = `/resultat/${token}`;
  const offer = offers.find((o) => o.purpose === choice) ?? null;
  const isFree = choice === 'PASS' || choice === 'OFFERED' || choice === 'CREDIT';
  const needsAccount = offer?.requiresAccount && !loggedIn;
  const count = completeCount > 0 ? completeCount : null;

  async function redeem() {
    if (!choice || !isFree || busy) return;
    setBusy(true);
    setError(null);
    try {
      await publicApi(`/api/searches/${token}/redeem`, { method: 'POST', body: { with: choice } });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, 'Le déblocage n’a pas abouti. Réessayez.'));
      setBusy(false);
    }
  }

  const gets = [
    count
      ? `Les noms et adresses des ${count} pharmacies qui ont tout`
      : 'Les noms et adresses des pharmacies',
    'Le prix exact de chaque médicament, et la moins chère',
    'Votre reste à payer avec votre assurance',
    'L’itinéraire et le téléphone',
    ...(partial ? ['Ce qui manque, et où le trouver'] : []),
    linkHours ? `Un lien à jour pendant ${linkHours} h, à partager` : 'Un lien à partager',
  ];

  const ctaLabel = isFree
    ? count
      ? `Voir les ${count} pharmacies`
      : 'Voir les pharmacies'
    : offer
      ? offer.purpose === 'UNLOCK'
        ? count
          ? `Voir les ${count} pharmacies pour ${formatFcfa(offer.price)}`
          : `Débloquer pour ${formatFcfa(offer.price)}`
        : `Prendre le ${offer.title} · ${formatFcfa(offer.price)}`
      : 'Débloquer';

  return (
    <GlassPanel radius="sheet" className="flex flex-col gap-6 p-5 md:p-8 lg:sticky lg:top-6">
      <h2 className="type-title-2 text-brand">
        {unlock
          ? `Pour ${formatFcfa(unlock.price)}, vous obtenez${NBSP}:`
          : `En débloquant, vous obtenez${NBSP}:`}
      </h2>
      <ul className="flex flex-col gap-3">
        {gets.map((g) => (
          <li key={g} className="type-body flex items-start gap-3 text-ink">
            <CircleCheck aria-hidden className="mt-0.5 size-4.5 shrink-0 text-available" />
            {g}
          </li>
        ))}
      </ul>
      <p className="type-body-strong border-b border-mint/20 pb-6 text-center text-action">
        Un seul déplacement, au bon endroit.
      </p>

      {passBlocked === 'SOLO_EXHAUSTED' && (
        <Message tone="info" title="Votre Pass Solo est épuisé.">
          Débloquez cette ordonnance à l’acte, ou passez au Pass Famille.
        </Message>
      )}
      {passBlocked === 'DAILY_MAX' && (
        <Message tone="info" title="Vous avez atteint les recherches du jour de votre Pass.">
          Revenez demain ou contactez-nous.
        </Message>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Choisissez comment débloquer</legend>
        {[
          ...free,
          ...(unlock
            ? [
                {
                  value: 'UNLOCK' as Choice,
                  label: `Cette ordonnance · ${formatFcfa(unlock.price)}`,
                  sub: 'Sans compte',
                },
              ]
            : []),
          ...passOffers.map((o) => ({
            value: o.purpose as Choice,
            label: `${o.title} · ${formatFcfa(o.price)}`,
            sub: [o.searches, o.perSearch ? `${formatFcfa(o.perSearch)} la recherche` : o.rule]
              .filter(Boolean)
              .join(' · '),
          })),
        ].map((opt) => (
          <label key={opt.value} className="flex cursor-pointer">
            <input
              type="radio"
              name="formule"
              value={opt.value}
              checked={choice === opt.value}
              onChange={() => {
                setChoice(opt.value);
                setError(null);
              }}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex w-full flex-col gap-0.5 rounded-field border p-4 text-left peer-focus-visible:ring-2 peer-focus-visible:ring-action',
                choice === opt.value
                  ? 'border-2 border-action bg-action/10'
                  : 'border-mint/30 bg-mint/5 hover:border-action/50',
              )}
            >
              <span className="type-body-strong flex items-center gap-2 text-ink">
                {choice === opt.value && (
                  <CircleCheck aria-hidden className="size-4 shrink-0 text-action" />
                )}
                {opt.label}
              </span>
              {opt.sub && <span className="type-body-small text-ink-muted">{opt.sub}</span>}
            </span>
          </label>
        ))}
      </fieldset>

      {guarantee && (
        <p className="type-body-small flex items-start gap-3 rounded-field border border-mint/25 bg-available-soft/30 p-4 text-ink">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-available" />
          {guarantee}
        </p>
      )}

      {error && <Message tone="error" title={error} />}

      {needsAccount ? (
        <ButtonLink href={`/inscription?next=${encodeURIComponent(self)}`} fullWidth size="lg">
          Créer un compte pour prendre le Pass
        </ButtonLink>
      ) : (
        <Button
          fullWidth
          size="lg"
          loading={busy}
          disabled={!choice}
          onClick={() => (isFree ? void redeem() : setPaying(true))}
        >
          {ctaLabel}
        </Button>
      )}

      {!loggedIn && offerForAccounts && (
        <p className="type-body-small flex items-start gap-2 text-ink">
          <Gift aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
          <span>
            <Link
              href={`/inscription?next=${encodeURIComponent(self)}`}
              className="font-semibold text-action hover:underline"
            >
              Créez un compte gratuit
            </Link>{' '}
            : votre première ordonnance complète est offerte.
          </span>
        </p>
      )}

      {offer && (
        <PaymentDialog
          open={paying}
          onClose={() => setPaying(false)}
          purpose={offer.purpose}
          amount={offer.price}
          title={offer.purpose === 'UNLOCK' ? 'Cette ordonnance' : offer.title}
          description={
            offer.purpose === 'UNLOCK'
              ? `Noms et adresses · Prix · Reste à payer estimé${linkHours ? ` · Lien valable ${linkHours} h` : ''}`
              : [
                  offer.searches,
                  offer.rule ??
                    (offer.perSearch ? `${formatFcfa(offer.perSearch)} la recherche` : null),
                  offer.period,
                ]
                  .filter(Boolean)
                  .join(' · ')
          }
          searchToken={token}
          defaultPhone={defaultPhone}
          simulated={simulated}
          loginHref={`/connexion?next=${encodeURIComponent(self)}`}
          doneLabel={
            offer.purpose === 'UNLOCK'
              ? count
                ? `Voir mes ${count} pharmacies`
                : 'Voir mes pharmacies'
              : 'Voir mes pharmacies avec mon Pass'
          }
          onDone={() => setPaying(false)}
        />
      )}
    </GlassPanel>
  );
}

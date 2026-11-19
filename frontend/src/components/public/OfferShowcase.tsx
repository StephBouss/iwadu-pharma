import { Check, Gift, ShieldCheck, Sparkles, User, Zap, type LucideIcon } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { HintPoint } from '@/components/ui/HintPoint';
import { formatFcfa } from '@/lib/format';
import type { Offer, OfferPurpose } from '@/lib/offer-types';
import { cn } from '@/lib/utils';

// Toutes les offres dans une seule section (accueil et page Tarifs) : le
// Pass Famille au centre, en vert profond, mis en avant ; le Pass Solo et
// l'acte de part et d'autre ; les garanties dessous. Chaque avantage a son
// explication dans une bulle discrète. Contenu construit dans
// lib/server/iwadu/offers.ts (méthode « $100M Offers »).

export interface Guarantee {
  text: string;
  hint: string;
}

const ICONS: Record<OfferPurpose, LucideIcon> = {
  UNLOCK: Zap,
  PASS_SOLO: User,
  PASS_FAMILY: Sparkles,
  PASS_FAMILY_ANNUAL: Sparkles,
};

function ctaFor(o: Offer): { href: string; label: string } {
  return o.purpose === 'UNLOCK'
    ? { href: '/ordonnance?depart=photo', label: 'Photographier mon ordonnance' }
    : { href: `/compte/pass?offre=${o.purpose}`, label: `Prendre le ${o.title}` };
}

function OfferCard({
  offer,
  featured,
  annual,
  primaryCta,
}: {
  offer: Offer;
  featured: boolean;
  annual: Offer | undefined;
  primaryCta: boolean;
}) {
  const Icon = ICONS[offer.purpose];
  const cta = ctaFor(offer);
  const tone = featured ? 'dark' : 'light';
  const body = (
    <>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            featured ? 'bg-mint/20 text-mint' : 'bg-action/12 text-action',
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 className="font-display text-2xl leading-tight font-bold">{offer.title}</h3>
          {offer.tagline && (
            <p
              className={cn(
                'font-display text-lg font-semibold',
                featured ? 'text-mint' : 'text-action',
              )}
            >
              {offer.tagline}
            </p>
          )}
        </div>
      </div>

      <p className={cn('type-body-small', featured ? 'text-surface/80' : 'text-ink-muted')}>
        {offer.audience}
      </p>

      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span
            className={cn(
              'font-display text-4xl font-bold tabular-nums',
              featured ? 'text-surface' : 'text-brand',
            )}
          >
            {formatFcfa(offer.price)}
          </span>
          <span className={cn('type-body', featured ? 'text-surface/80' : 'text-ink-muted')}>
            {offer.period}
          </span>
        </p>
        {offer.anchor && (
          <p
            className={cn(
              'type-body-small font-semibold',
              featured ? 'text-mint' : 'text-available',
            )}
          >
            {offer.anchor}
          </p>
        )}
      </div>

      <p
        className={cn(
          'type-body-strong rounded-field px-4 py-3',
          featured ? 'bg-surface/10 text-surface' : 'bg-available-soft/60 text-ink',
        )}
      >
        {offer.promise}
      </p>

      <div className="flex flex-col gap-3">
        <p
          className={cn(
            'type-label uppercase tracking-wide',
            featured ? 'text-mint' : 'text-ink-muted',
          )}
        >
          Ce que vous recevez
        </p>
        <ul className="flex flex-col gap-2.5">
          {offer.benefits.map((b) => (
            <li
              key={b.title}
              className={cn('type-body flex gap-2.5', featured ? 'text-surface' : 'text-ink')}
            >
              <Check
                aria-hidden
                className={cn('mt-1 size-4.5 shrink-0', featured ? 'text-mint' : 'text-available')}
              />
              <span>
                <HintPoint hint={b.detail} tone={tone}>
                  {b.title}
                </HintPoint>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {offer.bonus && (
        <p
          className={cn(
            'type-body-small flex items-start gap-2 rounded-field border p-3.5 font-semibold',
            featured
              ? 'border-mint/30 bg-mint/12 text-mint'
              : 'border-available/25 bg-available-soft/50 text-available',
          )}
        >
          <Gift aria-hidden className="mt-0.5 size-4.5 shrink-0" />
          <span>Offert : {offer.bonus}</span>
        </p>
      )}

      {annual && (
        <p className={cn('type-body-small', featured ? 'text-surface/85' : 'text-ink-muted')}>
          Ou <strong>{annual.title}</strong> : {formatFcfa(annual.price)} en un seul paiement.
          {annual.anchor ? ` ${annual.anchor}` : ''}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <ButtonLink
          href={cta.href}
          fullWidth
          variant={primaryCta ? 'primary' : 'secondary'}
          tone={featured ? 'dark' : 'light'}
        >
          {cta.label}
        </ButtonLink>
        {annual && (
          <ButtonLink
            href={ctaFor(annual).href}
            fullWidth
            variant="ghost"
            tone={featured ? 'dark' : 'light'}
          >
            {ctaFor(annual).label}
          </ButtonLink>
        )}
      </div>
    </>
  );

  if (featured) {
    return (
      <div className="relative flex h-full flex-col gap-5 rounded-sheet bg-linear-to-b from-deep to-action p-6 text-surface shadow-glass-lg ring-2 ring-mint/60 md:p-8 lg:-my-4 lg:py-10">
        <span className="type-label absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-mint px-4 py-1.5 whitespace-nowrap text-ink shadow-glass">
          Recommandé
        </span>
        {body}
      </div>
    );
  }
  return (
    <GlassPanel radius="sheet" className="flex h-full flex-col gap-5 p-6 text-ink md:p-8">
      {body}
    </GlassPanel>
  );
}

export function OfferShowcase({
  offers,
  guarantees,
  headingId = 'offres',
  title = 'Nos offres',
  subtitle,
  primaryCta = false,
}: {
  offers: Offer[];
  guarantees: Guarantee[];
  headingId?: string;
  title?: string;
  subtitle?: string | undefined;
  /** Le bouton du Pass Famille est le bouton principal de la page. */
  primaryCta?: boolean;
}) {
  const unlock = offers.find((o) => o.purpose === 'UNLOCK');
  const solo = offers.find((o) => o.purpose === 'PASS_SOLO');
  const family = offers.find((o) => o.purpose === 'PASS_FAMILY');
  const annual = offers.find((o) => o.purpose === 'PASS_FAMILY_ANNUAL');
  // Le Pass Famille vient en premier (mobile, lecteurs d’écran) ; au centre sur ordinateur.
  const cards = [
    family && { offer: family, featured: true, order: 'lg:order-2' },
    !family && annual && { offer: annual, featured: true, order: 'lg:order-2' },
    solo && { offer: solo, featured: false, order: 'lg:order-1' },
    unlock && { offer: unlock, featured: false, order: 'lg:order-3' },
  ].filter(Boolean) as { offer: Offer; featured: boolean; order: string }[];

  if (cards.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-10 md:gap-14">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
        <h2 id={headingId} className="type-display text-brand md:text-4xl">
          {title}
        </h2>
        {subtitle && <p className="type-body text-ink-muted md:text-lg">{subtitle}</p>}
      </div>

      <ul
        className={cn(
          'grid items-stretch gap-8 md:gap-6 lg:gap-6',
          cards.length >= 3 ? 'lg:grid-cols-3' : cards.length === 2 ? 'md:grid-cols-2' : '',
        )}
      >
        {cards.map((c) => (
          <li key={c.offer.purpose} className={cn('flex flex-col', c.order)}>
            <OfferCard
              offer={c.offer}
              featured={c.featured}
              annual={c.featured && c.offer.purpose === 'PASS_FAMILY' ? annual : undefined}
              primaryCta={primaryCta && c.featured}
            />
          </li>
        ))}
      </ul>

      {guarantees.length > 0 && (
        <ul
          aria-label="Nos garanties"
          className={cn('grid gap-4', guarantees.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}
        >
          {guarantees.map((g) => (
            <li key={g.text}>
              <GlassPanel className="flex h-full items-start gap-4 p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-available-soft">
                  <ShieldCheck aria-hidden className="size-5 text-available" />
                </span>
                <span className="type-body-strong text-ink">
                  <HintPoint hint={g.hint}>{g.text}</HintPoint>
                </span>
              </GlassPanel>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Garanties affichées sous les offres, lues dans les paramètres. */
export function offerGuarantees(s: {
  tripText: string | null | undefined;
  passRefundText: string | null | undefined;
  firstUnlockOffered: boolean | null | undefined;
}): Guarantee[] {
  return [
    {
      text: 'Rien à payer si aucune pharmacie n’a votre ordonnance.',
      hint: 'L’aperçu gratuit vous le dit avant tout paiement.',
    },
    ...(s.tripText
      ? [{ text: s.tripText, hint: 'Le signalement se fait depuis le résultat, en un geste.' }]
      : []),
    ...(s.passRefundText
      ? [
          {
            text: s.passRefundText,
            hint: 'Sans abonnement : le Pass s’arrête tout seul à la fin de la période.',
          },
        ]
      : []),
    ...(s.firstUnlockOffered
      ? [
          {
            text: 'Compte gratuit : votre première ordonnance complète est offerte.',
            hint: 'Une seule fois par compte, depuis un résultat.',
          },
        ]
      : []),
  ];
}

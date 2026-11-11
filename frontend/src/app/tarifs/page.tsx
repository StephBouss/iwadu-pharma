import type { Metadata } from 'next';
import { Check, Gift, ShieldCheck } from 'lucide-react';
import { PublicShell } from '@/components/layout/PublicShell';
import { ButtonLink } from '@/components/ui/Button';
import { GlassDark } from '@/components/ui/GlassDark';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { formatFcfa } from '@/lib/format';
import { buildOffers } from '@/lib/server/iwadu/offers';
import { getSettings } from '@/lib/server/iwadu/settings';

// Tarifs : ce qui est gratuit, l'acte et les Pass, avec le prix par
// recherche. Tout vient des paramètres (aucun prix écrit ici). Page
// pré-rendue, rafraîchie toutes les 5 minutes.

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Aperçu gratuit, déblocage à l’acte sans compte, Pass Solo et Pass Famille : les tarifs d’Iwadu Pharma, payables par Airtel Money ou Moov Money.',
};

export default async function PricingPage() {
  const s = await getSettings();
  const offers = buildOffers(s);
  const free = s['preview.freeCount'];
  const days = s['preview.windowDays'];

  return (
    <PublicShell
      width="wide"
      hero={
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-4xl font-bold md:text-[3.5rem] md:leading-tight">
            Tarifs
          </h1>
          <p className="type-body max-w-3xl text-surface/85 md:text-lg">
            Le gratuit répond à « Trouve-t-on mon ordonnance près de moi, et combien prévoir ? ». Le
            payant répond à « Laquelle, et où payer moins ? ». Les médicaments se paient en
            pharmacie.
          </p>
          <GlassDark className="flex flex-col gap-2 p-5 md:max-w-2xl md:p-6">
            <p className="type-body-strong text-mint">Gratuit, sans compte</p>
            <ul className="flex flex-col gap-1.5">
              {[
                'Combien de pharmacies ont toute l’ordonnance, et la distance de la plus proche',
                'La fourchette de prix plein et l’écart entre pharmacies',
                'Combien en ont une partie, et l’heure du stock',
                'Les pharmacies de garde, avec leur nom',
              ].map((t) => (
                <li key={t} className="type-body flex gap-2 text-surface/90">
                  <Check aria-hidden className="mt-0.5 size-4.5 shrink-0 text-mint" />
                  {t}
                </li>
              ))}
            </ul>
            {free && days ? (
              <p className="type-body-small text-surface/80">
                {free} aperçus gratuits par appareil tous les {days} jours.
              </p>
            ) : null}
          </GlassDark>
        </div>
      }
      className="pt-10 md:pt-14"
    >
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {offers.map((o) => (
          <li key={o.purpose} className="flex">
            <GlassPanel
              className={
                o.purpose === 'PASS_FAMILY'
                  ? 'flex w-full flex-col gap-3 p-6 ring-2 ring-action'
                  : 'flex w-full flex-col gap-3 p-6'
              }
            >
              <div className="flex flex-col">
                <h2 className="type-title-2 text-ink">{o.title}</h2>
                {o.tagline && <p className="type-body-small text-action">{o.tagline}</p>}
              </div>
              <p className="font-display text-3xl font-bold text-brand tabular-nums">
                {formatFcfa(o.price)}
              </p>
              <p className="type-body-small text-ink-muted">{o.period}</p>
              <p className="type-body text-ink">
                <strong>{o.searches}</strong>
                {o.perSearch ? `, soit ${formatFcfa(o.perSearch)} la recherche` : ''}
              </p>
              {o.rule && <p className="type-body-small text-ink-muted">{o.rule}</p>}
              <ul className="flex flex-col gap-1.5">
                {o.points.map((p) => (
                  <li key={p} className="type-body-small flex gap-2 text-ink">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                {o.purpose === 'UNLOCK' ? (
                  <ButtonLink href="/ordonnance?depart=photo" fullWidth>
                    Photographier mon ordonnance
                  </ButtonLink>
                ) : (
                  <ButtonLink
                    href={`/compte/pass?offre=${o.purpose}`}
                    variant="secondary"
                    fullWidth
                  >
                    Prendre le {o.title}
                  </ButtonLink>
                )}
              </div>
            </GlassPanel>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 md:grid-cols-2">
        {s['account.firstUnlockOffered'] && (
          <GlassPanel className="flex items-start gap-4 p-6">
            <Gift aria-hidden className="mt-0.5 size-6 shrink-0 text-action" />
            <p className="type-body text-ink">
              <strong>Compte gratuit :</strong> votre première ordonnance complète est offerte, une
              seule fois par compte.
            </p>
          </GlassPanel>
        )}
        {[s['guarantee.tripText'], s['guarantee.passRefundText']].filter(Boolean).map((t) => (
          <GlassPanel key={t} className="flex items-start gap-4 p-6">
            <ShieldCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-available" />
            <p className="type-body text-ink">{t}</p>
          </GlassPanel>
        ))}
      </div>
      <p className="type-body-small text-ink-muted">
        Paiement par Airtel Money ou Moov Money. Rouvrir une ordonnance déjà débloquée, refaire le
        calcul pour une autre pharmacie ou une autre assurance, consulter les gardes : gratuit.
      </p>
    </PublicShell>
  );
}

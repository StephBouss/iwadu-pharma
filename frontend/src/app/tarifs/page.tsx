import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { PublicShell } from '@/components/layout/PublicShell';
import { OfferShowcase, offerGuarantees } from '@/components/public/OfferShowcase';
import { GlassDark } from '@/components/ui/GlassDark';
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
      className="gap-10 pt-14 md:gap-14 md:pt-20"
    >
      <OfferShowcase
        offers={offers}
        primaryCta
        title="Choisissez votre formule"
        subtitle="Sans abonnement : un Pass s’arrête tout seul à la fin de sa période. Les médicaments se paient en pharmacie."
        guarantees={offerGuarantees({
          tripText: s['guarantee.tripText'],
          passRefundText: s['guarantee.passRefundText'],
          firstUnlockOffered: s['account.firstUnlockOffered'],
        })}
      />
      <p className="type-body-small text-ink-muted">
        Paiement par Airtel Money ou Moov Money. Rouvrir une ordonnance déjà débloquée, refaire le
        calcul pour une autre pharmacie ou une autre assurance, consulter les gardes : gratuit.
      </p>
    </PublicShell>
  );
}

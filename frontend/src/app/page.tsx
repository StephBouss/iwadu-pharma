import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Camera,
  Check,
  CircleCheck,
  Eye,
  FileText,
  FolderOpen,
  MapPin,
  Moon,
  Search,
  Shield,
  ShoppingBag,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { HeroBanner } from '@/components/brand/HeroBanner';
import { DropZone } from '@/components/home/DropZone';
import { SchematicMap } from '@/components/home/SchematicMap';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { CallLink, DirectionsLink } from '@/components/pharmacy/PharmacyActions';
import { FaqList, faqItems } from '@/components/public/Faq';
import { OfferShowcase, offerGuarantees } from '@/components/public/OfferShowcase';
import { ButtonLink } from '@/components/ui/Button';
import { GlassDark } from '@/components/ui/GlassDark';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { HintPoint } from '@/components/ui/HintPoint';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatFcfa } from '@/lib/format';
import { buildOffers } from '@/lib/server/iwadu/offers';
import { listPharmacies, listUpcomingDuty } from '@/lib/server/iwadu/pharmacies';
import { getSettings } from '@/lib/server/iwadu/settings';

// Accueil (maquette Banani « Accueil »), ajusté au PRD du MVP : une seule
// action principale (« Photographier mon ordonnance »), tarifs avec le prix
// par recherche, aucune réservation, aucune annonce. Page pré-rendue et
// rafraîchie toutes les 5 minutes : les prix et textes viennent des
// paramètres, sans republier. Aucune carte lourde ici (plan schématique).

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'Iwadu Pharma — la pharmacie qui a toute votre ordonnance' },
};

// Avant / avec Iwadu Pharma : chaque point a son explication, dans une
// bulle discrète au survol, au toucher ou au clavier. Côté « Avant », la
// bulle est rouge : elle dit le problème ou la limite.
// [avant, avec Iwadu Pharma, explication « avec », explication « avant »]
const CHANGES: [string, string, string, string][] = [
  [
    'Je fais plusieurs pharmacies pour un seul médicament',
    'Je vois qui a toute mon ordonnance',
    'Une photo de l’ordonnance suffit : vous voyez quelles pharmacies proches ont tous vos médicaments, et à quelle heure leur stock a été mis à jour.',
    'Chaque pharmacie visitée coûte du temps et du transport, et le traitement commence parfois en retard.',
  ],
  [
    'Je découvre le prix à la caisse',
    'Je connais le prix avant de sortir',
    'Le prix de chaque médicament, pharmacie par pharmacie. Vous choisissez où payer moins, sans vous déplacer.',
    'Le même médicament peut coûter plus cher d’une pharmacie à l’autre : sans comparer, vous payez le prix annoncé.',
  ],
  [
    'Je ne sais pas ce que mon assurance prend',
    'Le reste à payer est estimé avec mon taux',
    'Indiquez votre assurance et votre taux de prise en charge : le montant à payer est calculé pour chaque pharmacie. C’est une estimation, confirmée par le pharmacien.',
    'Sans connaître le reste à payer, difficile de savoir combien emporter avant de partir.',
  ],
  [
    'Je cherche la pharmacie de garde, le soir',
    'Les gardes de la nuit, gratuitement',
    'Les pharmacies de garde, avec leur adresse et leur téléphone. Sans compte et sans payer.',
    'La nuit ou le week-end, trouver la pharmacie ouverte prend du temps, au moment où vous en avez le plus besoin.',
  ],
  [
    'J’ai peur de payer pour rien',
    'Je vois le résultat avant de payer',
    'L’aperçu gratuit vous dit combien de pharmacies ont toute l’ordonnance et combien prévoir. Vous payez seulement si vous voulez les noms et les prix.',
    'Payer avant de savoir si une pharmacie a vos médicaments, c’est risquer de perdre votre argent.',
  ],
  [
    'Les applications, ce n’est pas pour moi',
    'Une photo, une liste à vérifier, un bouton',
    'Rien à installer : tout se fait dans le navigateur du téléphone. Vous pouvez aussi taper le nom de vos médicaments.',
    'Comptes à créer, formulaires longs, applications à installer : beaucoup abandonnent avant d’avoir une réponse.',
  ],
];

export default async function Home() {
  const s = await getSettings();
  const offers = buildOffers(s);
  const unlock = offers.find((o) => o.purpose === 'UNLOCK');
  const freeCount = s['preview.freeCount'];
  const windowDays = s['preview.windowDays'];

  let duty = (await listPharmacies({ onDutyOnly: true })).slice(0, 3);
  const dutyNow = duty.length > 0;
  if (!dutyNow) duty = (await listUpcomingDuty({})).slice(0, 3);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      {/* 1. Bandeau */}
      <HeroBanner backdrop>
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-8">
          <SiteHeader tone="dark" />
        </div>
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-10 pb-24 md:px-8 md:pt-16 md:pb-36 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <div className="flex flex-col gap-6">
            <p className="type-overline flex items-center gap-2 text-mint">
              <Users aria-hidden className="size-4" />
              Pour vous et vos proches
            </p>
            <h1 className="font-display text-[2rem] leading-[1.15] font-bold text-surface md:text-5xl lg:text-[3.5rem] lg:leading-[1.12]">
              La pharmacie qui a toute votre ordonnance, au plus près de vous
            </h1>
            <p className="type-body max-w-xl text-surface/85 md:text-lg md:leading-7">
              Avec ou sans assurance. Une photo suffit : vous voyez gratuitement combien de
              pharmacies ont tous vos médicaments, et combien prévoir. Avant de sortir de chez vous.
            </p>

            <GlassDark
              as="section"
              aria-labelledby="ajouter"
              className="flex flex-col gap-5 p-5 md:p-8"
            >
              <h2 id="ajouter" className="font-display text-xl font-semibold md:text-2xl">
                Ajoutez votre ordonnance
              </h2>
              <ButtonLink
                href="/ordonnance?depart=photo"
                tone="dark"
                size="lg"
                fullWidth
                leadingIcon={<Camera aria-hidden />}
              >
                Photographier mon ordonnance
              </ButtonLink>
              <Link
                href="/ordonnance?depart=fichier"
                className="type-label flex min-h-12 flex-wrap items-center justify-center gap-x-2 rounded-full text-center text-mint hover:text-surface"
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <FolderOpen aria-hidden className="size-5" />
                  Importer un fichier
                </span>
                <span className="type-caption whitespace-nowrap text-surface/75">
                  JPG, PNG, WebP ou PDF
                </span>
              </Link>
              <DropZone />
              <p className="type-body-small text-center text-surface/80">
                Gratuit et sans compte
                {freeCount && windowDays
                  ? ` · ${freeCount} aperçus gratuits tous les ${windowDays} jours`
                  : ''}
                . Vous ne payez que pour voir les noms.
              </p>
              <Link
                href="/gardes"
                className="type-label flex min-h-12 items-center justify-center gap-2 text-mint hover:text-surface"
              >
                <Moon aria-hidden className="size-4" />
                Pharmacies de garde autour de moi
              </Link>
            </GlassDark>
          </div>

          {/* Exemple d'aperçu gratuit (fictif) */}
          <GlassDark
            as="aside"
            aria-label="Exemple d’aperçu gratuit"
            className="flex flex-col gap-4 self-start p-6 md:p-8 lg:mt-24"
          >
            <div className="flex items-center gap-3">
              <span className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-mint/20 min-[400px]:flex">
                <FileText aria-hidden className="size-5 text-mint" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="type-body-strong whitespace-nowrap">Ordonnance lue</p>
                <p className="type-body-small text-surface/75">3 médicaments trouvés</p>
              </div>
              <StatusBadge status="verify">À vérifier</StatusBadge>
            </div>
            <ul className="flex flex-col">
              {['Paracétamol 500 mg', 'Amoxicilline 1 g', 'Ibuprofène 400 mg'].map((m) => (
                <li
                  key={m}
                  className="type-body flex items-center justify-between border-t border-surface/10 py-3 text-surface/90"
                >
                  {m}
                  <Check aria-hidden className="size-4 text-mint" />
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1 rounded-field border border-mint/25 bg-mint/12 p-4">
              <p className="font-display text-xl font-bold">
                4 pharmacies ont toute votre ordonnance
              </p>
              <p className="type-body-strong text-mint">
                De {formatFcfa(4200)} à {formatFcfa(6100)}, prix plein
              </p>
              <p className="type-body-small text-surface/75">
                La plus proche à 550 m · Stock mis à jour à 14 h 05
              </p>
            </div>
            {unlock && (
              <p className="type-label rounded-full border border-surface/25 px-4 py-3 text-center">
                Les noms et les prix : <span className="text-mint">{formatFcfa(unlock.price)}</span>
              </p>
            )}
            <p className="type-caption text-center text-surface/75">
              Démonstration · exemple fictif
            </p>
          </GlassDark>
        </div>
      </HeroBanner>

      <main id="contenu" className="flex flex-col">
        {/* 2. Trois cartes qui chevauchent le bandeau */}
        <div className="mx-auto -mt-14 grid w-full max-w-6xl gap-4 px-4 md:-mt-18 md:grid-cols-3 md:gap-6 md:px-8">
          {[
            {
              icon: MapPin,
              title: 'Le bon endroit du premier coup',
              desc: 'Toute votre ordonnance, dans une seule pharmacie.',
            },
            {
              icon: Eye,
              title: 'Vous savez avant de payer',
              desc: 'Le nombre de pharmacies est gratuit, l’heure du stock est affichée.',
            },
            {
              icon: Camera,
              title: 'Une photo, une liste, un bouton',
              desc: 'Sans compte, sans calcul, sans faire le tour des pharmacies.',
            },
          ].map((c) => (
            <GlassPanel key={c.title} className="flex items-start gap-4 p-6 md:p-8">
              <span className="flex size-13 shrink-0 items-center justify-center rounded-full border border-mint/40 bg-mint/20">
                <c.icon aria-hidden className="size-6 text-action" />
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="type-title-1 text-ink">{c.title}</h2>
                <p className="type-body text-ink-muted">{c.desc}</p>
              </div>
            </GlassPanel>
          ))}
        </div>

        {/* 3. Ce qui change pour vous */}
        <section
          aria-labelledby="change"
          className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24"
        >
          <h2 id="change" className="type-display mb-8 text-center text-brand md:mb-12 md:text-4xl">
            Ce qui change pour vous
          </h2>
          <GlassPanel>
            <div className="hidden grid-cols-2 md:grid">
              <p className="type-body-strong rounded-tl-card bg-muted px-8 py-4 text-ink-muted md:text-lg">
                Avant
              </p>
              <p className="type-body-strong rounded-tr-card bg-available-soft px-8 py-4 text-ink md:text-lg">
                Avec Iwadu Pharma
              </p>
            </div>
            <ul>
              {CHANGES.map(([before, after, hint, beforeHint]) => (
                <li
                  key={before}
                  className="group/row grid border-t border-ink/7 first:border-t-0 md:grid-cols-2 md:first:border-t"
                >
                  <p className="type-body flex items-center gap-3 px-5 pt-4 text-ink-muted md:border-r md:border-ink/7 md:px-8 md:py-5">
                    <X aria-hidden className="size-4.5 shrink-0" />
                    <span>
                      <span className="sr-only">Avant : </span>
                      <HintPoint hint={beforeHint} tone="warning">
                        {before}
                      </HintPoint>
                    </span>
                  </p>
                  <p className="type-body flex items-center gap-3 px-5 pt-2 pb-4 font-medium text-ink md:bg-available-soft/30 md:px-8 md:py-5 md:group-last/row:rounded-br-card">
                    <Check aria-hidden className="size-4.5 shrink-0 text-available" />
                    <span>
                      <span className="sr-only">Avec Iwadu Pharma : </span>
                      <HintPoint hint={hint}>{after}</HintPoint>
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>

        {/* 4. Comment ça marche */}
        <section
          id="comment-ca-marche"
          aria-labelledby="comment"
          className="scroll-mt-4 bg-ink py-16 text-surface md:py-24"
        >
          <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
            <h2
              id="comment"
              className="type-display mb-10 text-center text-mint md:mb-16 md:text-4xl"
            >
              Comment ça marche
            </h2>
            <ol className="flex flex-col gap-10 md:flex-row md:items-start md:gap-0">
              {[
                { icon: Camera, title: 'Photographiez la liste des médicaments, sans les noms' },
                {
                  icon: Search,
                  title: 'Voyez gratuitement combien de pharmacies l’ont, et combien prévoir',
                },
                {
                  icon: ShoppingBag,
                  title: 'Débloquez les noms et les prix, puis payez vos médicaments en pharmacie',
                },
              ].map((step, i) => (
                <li key={step.title} className="flex flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center gap-4 text-center">
                    <span className="flex size-20 items-center justify-center rounded-full border-2 border-mint/40 bg-mint/15">
                      <step.icon aria-hidden className="size-8 text-mint" />
                    </span>
                    <span className="flex size-9 items-center justify-center rounded-full bg-mint font-display text-xl font-bold text-ink">
                      {i + 1}
                    </span>
                    <p className="type-body-strong max-w-64 md:text-lg">{step.title}</p>
                  </div>
                  {i < 2 && (
                    <span aria-hidden className="hidden h-0.5 w-15 shrink-0 bg-mint/30 md:block" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5. Nos offres : toutes les formules, le Pass Famille mis en avant */}
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <OfferShowcase
            offers={offers}
            guarantees={offerGuarantees({
              tripText: s['guarantee.tripText'],
              passRefundText: s['guarantee.passRefundText'],
              firstUnlockOffered: s['account.firstUnlockOffered'],
            })}
            subtitle="Sans abonnement, payable par Airtel Money ou Moov Money. Les médicaments se paient en pharmacie."
          />
        </div>

        {/* 8. Pharmacies de garde */}
        {duty.length > 0 && (
          <section aria-labelledby="gardes" className="bg-ink py-16 text-surface md:py-24">
            <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
              <h2 id="gardes" className="type-display mb-8 text-mint md:mb-12 md:text-4xl">
                {dutyNow ? 'Pharmacies de garde en ce moment' : 'Prochaines pharmacies de garde'}
              </h2>
              <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                <GlassDark className="flex flex-col p-5 md:p-8 lg:w-[420px] lg:shrink-0">
                  <ul className="flex flex-col">
                    {duty.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-col gap-3 border-b border-surface/10 py-4 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-col">
                            <Link
                              href={`/pharmacie/${p.slug}`}
                              className="type-body-strong hover:text-mint"
                            >
                              {p.name}
                            </Link>
                            <p className="type-body-small text-surface/75">
                              {[p.districtName, p.opening.label].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {dutyNow && <StatusBadge status="on-duty" className="shrink-0" />}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <DirectionsLink
                            slug={p.slug}
                            lat={p.lat}
                            lng={p.lng}
                            className="border-surface/25 bg-surface/10 text-surface hover:bg-surface/18"
                          />
                          <CallLink
                            slug={p.slug}
                            phone={p.phone}
                            className="border-surface/25 bg-surface/10 text-surface hover:bg-surface/18"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <ButtonLink href="/gardes" tone="dark" variant="ghost" className="mt-2">
                    Voir toutes les gardes et la carte
                  </ButtonLink>
                  {duty.some((p) => p.isDemo) && (
                    <p className="type-caption mt-2 text-surface/75">
                      Démonstration · pharmacies fictives
                    </p>
                  )}
                </GlassDark>
                <SchematicMap
                  className="flex-1"
                  title={dutyNow ? 'Gardes en ce moment' : 'Prochaines gardes'}
                  pins={duty.map((p) => ({
                    label: p.name.replace(/^Pharmacie /, ''),
                    lat: p.lat,
                    lng: p.lng,
                  }))}
                />
              </div>
            </div>
          </section>
        )}

        {/* 9. Vos questions */}
        <section
          aria-labelledby="questions"
          className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24"
        >
          <h2
            id="questions"
            className="type-display mb-8 text-center text-brand md:mb-12 md:text-4xl"
          >
            Vos questions
          </h2>
          <FaqList items={faqItems(s)} />
        </section>

        {/* 10. Pharmaciens */}
        <section aria-labelledby="pro" className="bg-ink py-14 text-surface md:py-20">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="flex flex-col gap-2">
              <h2 id="pro" className="font-display text-2xl font-bold md:text-3xl">
                Vous êtes pharmacien ?
              </h2>
              <p className="type-body text-surface/80 md:text-lg">
                Les patients de votre quartier voient que vous avez leur ordonnance.
              </p>
            </div>
            <ButtonLink href="/pharmacies" tone="dark" variant="secondary">
              Inscrire ma pharmacie
            </ButtonLink>
          </div>
        </section>

        {/* 11. Bandeau final */}
        <HeroBanner decor="light">
          <section
            aria-labelledby="final"
            className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-16 text-center md:px-8 md:py-20"
          >
            <h2
              id="final"
              className="max-w-3xl font-display text-3xl leading-tight font-bold md:text-[3.25rem]"
            >
              Sachez qui a votre ordonnance, avant de sortir
            </h2>
            <ul className="flex flex-col gap-3 md:flex-row md:gap-8">
              {[
                { icon: CircleCheck, label: 'Gratuit avant de payer' },
                { icon: Shield, label: 'Avec ou sans assurance' },
                { icon: Smartphone, label: 'Airtel Money ou Moov Money' },
              ].map((it) => (
                <li key={it.label} className="type-body-strong flex items-center gap-2 md:text-lg">
                  <it.icon aria-hidden className="size-5 text-mint" />
                  {it.label}
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/ordonnance?depart=photo"
              tone="dark"
              variant="secondary"
              size="lg"
              leadingIcon={<Camera aria-hidden />}
            >
              Ajouter mon ordonnance
            </ButtonLink>
          </section>
        </HeroBanner>
      </main>

      <SiteFooter />
    </div>
  );
}

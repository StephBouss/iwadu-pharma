import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Camera,
  Check,
  CircleCheck,
  Eye,
  FileText,
  FolderOpen,
  Gift,
  MapPin,
  Moon,
  Search,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { HeroBanner } from '@/components/brand/HeroBanner';
import { DropZone } from '@/components/home/DropZone';
import { SchematicMap } from '@/components/home/SchematicMap';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { CallLink, DirectionsLink } from '@/components/pharmacy/PharmacyActions';
import { FaqList, faqItems } from '@/components/public/Faq';
import { ButtonLink } from '@/components/ui/Button';
import { GlassDark } from '@/components/ui/GlassDark';
import { GlassPanel } from '@/components/ui/GlassPanel';
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

const CHANGES: [string, string][] = [
  ['Je fais plusieurs pharmacies pour un seul médicament', 'Je vois qui a toute mon ordonnance'],
  ['Je découvre le prix à la caisse', 'Je connais le prix avant de sortir'],
  ['Je ne sais pas ce que mon assurance prend', 'Le reste à payer est estimé avec mon taux'],
  ['Je cherche la pharmacie de garde, le soir', 'Les gardes de la nuit, gratuitement'],
  ['J’ai peur de payer pour rien', 'Je vois le résultat avant de payer'],
  ['Les applications, ce n’est pas pour moi', 'Une photo, une liste à vérifier, un bouton'],
];

export default async function Home() {
  const s = await getSettings();
  const offers = buildOffers(s);
  const unlock = offers.find((o) => o.purpose === 'UNLOCK');
  const solo = offers.find((o) => o.purpose === 'PASS_SOLO');
  const family = offers.find((o) => o.purpose === 'PASS_FAMILY');
  const annual = offers.find((o) => o.purpose === 'PASS_FAMILY_ANNUAL');
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
          <GlassPanel className="overflow-hidden">
            <div className="hidden grid-cols-2 md:grid">
              <p className="type-body-strong bg-muted px-8 py-4 text-ink-muted md:text-lg">Avant</p>
              <p className="type-body-strong bg-available-soft px-8 py-4 text-ink md:text-lg">
                Avec Iwadu Pharma
              </p>
            </div>
            <ul>
              {CHANGES.map(([before, after]) => (
                <li
                  key={before}
                  className="grid border-t border-ink/7 first:border-t-0 md:grid-cols-2 md:first:border-t"
                >
                  <p className="type-body flex items-center gap-3 px-5 pt-4 text-ink-muted md:border-r md:border-ink/7 md:px-8 md:py-5">
                    <X aria-hidden className="size-4.5 shrink-0" />
                    <span>
                      <span className="sr-only">Avant : </span>
                      {before}
                    </span>
                  </p>
                  <p className="type-body flex items-center gap-3 px-5 pt-2 pb-4 font-medium text-ink md:bg-available-soft/30 md:px-8 md:py-5">
                    <Check aria-hidden className="size-4.5 shrink-0 text-available" />
                    <span>
                      <span className="sr-only">Avec Iwadu Pharma : </span>
                      {after}
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

        {/* 5. Offre phare : Pass Famille */}
        {family && (
          <HeroBanner decor="light">
            <section
              aria-labelledby="offre"
              className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20"
            >
              <h2 id="offre" className="type-display mb-8 text-center md:mb-12 md:text-4xl">
                Offre phare
              </h2>
              <GlassDark className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-12">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-2xl font-bold md:text-3xl">
                      {family.title} {s['pass.durationDays']} jours
                    </p>
                    <p className="font-display text-xl font-semibold text-mint">{family.tagline}</p>
                    <p className="type-body mt-1 text-surface/80">
                      Pour les familles qui ont souvent des ordonnances.
                    </p>
                  </div>
                  <div className="flex flex-col sm:items-end">
                    <p className="font-display text-4xl font-bold tabular-nums md:text-5xl">
                      {formatFcfa(family.price)}
                    </p>
                    <p className="type-body text-surface/80">{family.period}</p>
                  </div>
                </div>
                <p className="flex flex-wrap items-baseline gap-x-2 rounded-field bg-surface/10 px-4 py-3">
                  <span className="type-body-strong">{family.searches}</span>
                  {family.rule && (
                    <span className="type-body-small text-surface/80">{family.rule}</span>
                  )}
                </p>
                <div>
                  <p className="type-body-strong mb-3 text-mint">Ce que vous recevez</p>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {[
                      'Les noms, distances et prix des pharmacies qui ont tout',
                      'Le reste à payer estimé avec votre assurance',
                      ...family.points.filter((p) => !p.startsWith('Offert')),
                    ].map((p) => (
                      <li key={p} className="type-body flex items-start gap-2 text-surface/90">
                        <CircleCheck aria-hidden className="mt-0.5 size-4.5 shrink-0 text-mint" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="type-body-strong flex items-start gap-2 rounded-field border border-mint/25 bg-mint/12 p-4 text-mint">
                  <Gift aria-hidden className="mt-0.5 size-4.5 shrink-0" />
                  Offert : le guide « Comprendre votre prise en charge »
                </p>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                  <ButtonLink href="/compte/pass?offre=PASS_FAMILY" tone="dark" variant="secondary">
                    Prendre le Pass Famille
                  </ButtonLink>
                  {s['guarantee.passRefundText'] && (
                    <p className="type-body-small flex items-center gap-3 rounded-field border border-surface/18 bg-surface/8 p-4 text-surface/85">
                      <Shield aria-hidden className="size-5 shrink-0 text-mint" />
                      {s['guarantee.passRefundText']}
                    </p>
                  )}
                </div>
                {annual && (
                  <p className="type-body-small text-surface/80">
                    Aussi en {annual.title} : {formatFcfa(annual.price)} {annual.period}, en un seul
                    paiement.
                  </p>
                )}
              </GlassDark>
            </section>
          </HeroBanner>
        )}

        {/* 6. Deux formules */}
        <section
          aria-label="Autres formules"
          className="mx-auto grid w-full max-w-6xl gap-4 px-4 pt-16 md:grid-cols-2 md:gap-6 md:px-8 md:pt-24"
        >
          {solo && (
            <GlassPanel className="flex flex-col gap-2 p-6 md:p-10">
              <p className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-mint/20">
                  <User aria-hidden className="size-5 text-action" />
                </span>
                <span className="type-title-1 text-ink">{solo.title}</span>
              </p>
              <p className="font-display text-4xl font-bold text-brand tabular-nums">
                {formatFcfa(solo.price)}
              </p>
              <p className="type-body text-ink-muted">{solo.period}</p>
              <p className="type-body mt-2 text-ink-muted">
                {solo.searches}
                {solo.perSearch ? (
                  <>
                    , soit <strong className="text-ink">{formatFcfa(solo.perSearch)}</strong> la
                    recherche
                  </>
                ) : null}
              </p>
              <ButtonLink
                href="/compte/pass?offre=PASS_SOLO"
                variant="secondary"
                className="mt-4 self-start"
              >
                Prendre le Pass Solo
              </ButtonLink>
            </GlassPanel>
          )}
          {unlock && (
            <GlassPanel className="flex flex-col gap-2 p-6 md:p-10">
              <p className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-mint/20">
                  <Zap aria-hidden className="size-5 text-action" />
                </span>
                <span className="type-title-1 text-ink">{unlock.title}</span>
              </p>
              <p className="font-display text-4xl font-bold text-brand tabular-nums">
                {formatFcfa(unlock.price)}
              </p>
              <p className="type-body text-ink-muted">{unlock.period}</p>
              <p className="type-body mt-2 text-ink-muted">
                Sans compte. Vous payez seulement quand vous en avez besoin.
              </p>
              <ButtonLink href="/ordonnance" variant="secondary" className="mt-4 self-start">
                Commencer sans compte
              </ButtonLink>
            </GlassPanel>
          )}
        </section>

        {/* 7. Garanties */}
        <section
          aria-label="Nos garanties"
          className="mx-auto grid w-full max-w-6xl gap-4 px-4 pt-10 pb-16 md:grid-cols-2 md:gap-6 md:px-8 md:pb-24"
        >
          {[
            'Rien à payer si aucune pharmacie n’a votre ordonnance.',
            ...(s['guarantee.tripText'] ? [s['guarantee.tripText']] : []),
          ].map((text) => (
            <GlassPanel key={text} className="flex items-center gap-5 p-6 md:p-8">
              <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-mint/20">
                <ShieldCheck aria-hidden className="size-6 text-action" />
              </span>
              <p className="type-body-strong text-ink md:text-lg">{text}</p>
            </GlassPanel>
          ))}
        </section>

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

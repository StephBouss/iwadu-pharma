import type { Metadata } from 'next';
import { Crop, EyeOff, Sun, Square } from 'lucide-react';
import { AccountShell } from '@/components/account/AccountShell';
import { PageHeading, SectionTitle } from '@/components/dashboard/PageHeading';
import { PublicShell } from '@/components/layout/PublicShell';
import { LocationProvider } from '@/components/location/LocationProvider';
import { PrescriptionJourney } from '@/components/prescription/PrescriptionJourney';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { loadJourney } from '@/lib/server/iwadu/journey';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { cn } from '@/lib/utils';

// « Votre ordonnance » (maquette Banani « Capture ordonnance ») : la prise
// de vue à gauche, les conseils à droite sur ordinateur ; sur téléphone,
// les conseils passent sous la prise de vue. Le parcours entier tient sur
// cette page (photo, vérification, liste, position).
// Connecté : la page s'ouvre dans le cadre « Mon espace » (maquette « Admin –
// Tableau de bord ») ; visiteur : page publique, même contenu.

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Votre ordonnance',
  description:
    'Photographiez la liste de vos médicaments : voyez gratuitement combien de pharmacies proches les ont, et combien prévoir.',
};

const DEPARTS = ['photo', 'fichier', 'fichier-depose', 'saisie'] as const;
type Depart = (typeof DEPARTS)[number];

const TIPS = [
  { icon: EyeOff, title: 'Sans les noms', desc: 'Ni le patient, ni le médecin dans le cadre' },
  { icon: Crop, title: 'Cadrage', desc: 'Toute la liste des médicaments dans le cadre' },
  { icon: Sun, title: 'Éclairage', desc: 'Lumière naturelle, pas d’ombre' },
  { icon: Square, title: 'Angle', desc: 'Face à face, ordonnance bien à plat' },
];

export default async function PrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ depart?: string; depuis?: string; saisie?: string; relancer?: string }>;
}) {
  const params = await searchParams;
  const [journey, { user }] = await Promise.all([
    loadJourney({ savedId: params.depuis, relaunchToken: params.relancer }),
    getViewer(),
  ]);
  const inAccount = Boolean(user);
  const depart: Depart | null =
    params.saisie === '1' ? 'saisie' : (DEPARTS.find((d) => d === params.depart) ?? null);

  const title = journey.relaunch
    ? 'Relancer votre ordonnance'
    : depart === 'saisie'
      ? 'Écrivez vos médicaments'
      : 'Prenez en photo votre ordonnance';
  const lead =
    depart === 'saisie' || journey.relaunch
      ? 'Tapez le nom de chaque médicament et choisissez-le dans la liste, avec la quantité.'
      : 'Posez l’ordonnance bien à plat et bien éclairée. Seule la liste des médicaments et des quantités est lue, puis vous la vérifiez.';

  const tips = (
    <GlassPanel className="flex flex-col gap-4 p-6">
      {!inAccount && <h2 className="type-title-3 text-brand">Conseils pour une bonne photo</h2>}
      <ul className="flex flex-col gap-4">
        {TIPS.map((tip) => (
          <li key={tip.title} className="flex gap-3">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-field',
                inAccount ? 'bg-action/15' : 'bg-mint/15',
              )}
            >
              <tip.icon aria-hidden className="size-4.5 text-action" />
            </span>
            <span className="flex flex-col">
              <span className="type-body-strong text-ink">{tip.title}</span>
              <span className="type-body-small text-ink-muted">{tip.desc}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="type-body-small rounded-field border border-mint/25 bg-available-soft/30 p-4 text-ink-muted">
        JPG, PNG ou WebP : la photo. PDF : la première page est convertie en image dans votre
        téléphone, puis recadrée.
      </p>
      <p className="type-caption text-ink-muted">
        La photo est effacée dès sa lecture. La liste des médicaments est lue par un service situé
        hors de votre pays ; aucun nom n’y est envoyé.
      </p>
    </GlassPanel>
  );

  const body = (
    <LocationProvider>
      {inAccount ? (
        <PageHeading title={title} subtitle={lead} />
      ) : (
        <div className="flex flex-col gap-2 pt-2">
          <h1 className="type-display text-brand md:text-[2.75rem] md:leading-tight">{title}</h1>
          <p className="type-body max-w-3xl text-ink-muted md:text-lg">{lead}</p>
        </div>
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Au-dessus des conseils : la liste des suggestions déborde de la colonne. */}
        <div className="relative z-10 w-full lg:max-w-2xl lg:flex-1">
          <PrescriptionJourney {...journey} depart={journey.relaunch ? 'saisie' : depart} />
        </div>
        <aside
          aria-labelledby={inAccount ? 'conseils' : undefined}
          className={cn(
            'w-full lg:sticky lg:top-6 lg:shrink-0',
            inAccount ? 'flex flex-col gap-4 lg:w-80' : 'lg:w-75',
          )}
        >
          {inAccount && <SectionTitle id="conseils">Conseils pour une bonne photo</SectionTitle>}
          {tips}
        </aside>
      </div>
    </LocationProvider>
  );

  return user ? (
    <AccountShell user={user}>{body}</AccountShell>
  ) : (
    <PublicShell width="wide">{body}</PublicShell>
  );
}

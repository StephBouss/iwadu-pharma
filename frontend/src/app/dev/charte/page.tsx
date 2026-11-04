import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ChevronRight, LocateFixed, MapPin, Smartphone } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Logo } from '@/components/brand/Logo';
import { PharmacyCard } from '@/components/pharmacy/PharmacyCard';
import { PriceSummary } from '@/components/pharmacy/PriceSummary';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Message } from '@/components/ui/Message';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatClock } from '@/lib/format';

// Page de contrôle de la charte V1.0 (planche 2 « Composants ») : sert à
// comparer les composants codés aux planches. Développement uniquement.
// Toutes les données sont fictives.

export const metadata: Metadata = {
  title: 'Charte · composants',
  robots: { index: false, follow: false },
};

const COLORS = [
  { name: 'Vert Iwadu', className: 'bg-brand', hex: '#0F927C', usage: 'Marque, grands titres' },
  { name: 'Vert d’action', className: 'bg-action', hex: '#0C7A68', usage: 'Boutons, liens, focus' },
  { name: 'Vert profond', className: 'bg-deep', hex: '#0F5F51', usage: 'Survol' },
  { name: 'Encre', className: 'bg-ink', hex: '#021916', usage: 'Texte principal' },
  { name: 'Ivoire', className: 'bg-ivory', hex: '#F5F7F3', usage: 'Fond des écrans' },
  { name: 'Blanc', className: 'bg-surface', hex: '#FFFFFF', usage: 'Cartes, champs' },
  { name: 'Menthe', className: 'bg-mint', hex: '#6FDCC0', usage: 'Accent sur fond sombre' },
  { name: 'Gris texte', className: 'bg-ink-muted', hex: '#4E5F5A', usage: 'Texte secondaire' },
  { name: 'Bordure', className: 'bg-outline', hex: '#6F817B', usage: 'Contours des champs' },
  { name: 'Filet', className: 'bg-hairline', hex: '#D8E1DC', usage: 'Séparations' },
] as const;

const TYPE_SCALE = [
  { token: 'type-display', spec: 'Outfit 700 · 32/36', sample: 'Vos médicaments, près de vous' },
  { token: 'type-title-1', spec: 'Outfit 700 · 24/30', sample: 'Votre ordonnance' },
  { token: 'type-title-2', spec: 'Outfit 600 · 20/26', sample: 'Pharmacie Démo' },
  { token: 'type-title-3', spec: 'Outfit 600 · 17/24', sample: 'Médicaments trouvés' },
  { token: 'type-body', spec: 'Figtree 400 · 16/24', sample: 'Prise en charge à confirmer.' },
  { token: 'type-body-strong', spec: 'Figtree 600 · 16/24', sample: '3 médicaments sur 3' },
  {
    token: 'type-body-small',
    spec: 'Figtree 400 · 14/20',
    sample: 'À 800 m · Ouverte jusqu’à 21 h',
  },
  { token: 'type-label', spec: 'Figtree 600 · 16/20', sample: 'Voir la pharmacie' },
  {
    token: 'type-caption',
    spec: 'Figtree 500 · 13/18',
    sample: 'Exemple fictif · Mis à jour à 14 h 05',
  },
  { token: 'type-overline', spec: 'Figtree 600 · 13/16', sample: 'Reste à payer estimé' },
  { token: 'type-amount-lg', spec: 'Figtree 700 · 32/36', sample: '4 500 FCFA' },
  { token: 'type-amount', spec: 'Figtree 700 · 20/26', sample: '6 000 FCFA' },
] as const;

// 14 h 05 à Libreville (UTC+1).
const STOCK_UPDATED_AT = new Date('2026-11-04T13:05:00Z');

// Heures passées par formatClock : espace insécable, jamais « 21 ↵ h ».
const at = (isoUtc: string) => formatClock(new Date(isoUtc));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-sheet border border-hairline bg-surface p-6">
      <h2 className="type-title-3 text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function CharteComposantsPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 pt-4">
        <AppHeader subtitle="Près de votre position · Louis" />
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16">
        <div className="flex flex-col gap-1 pt-6">
          <p className="type-overline text-action">Charte graphique V1.0</p>
          <h1 className="type-display text-ink">Composants</h1>
          <p className="type-body text-ink-muted">
            Page de contrôle, en développement seulement. Données des exemples fictives.
          </p>
        </div>

        <Section title="Logos">
          <div className="flex flex-wrap items-center gap-6">
            <Logo variant="horizontal-couleur" height={48} />
            <Logo variant="empile-couleur" height={96} />
            <Logo variant="symbole-couleur" height={48} />
            <Logo variant="symbole-reduit-couleur" height={24} />
            <span className="flex items-center rounded-card bg-brand p-4">
              <Logo variant="horizontal-blanc" height={40} />
            </span>
          </div>
        </Section>

        <Section title="Couleurs">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {COLORS.map((c) => (
              <li key={c.hex} className="flex flex-col gap-2">
                <span className={`h-16 rounded-card border border-hairline ${c.className}`} />
                <span className="type-body-strong text-ink">{c.name}</span>
                <span className="type-caption text-ink-muted">
                  {c.hex} · {c.usage}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Typographies">
          <dl className="flex flex-col divide-y divide-hairline">
            {TYPE_SCALE.map((t) => (
              <div
                key={t.token}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <dt className="type-caption w-44 shrink-0 text-ink-muted">
                  {t.token}
                  <br />
                  {t.spec}
                </dt>
                <dd className={`${t.token} text-ink`}>{t.sample}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Boutons">
          <div className="flex flex-wrap items-center gap-3">
            <Button leadingIcon={<Smartphone aria-hidden />}>Payer 4 500 FCFA</Button>
            <Button variant="secondary" trailingIcon={<ChevronRight aria-hidden />}>
              Voir la pharmacie
            </Button>
            <Button variant="ghost" leadingIcon={<LocateFixed aria-hidden />}>
              Utiliser ma position
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading>Paiement en cours…</Button>
            <Button disabled>Réserver</Button>
            <Button variant="secondary" size="sm">
              Modifier
            </Button>
          </div>
          <p className="type-body-small text-ink-muted">
            Forme capsule, hauteur 48 px. Verbe d’action en tête. Un seul bouton principal par
            écran.
          </p>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="États">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="available" />
              <StatusBadge status="low" />
              <StatusBadge status="unavailable" />
              <StatusBadge status="verify" />
              <StatusBadge status="on-duty" />
              <StatusBadge status="error" />
            </div>
          </Section>

          <Section title="Champs">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Votre position"
                placeholder="Quartier ou repère"
                icon={<MapPin />}
                hint="Ex. : Louis, Nzeng-Ayong, Akanda"
              />
              <Field
                label="Numéro Mobile Money"
                defaultValue="07 12"
                inputMode="tel"
                icon={<Smartphone />}
                error="Numéro incomplet : saisissez 8 chiffres après l’indicatif."
              />
            </div>
          </Section>
        </div>

        <Section title="Messages">
          <div className="grid gap-3 lg:grid-cols-2">
            <Message tone="info" title="Lecture automatique">
              Vérifiez les médicaments trouvés avant de réserver. Le pharmacien valide la
              délivrance.
            </Message>
            <Message tone="offline" title="Connexion limitée">
              Résultats enregistrés à 14 h 05. Mise à jour au retour du réseau.
            </Message>
            <Message tone="warning" title="Paiement en attente">
              Validez la demande sur votre téléphone pour confirmer la réservation.
            </Message>
            <Message tone="error" title="Paiement refusé">
              Aucun montant n’a été débité. Vérifiez votre solde puis réessayez.
            </Message>
          </div>
        </Section>

        <Section title="Cartes de pharmacie">
          <div className="grid gap-4 lg:grid-cols-2">
            <PharmacyCard
              name="Pharmacie Démo"
              distanceMeters={800}
              openingLabel={`Ouverte jusqu’à ${at('2026-11-04T20:00:00Z')}`}
              highlighted
              badges={<StatusBadge status="available">Ordonnance complète · 3/3</StatusBadge>}
              stockUpdatedAt={STOCK_UPDATED_AT}
              href="#"
            />
            <PharmacyCard
              name="Pharmacie Exemple"
              distanceMeters={1400}
              openingLabel="De garde cette nuit"
              badges={
                <>
                  <StatusBadge status="low">Ordonnance partielle · 2/3</StatusBadge>
                  <StatusBadge status="on-duty" />
                </>
              }
              href="#"
            />
            <PharmacyCard
              name="Pharmacie Test"
              distanceMeters={2100}
              openingLabel={`Fermée · ouvre à ${at('2026-11-05T07:00:00Z')}`}
              badges={<StatusBadge status="verify" />}
            />
            <PharmacyCard
              name="Pharmacie Fictive"
              distanceMeters={3000}
              openingLabel={`Ouverte jusqu’à ${at('2026-11-04T19:00:00Z')}`}
              badges={<StatusBadge status="unavailable">Aucun médicament disponible</StatusBadge>}
            />
          </div>
        </Section>

        <Section title="Récapitulatif du prix">
          <div className="grid gap-4 lg:grid-cols-2">
            <PriceSummary
              total={6000}
              coverage={{ ratePercent: 25, amount: 1500, insurerName: 'Assurance Démo' }}
            />
            <PriceSummary total={6000} />
          </div>
        </Section>

        <Section title="Chargement (connexion lente)">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </Section>

        <p className="type-caption text-center text-ink-muted">Exemple fictif</p>
      </main>
    </>
  );
}

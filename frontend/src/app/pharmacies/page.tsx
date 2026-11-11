import type { Metadata } from 'next';
import { BellRing, ChartNoAxesColumn, RefreshCw, Store } from 'lucide-react';
import { PageTitle } from '@/components/layout/PageTitle';
import { PublicShell } from '@/components/layout/PublicShell';
import { ApplicationForm } from '@/components/public/ApplicationForm';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PHARMACY_SPACE_ENABLED } from '@/lib/features';
import { formatFcfa } from '@/lib/format';
import { getSettings } from '@/lib/server/iwadu/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vous êtes pharmacien ?',
  description:
    'Rejoignez Iwadu Pharma : les patients de votre quartier voient que vous avez leur ordonnance et viennent chez vous.',
};

const BENEFITS = [
  {
    icon: Store,
    title: 'Plus de patients au comptoir',
    text: 'Les patients voient que vous avez toute leur ordonnance et viennent chez vous.',
  },
  {
    icon: BellRing,
    title: 'La demande de votre quartier',
    text: 'Vous voyez les médicaments que cherchent les patients autour de vous.',
  },
  {
    icon: RefreshCw,
    title: 'Stock à jour sans effort',
    text: 'Votre logiciel de gestion met le stock à jour automatiquement, ou vous le saisissez.',
  },
  {
    icon: ChartNoAxesColumn,
    title: 'Vous gardez la main',
    text: 'Horaires, gardes, assurances acceptées, affichage des prix : vous décidez.',
  },
];

export default async function PharmaciesPage() {
  const s = await getSettings();
  const monthly = s['pharmacy.subscriptionMonthly'];
  const launch = s['pharmacy.subscriptionLaunch'];
  const launchMonths = s['pharmacy.launchMonths'];
  const annual = s['pharmacy.subscriptionAnnual'];

  return (
    <PublicShell width="wide">
      <PageTitle
        overline="Pour les pharmacies"
        title="Vous êtes pharmacien ?"
        lead="Les patients de votre quartier cherchent la pharmacie qui a toute leur ordonnance. Soyez celle qu’ils trouvent."
      />
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          <ul className="grid gap-3 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <GlassPanel className="flex h-full flex-col gap-2 p-5">
                  <Icon aria-hidden className="size-6 text-action" />
                  <h2 className="type-title-3 text-ink">{title}</h2>
                  <p className="type-body-small text-ink-muted">{text}</p>
                </GlassPanel>
              </li>
            ))}
          </ul>
          {/* Abonnement pharmacie : après le MVP. */}
          {PHARMACY_SPACE_ENABLED && monthly ? (
            <GlassPanel
              as="section"
              aria-labelledby="abonnement"
              className="flex flex-col gap-2 p-5"
            >
              <h2 id="abonnement" className="type-title-3 text-ink">
                L’abonnement
              </h2>
              <p className="type-body text-ink">
                <span className="type-amount">{formatFcfa(monthly)}</span>{' '}
                <span className="text-ink-muted">par mois, sans engagement.</span>
              </p>
              {launch && launchMonths ? (
                <p className="type-body-small text-ink">
                  Offre de lancement : {formatFcfa(launch)} par mois pendant {launchMonths} mois.
                </p>
              ) : null}
              {annual ? (
                <p className="type-body-small text-ink-muted">
                  Ou {formatFcfa(annual)} pour un an.
                </p>
              ) : null}
              <p className="type-caption text-ink-muted">
                Paiement par Mobile Money depuis votre espace pharmacie.
              </p>
            </GlassPanel>
          ) : null}
        </div>
        <GlassPanel
          as="section"
          radius="sheet"
          aria-labelledby="demande"
          className="flex flex-col gap-4 p-5 lg:sticky lg:top-6"
        >
          <div>
            <h2 id="demande" className="type-title-2 text-ink">
              Rejoindre Iwadu Pharma
            </h2>
            <p className="type-body-small text-ink-muted">
              Nous vous rappelons pour activer votre pharmacie.
            </p>
          </div>
          <ApplicationForm />
        </GlassPanel>
      </div>
    </PublicShell>
  );
}

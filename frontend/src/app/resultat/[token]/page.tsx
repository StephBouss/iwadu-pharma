import type { Metadata } from 'next';
import { CircleCheck, CircleX, Lock, Moon, TriangleAlert } from 'lucide-react';
import { CarnetLabelForm } from '@/components/account/AccountForms';
import { DemoNotice, PublicShell } from '@/components/layout/PublicShell';
import { ResultView } from '@/components/result/ResultView';
import { UnlockCard } from '@/components/result/UnlockCard';
import { ButtonLink } from '@/components/ui/Button';
import { GlassDark } from '@/components/ui/GlassDark';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatClock, formatDistance, formatFcfa } from '@/lib/format';
import { buildOffers } from '@/lib/server/iwadu/offers';
import { isSimulatorEnabled } from '@/lib/server/iwadu/payments/provider';
import { getSearchView, type SearchView } from '@/lib/server/iwadu/search';
import { getSettings } from '@/lib/server/iwadu/settings';
import { getViewer } from '@/lib/server/iwadu/viewer';

// Résultat d'une ordonnance (maquette Banani « Résultat gratuit »).
//   • Aperçu gratuit : combien de pharmacies ont tout, la distance de la plus
//     proche, la fourchette et l'écart de prix plein, combien en ont une
//     partie, l'heure du stock — jamais un nom de pharmacie.
//   • Verrouillé (aperçus gratuits utilisés) : déblocage ou Pass proposés.
//   • Débloqué : la liste, la carte, les prix, l'assurance (ResultView).

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Votre résultat',
  robots: { index: false, follow: false },
};

type Ready = Extract<SearchView, { state: 'ready' }>;

const SOURCE_LABELS: Record<string, string> = {
  PAID: 'Ordonnance débloquée.',
  PASS: 'Ordonnance débloquée avec votre Pass.',
  OFFERED: 'Ordonnance offerte avec votre compte.',
  CREDIT: 'Ordonnance débloquée avec un crédit.',
  DISCOVERY: 'Ordonnance débloquée.',
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

function stockWindow(view: Ready): string | null {
  const { stockFrom, stockTo } = view.summary;
  if (!stockFrom || !stockTo) return null;
  const a = formatClock(new Date(stockFrom));
  const b = formatClock(new Date(stockTo));
  return a === b ? `Stocks mis à jour à ${a}` : `Stocks mis à jour entre ${a} et ${b}`;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <GlassDark className="flex flex-col items-center gap-1 p-4 text-center md:p-5">
      <p className="font-display text-2xl font-bold text-mint tabular-nums md:text-4xl">{value}</p>
      <p className="type-body-small text-surface/85">{label}</p>
    </GlassDark>
  );
}

function PreviewHero({
  view,
  previewTotal,
  windowDays,
}: {
  view: Ready;
  previewTotal: number | null;
  windowDays: number | null;
}) {
  const s = view.summary;
  const total = view.medicines.length;
  const found = s.completeCount + s.partialCount;
  const window = stockWindow(view);

  if (view.access.kind === 'locked') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-surface/14">
          <Lock aria-hidden className="size-7 text-mint" />
        </span>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Vos aperçus gratuits sont utilisés
        </h1>
        <p className="type-body max-w-xl text-surface/85 md:text-lg">
          {previewTotal && windowDays
            ? `Vous avez utilisé vos ${previewTotal} aperçus gratuits des ${windowDays} derniers jours. `
            : ''}
          Débloquez cette ordonnance, ou prenez un Pass pour chercher sans compter.
        </p>
      </div>
    );
  }

  if (found === 0) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <CircleX aria-hidden className="size-8 text-muted" />
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Aucune pharmacie</h1>
        <p className="type-body max-w-xl text-surface/85 md:text-lg">
          Aucune pharmacie partenaire proche n’a ces médicaments pour l’instant. Vous ne payez rien.
        </p>
        <StatusBadge status="unavailable" />
      </div>
    );
  }

  const complete = s.completeCount > 0;
  return (
    <div className="flex flex-col gap-8">
      <p className="type-overline flex items-center justify-center gap-2 text-mint md:justify-start">
        {complete ? (
          <CircleCheck aria-hidden className="size-5" />
        ) : (
          <TriangleAlert aria-hidden className="size-5" />
        )}
        {complete ? 'Bonne nouvelle' : 'Résultat partiel'}
      </p>
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-7xl leading-none font-bold tabular-nums md:text-[6.25rem]">
          {complete ? s.completeCount : s.partialCount}
        </p>
        <h1 className="font-display text-2xl leading-tight font-semibold md:text-[2rem]">
          {complete
            ? total > 1
              ? `${s.completeCount > 1 ? 'pharmacies ont' : 'pharmacie a'} toute votre ordonnance`
              : `${s.completeCount > 1 ? 'pharmacies ont' : 'pharmacie a'} ce médicament`
            : `${s.partialCount > 1 ? 'pharmacies ont' : 'pharmacie a'} une partie de votre ordonnance`}
        </h1>
        <StatusBadge status={complete ? 'available' : 'low'}>
          {complete ? 'Ordonnance complète' : 'Ordonnance partielle'}
        </StatusBadge>
        {!complete && s.bestPartial && (
          <p className="type-body text-surface/85">
            La mieux fournie en a {s.bestPartial.found} sur {total}.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat
          value={String(complete ? s.partialCount : s.completeCount)}
          label={complete ? 'l’ont en partie' : 'l’ont en entier'}
        />
        <Stat
          value={s.nearestMeters !== null ? formatDistance(s.nearestMeters) : '—'}
          label="la plus proche"
        />
        <Stat
          value={s.priceMin !== null ? formatFcfa(s.priceMin) : '—'}
          label={
            s.priceMax !== null && s.priceMax !== s.priceMin
              ? `à ${formatFcfa(s.priceMax)}, prix plein`
              : 'prix plein'
          }
        />
        <Stat
          value={
            s.priceMin !== null && s.priceMax !== null ? formatFcfa(s.priceMax - s.priceMin) : '—'
          }
          label="d’écart entre pharmacies"
        />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        {window && <p className="type-body-small text-surface/80">{window}</p>}
        <p className="type-caption text-surface/75">
          Prix plein, sans assurance. Le calcul avec votre assurance fait partie du déblocage.
        </p>
        <DemoNotice show={s.hasDemo} tone="dark" />
      </div>
    </div>
  );
}

export default async function ResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewer = await getViewer();
  const view = await getSearchView(token, viewer);

  if (view.state !== 'ready') {
    return (
      <PublicShell width="patient">
        <h1 className="type-title-1 text-ink">
          {view.state === 'expired' ? 'Ce lien a expiré' : 'Résultat introuvable'}
        </h1>
        <Message
          tone="info"
          title="Les stocks changent vite : relancez une recherche pour des informations à jour."
        />
        <ButtonLink href="/ordonnance" fullWidth>
          Nouvelle recherche
        </ButtonLink>
      </PublicShell>
    );
  }

  const settings = await getSettings();
  const total = view.medicines.length;
  const found = view.summary.completeCount + view.summary.partialCount;

  if (view.access.kind === 'unlocked') {
    return (
      <PublicShell width="wide">
        <div className="flex flex-col gap-1 pt-2">
          <h1 className="type-display text-brand">Vos pharmacies</h1>
          <p className="type-body-small text-ink-muted">
            {plural(total, 'médicament', 'médicaments')}
            {view.label ? ` · Pour ${view.label}` : ''} · Recherche de{' '}
            {formatClock(new Date(view.createdAt))}
          </p>
        </div>
        {found === 0 ? (
          <Message tone="info" title="Plus aucune pharmacie de ce résultat n’a ces médicaments.">
            Relancez une recherche pour des stocks à jour.
          </Message>
        ) : (
          <ResultView
            token={token}
            medicinesCount={total}
            pharmacies={view.pharmacies}
            sourceLabel={SOURCE_LABELS[view.access.source] ?? 'Ordonnance débloquée.'}
            expiresAt={view.expiresAt}
            viewerInsurance={view.viewerInsurance}
            loggedIn={Boolean(viewer.user)}
            // La garantie est réservée à qui a fait la recherche, pas à qui
            // a reçu le lien.
            reportHours={view.isOwner ? settings['guarantee.tripReportHours'] : null}
          />
        )}
        {viewer.user && view.isOwner && (
          <CarnetLabelForm searchToken={token} initialLabel={view.label} />
        )}
      </PublicShell>
    );
  }

  const offers = buildOffers(settings);
  const bands = view.summary.bands.slice(0, 6);

  return (
    <PublicShell
      width="wide"
      hero={
        <PreviewHero
          view={view}
          previewTotal={settings['preview.freeCount']}
          windowDays={settings['preview.windowDays']}
        />
      }
      className="pt-10 md:pt-14"
    >
      {found === 0 ? (
        <section className="flex flex-col items-center gap-6 py-6 text-center">
          <p className="type-body max-w-xl text-ink-muted md:text-lg">
            Les médicaments recherchés ne sont disponibles dans aucune pharmacie partenaire proche.
            Les pharmacies de garde peuvent avoir d’autres stocks : appelez avant de vous déplacer.
          </p>
          <ButtonLink href="/gardes" size="lg" leadingIcon={<Moon aria-hidden />}>
            Voir les pharmacies de garde
          </ButtonLink>
          <ButtonLink href="/ordonnance" variant="ghost">
            Modifier ma recherche
          </ButtonLink>
        </section>
      ) : (
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <section aria-labelledby="laquelle" className="flex flex-col gap-4">
            <h2 id="laquelle" className="type-title-1 text-ink">
              {view.access.kind === 'locked'
                ? 'Débloquez pour savoir où aller'
                : view.summary.completeCount > 0
                  ? 'Une seule pharmacie à visiter. Laquelle ?'
                  : 'Où trouver le plus de médicaments ?'}
            </h2>
            {view.access.kind === 'preview' && bands.length > 0 && (
              <ul className="flex flex-col gap-4" aria-label="Pharmacies verrouillées">
                {bands.map((band, i) => (
                  <li key={`${band}-${i}`}>
                    <GlassPanel className="relative flex flex-col gap-4 overflow-hidden p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                        <div className="flex min-w-0 items-start gap-3">
                          <Lock aria-hidden className="mt-0.5 size-6 shrink-0 text-action" />
                          <div className="flex flex-col">
                            <p className="type-body-strong text-ink-muted italic md:text-lg">
                              Pharmacie verrouillée
                            </p>
                            <p className="type-body-small text-ink-muted">{band}</p>
                          </div>
                        </div>
                        <StatusBadge status="available">Ordonnance complète</StatusBadge>
                      </div>
                      <div aria-hidden className="grid grid-cols-3 gap-3">
                        {view.medicines.slice(0, 3).map((m) => (
                          <span
                            key={m.productId}
                            className="type-caption rounded-field border border-mint/20 bg-mint/10 p-3 text-center tracking-widest text-ink-muted/50"
                          >
                            •••••••
                          </span>
                        ))}
                      </div>
                    </GlassPanel>
                  </li>
                ))}
              </ul>
            )}
            {view.access.kind === 'preview' && view.summary.completeCount === 0 && (
              <Message tone="info" title="Aucune pharmacie proche n’a toute l’ordonnance.">
                Débloquez pour voir ce que chacune possède, et où trouver le reste.
              </Message>
            )}
            <GlassPanel className="flex flex-col gap-2 p-5">
              <p className="type-body-strong text-ink">
                Votre ordonnance · {plural(total, 'médicament', 'médicaments')}
              </p>
              <ul className="flex flex-col gap-1">
                {view.medicines.map((m) => (
                  <li key={m.productId} className="type-body-small text-ink-muted">
                    {m.label} · {plural(m.quantity, 'boîte', 'boîtes')}
                  </li>
                ))}
              </ul>
              {view.access.kind === 'preview' && view.previewsLeft !== null && (
                <p className="type-caption text-ink-muted">
                  Aperçus gratuits restants : {view.previewsLeft}.
                </p>
              )}
            </GlassPanel>
          </section>

          <UnlockCard
            token={token}
            completeCount={view.summary.completeCount}
            partial={view.summary.partialCount > 0}
            offers={offers}
            loggedIn={Boolean(viewer.user)}
            pass={view.options.pass}
            passBlocked={view.options.passBlocked}
            offered={view.options.offered}
            offerForAccounts={Boolean(settings['account.firstUnlockOffered'])}
            credits={view.options.credits}
            linkHours={settings['result.linkHours']}
            guarantee={settings['guarantee.tripText']}
            defaultPhone={viewer.user?.phone ?? null}
            simulated={isSimulatorEnabled()}
          />
        </div>
      )}
    </PublicShell>
  );
}

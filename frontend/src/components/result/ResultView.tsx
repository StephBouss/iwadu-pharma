'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CircleCheck, CircleSlash, Clock, List, Map as MapIcon, Share2, Store } from 'lucide-react';
import { CallLink, DirectionsLink } from '@/components/pharmacy/PharmacyActions';
import { InsuranceCalculator } from '@/components/pharmacy/InsuranceCalculator';
import { MedicineList, type MedicineLine } from '@/components/pharmacy/MedicineList';
import { PharmacyCard } from '@/components/pharmacy/PharmacyCard';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge, type Status } from '@/components/ui/StatusBadge';
import { publicApi } from '@/lib/client/session';
import { formatClock, formatDayMonth, formatFcfa } from '@/lib/format';
import { prescriptionCoverage } from '@/lib/prescription';
import type { ResultPharmacy } from '@/lib/server/iwadu/search';
import { cn } from '@/lib/utils';
import { ReportMissing } from './ReportMissing';

// Résultat débloqué : en liste ou sur la carte. D'abord les pharmacies qui
// ont tout, puis la distance, puis le prix. Pour la pharmacie choisie : le
// détail par médicament, le prix exact, le calcul avec l'assurance, les
// actions. Le lien se partage sur WhatsApp ; il affiche sa validité.
// Mobile : la liste puis le détail. Ordinateur : la liste à gauche, le
// détail fixe à droite.

const PharmacyMap = dynamic(() => import('@/components/map/PharmacyMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-card" />,
});

function lineStatus(status: ResultPharmacy['lines'][number]['status'], stale: boolean): Status {
  if (status === 'unavailable') return 'unavailable';
  return stale ? 'verify' : status;
}

export function ResultView({
  token,
  medicinesCount,
  pharmacies,
  sourceLabel,
  expiresAt,
  viewerInsurance,
  loggedIn,
  reportHours,
}: {
  token: string;
  medicinesCount: number;
  pharmacies: ResultPharmacy[];
  sourceLabel: string;
  expiresAt: string;
  viewerInsurance: { id: string; name: string; rate: number | null } | null;
  loggedIn: boolean;
  reportHours: number | null;
}) {
  const [selectedSlug, setSelectedSlug] = useState(pharmacies[0]?.slug ?? null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [copied, setCopied] = useState(false);
  const detailRef = useRef<HTMLHeadingElement>(null);

  const selected = pharmacies.find((p) => p.slug === selectedSlug) ?? pharmacies[0] ?? null;
  const hasDemo = pharmacies.some((p) => p.isDemo);
  const cheapest = pharmacies
    .filter((p) => p.found === medicinesCount && p.invoice !== null)
    .reduce<ResultPharmacy | null>(
      (m, p) => (!m || (p.invoice ?? 0) < (m.invoice ?? 0) ? p : m),
      null,
    );
  const expires = new Date(expiresAt);

  if (!selected) {
    return (
      <Message tone="info" title="Ces pharmacies ne sont plus disponibles.">
        <Link href="/ordonnance" className="font-semibold text-action hover:underline">
          Relancer une recherche
        </Link>
      </Message>
    );
  }

  function choose(slug: string) {
    setSelectedSlug(slug);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        detailRef.current?.focus({ preventScroll: true });
      });
    }
  }

  async function share() {
    const url = `${window.location.origin}/resultat/${token}`;
    const text = `Les pharmacies qui ont mon ordonnance, sur Iwadu Pharma (lien valable jusqu’au ${formatDayMonth(expires).toLowerCase()} à ${formatClock(expires)}) : ${url}`;
    void publicApi('/api/events', { method: 'POST', body: { name: 'share_clicked' } }).catch(
      () => undefined,
    );
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/resultat/${token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const medicines: MedicineLine[] = selected.lines.map((l) => ({
    id: l.productId,
    name: l.label,
    dosage:
      l.unitPriceFcfa !== null && selected.showPrices && l.status !== 'unavailable'
        ? `· ${formatFcfa(l.unitPriceFcfa * l.quantity)}`
        : '',
    quantity: l.quantity,
    status: lineStatus(l.status, selected.stale),
  }));
  const missing = selected.lines.filter((l) => l.status === 'unavailable');
  const complete = selected.found === medicinesCount;

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6">
      <section aria-labelledby="pharmacies" className="flex flex-col gap-3">
        <GlassPanel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="type-body-small flex items-start gap-2 text-ink">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-available" />
            <span>
              {sourceLabel} Lien à jour jusqu’au {formatDayMonth(expires).toLowerCase()} à{' '}
              {formatClock(expires)}.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Share2 aria-hidden />}
              onClick={() => void share()}
            >
              Partager sur WhatsApp
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void copy()}>
              {copied ? 'Lien copié' : 'Copier le lien'}
            </Button>
          </div>
        </GlassPanel>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="pharmacies" className="type-title-2 text-ink">
            Pharmacies autour de vous
          </h2>
          <div
            role="group"
            aria-label="Affichage"
            className="flex rounded-full border border-hairline bg-surface p-1"
          >
            {(
              [
                { v: 'list', label: 'Liste', icon: List },
                { v: 'map', label: 'Carte', icon: MapIcon },
              ] as const
            ).map((b) => (
              <button
                key={b.v}
                type="button"
                aria-pressed={view === b.v}
                onClick={() => setView(b.v)}
                className="type-label flex h-10 items-center gap-1.5 rounded-full px-3 text-ink-muted aria-pressed:bg-action aria-pressed:text-surface"
              >
                <b.icon aria-hidden className="size-4" />
                {b.label}
              </button>
            ))}
          </div>
        </div>
        {hasDemo && (
          <p className="type-caption text-ink-muted">Démonstration · pharmacies et prix fictifs.</p>
        )}

        {view === 'map' && (
          <div className="overflow-hidden rounded-card border border-hairline">
            <PharmacyMap pharmacies={pharmacies} position={null} />
          </div>
        )}

        <ul className="flex flex-col gap-3 xl:grid xl:grid-cols-2 xl:gap-4">
          {pharmacies.map((p) => {
            const cov = prescriptionCoverage(p.found, medicinesCount);
            const isSelected = p.slug === selected.slug;
            return (
              <li key={p.slug} className="flex">
                <PharmacyCard
                  className="w-full"
                  name={p.name}
                  titleHref={`/pharmacie/${p.slug}?r=${token}`}
                  distanceMeters={p.distanceMeters}
                  openingLabel={p.openingLabel}
                  onDuty={p.onDuty}
                  highlighted={isSelected}
                  stockUpdatedAt={p.stockUpdatedAt ? new Date(p.stockUpdatedAt) : undefined}
                  badges={
                    <>
                      <StatusBadge status={cov.status}>{cov.label}</StatusBadge>
                      {p.stale && <StatusBadge status="verify">Stock à vérifier</StatusBadge>}
                      {cheapest?.slug === p.slug && (
                        <StatusBadge status="available">La moins chère</StatusBadge>
                      )}
                    </>
                  }
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      aria-pressed={isSelected}
                      onClick={() => choose(p.slug)}
                      className="col-span-2"
                    >
                      {isSelected ? 'Détail affiché' : 'Voir le détail et le prix'}
                    </Button>
                  }
                >
                  <div className="flex flex-col gap-1">
                    <p className="type-body-strong text-ink">
                      {p.showPrices && p.invoice !== null
                        ? `Montant estimé : ${formatFcfa(p.invoice)}`
                        : 'Prix en pharmacie'}
                    </p>
                    {viewerInsurance && p.acceptsViewerInsurance !== null && (
                      <p className="type-caption flex items-center gap-1.5 text-ink-muted">
                        {p.acceptsViewerInsurance ? (
                          <CircleCheck aria-hidden className="size-3.5 text-available" />
                        ) : (
                          <CircleSlash aria-hidden className="size-3.5" />
                        )}
                        {p.acceptsViewerInsurance
                          ? `Accepte ${viewerInsurance.name}`
                          : `N’accepte pas ${viewerInsurance.name}`}
                      </p>
                    )}
                  </div>
                </PharmacyCard>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <GlassPanel as="section" aria-labelledby="detail" className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-mint-soft text-action">
              <Store aria-hidden className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h2
                id="detail"
                ref={detailRef}
                tabIndex={-1}
                className="type-title-2 text-ink outline-none"
              >
                {selected.name}
              </h2>
              <p className="type-body-small text-ink-muted">
                {[selected.address ?? selected.districtName, selected.openingLabel]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <MedicineList medicines={medicines} />
          {missing.length > 0 && (
            <MissingHelp
              missing={missing.map((m) => m.productId)}
              labels={Object.fromEntries(missing.map((m) => [m.productId, m.label]))}
              pharmacies={pharmacies.filter((p) => p.slug !== selected.slug)}
            />
          )}
          {selected.stockUpdatedAt && (
            <p className="type-caption flex items-center gap-1.5 text-ink-muted">
              <Clock aria-hidden className="size-3.5" />
              Stock mis à jour à {formatClock(new Date(selected.stockUpdatedAt))}
              {selected.stale ? ' : disponibilité à vérifier par téléphone.' : '.'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <DirectionsLink
              slug={selected.slug}
              lat={selected.lat}
              lng={selected.lng}
              variant="primary"
            />
            <CallLink slug={selected.slug} phone={selected.phone} />
          </div>
          <Link
            href={`/pharmacie/${selected.slug}?r=${token}`}
            className="type-label min-h-11 self-start text-action hover:underline"
          >
            Voir la fiche de la pharmacie
          </Link>
        </GlassPanel>

        <GlassPanel className="flex flex-col gap-4 p-5">
          {selected.showPrices && selected.invoice !== null ? (
            <InsuranceCalculator
              key={selected.slug}
              total={selected.invoice}
              insurances={selected.insurances}
              prefill={
                viewerInsurance
                  ? { insuranceId: viewerInsurance.id, rate: viewerInsurance.rate }
                  : null
              }
            />
          ) : (
            <p className="type-body-small text-ink">
              Cette pharmacie communique ses prix au comptoir : prix en pharmacie.
            </p>
          )}
        </GlassPanel>

        {complete && reportHours !== null && (
          <ReportMissing
            token={token}
            slug={selected.slug}
            loggedIn={loggedIn}
            hours={reportHours}
          />
        )}
      </div>
    </div>
  );
}

/** Ce qui manque dans cette pharmacie, et où le trouver parmi les autres. */
function MissingHelp({
  missing,
  labels,
  pharmacies,
}: {
  missing: string[];
  labels: Record<string, string>;
  pharmacies: ResultPharmacy[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-field bg-low-soft/60 p-4">
      <p className="type-body-strong text-ink">
        {missing.length > 1
          ? `${missing.length} médicaments manquent ici`
          : 'Un médicament manque ici'}
      </p>
      <ul className="flex flex-col gap-1">
        {missing.map((id) => {
          const where = pharmacies.find((p) =>
            p.lines.some((l) => l.productId === id && l.status !== 'unavailable'),
          );
          return (
            <li key={id} className={cn('type-body-small text-ink')}>
              {labels[id]} :{' '}
              {where ? (
                <span className="font-semibold">chez {where.name}</span>
              ) : (
                'demandez un équivalent au pharmacien'
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

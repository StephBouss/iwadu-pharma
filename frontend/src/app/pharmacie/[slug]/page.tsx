import type { Metadata } from 'next';
import Link from 'next/link';
import { after } from 'next/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, CircleCheck, Clock, Info, MapPin, Moon, Phone } from 'lucide-react';
import { DemoNotice, PublicShell } from '@/components/layout/PublicShell';
import { LazyMap } from '@/components/map/LazyMap';
import { InsuranceCalculator } from '@/components/pharmacy/InsuranceCalculator';
import { MedicineList } from '@/components/pharmacy/MedicineList';
import { CallLink, DirectionsLink } from '@/components/pharmacy/PharmacyActions';
import { ReportMissing } from '@/components/result/ReportMissing';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatClock, formatDayMonth, formatDistance, formatFcfa } from '@/lib/format';
import { WEEKDAY_LABELS, dayHoursLabel, localDayAndMinute } from '@/lib/opening-hours';
import { track } from '@/lib/server/iwadu/analytics';
import { getPharmacyBySlug } from '@/lib/server/iwadu/pharmacies';
import { getUnlockedPharmacy } from '@/lib/server/iwadu/search';
import { getSettings } from '@/lib/server/iwadu/settings';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { cn } from '@/lib/utils';

// Fiche pharmacie (maquette Banani « Fiche Pharmacie »), sans réservation
// (reportée en V2). Adresse, téléphone, itinéraire ; horaires et gardes ;
// assurances acceptées. Venue d'un résultat débloqué (?r=jeton) : le détail
// par médicament, le prix et le calcul avec l'assurance choisie ici.

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ r?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPharmacyBySlug(slug);
  if (!p) return { title: 'Pharmacie introuvable' };
  return {
    title: p.name,
    description: `${p.name}${p.district ? `, ${p.district.name}` : ''} : horaires, gardes, assurances acceptées, téléphone et itinéraire.`,
  };
}

export default async function PharmacyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { r } = await searchParams;
  const p = await getPharmacyBySlug(slug);
  if (!p) notFound();

  const viewer = await getViewer();
  const fromResult =
    r && /^[A-Za-z0-9_-]{16,64}$/.test(r) ? await getUnlockedPharmacy(r, slug, viewer) : null;
  const settings = await getSettings();
  after(() =>
    track(
      'pharmacy_viewed',
      { userId: viewer.user?.id, deviceId: viewer.deviceId, districtId: p.districtId },
      { pharmacyId: p.id },
    ),
  );

  const today = localDayAndMinute(new Date()).day;
  const hit = fromResult?.pharmacy ?? null;
  const total = fromResult?.view.medicines.length ?? 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: p.name,
    telephone: p.phone ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: p.address ?? undefined,
      addressLocality: p.district?.name ?? undefined,
      addressCountry: 'GA',
    },
    geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
  };

  return (
    <PublicShell
      width="wide"
      hero={
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <div className="flex flex-col gap-5 lg:w-[30rem] lg:shrink-0">
            <Link
              href={r ? `/resultat/${r}` : '/'}
              className="type-label flex min-h-11 items-center gap-2 self-start text-mint hover:text-surface"
            >
              <ArrowLeft aria-hidden className="size-4.5" />
              {r ? 'Retour aux résultats' : 'Retour à l’accueil'}
            </Link>
            <p className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  'size-2.5 rounded-full',
                  p.opening.open || p.opening.onDuty
                    ? 'bg-mint shadow-[0_0_8px_#6fdcc0]'
                    : 'bg-surface/50',
                )}
              />
              <span className="type-body-strong text-mint">{p.opening.label}</span>
              {p.opening.onDuty && <StatusBadge status="on-duty" />}
            </p>
            <h1 className="font-display text-3xl leading-tight font-bold md:text-5xl">{p.name}</h1>
            <ul className="flex flex-col gap-3">
              <li className="type-body flex items-start gap-3 text-surface/85">
                <MapPin aria-hidden className="mt-0.5 size-4.5 shrink-0 text-mint" />
                <span>
                  {[p.address, p.district?.name].filter(Boolean).join(', ') ||
                    'Adresse à confirmer par téléphone'}
                  {hit && (
                    <span className="text-mint"> · {formatDistance(hit.distanceMeters)}</span>
                  )}
                </span>
              </li>
              {p.phone && (
                <li className="type-body flex items-center gap-3 text-surface/85">
                  <Phone aria-hidden className="size-4.5 shrink-0 text-mint" />
                  {p.phone}
                </li>
              )}
            </ul>
            <div className="grid grid-cols-2 gap-3">
              <DirectionsLink
                slug={p.slug}
                lat={p.lat}
                lng={p.lng}
                variant="primary"
                className="h-13 bg-mint text-ink hover:bg-mint-soft"
              />
              <CallLink
                slug={p.slug}
                phone={p.phone}
                className="h-13 border-surface/30 bg-surface/14 text-surface hover:bg-surface/22"
              />
            </div>
            <DemoNotice show={p.isDemo} tone="dark" />
          </div>
          <div className="min-h-72 flex-1 overflow-hidden rounded-sheet border border-mint/20">
            <LazyMap
              pharmacies={[
                {
                  slug: p.slug,
                  name: p.name,
                  lat: p.lat,
                  lng: p.lng,
                  onDuty: p.opening.onDuty,
                  openingLabel: p.opening.label,
                },
              ]}
            />
          </div>
        </div>
      }
      className="pt-10 md:pt-16"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <div className="flex flex-col gap-8 lg:w-2/5">
          <section aria-labelledby="horaires" className="flex flex-col gap-4">
            <h2 id="horaires" className="type-display text-brand">
              Horaires
            </h2>
            <GlassPanel className="overflow-hidden">
              <ul>
                {WEEKDAY_LABELS.map((label, i) => {
                  const isToday = i + 1 === today;
                  return (
                    <li
                      key={label}
                      className={cn(
                        'flex items-center justify-between gap-3 border-b border-ink/7 px-5 py-4 last:border-b-0',
                        isToday && 'bg-mint/10',
                      )}
                    >
                      <span
                        className={cn(
                          'type-body',
                          isToday ? 'font-bold text-ink' : 'text-ink-muted',
                        )}
                      >
                        {label}
                        {isToday && (
                          <span className="type-caption ml-2 rounded-full bg-available-soft px-2 py-0.5 text-available">
                            Aujourd’hui
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          'type-body tabular-nums',
                          isToday ? 'font-bold text-ink' : 'text-ink-muted',
                        )}
                      >
                        {dayHoursLabel(p.hours, i + 1)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </GlassPanel>
            {p.dutyShifts.length > 0 && (
              <GlassPanel className="flex flex-col gap-2 p-5">
                <p className="type-body-strong flex items-center gap-2 text-ink">
                  <Moon aria-hidden className="size-4 text-action" />
                  Prochaines gardes
                </p>
                <ul className="flex flex-col gap-1">
                  {p.dutyShifts.map((s) => (
                    <li key={s.startsAt.toISOString()} className="type-body-small text-ink-muted">
                      {formatDayMonth(s.startsAt)}, de {formatClock(s.startsAt)} à{' '}
                      {formatClock(s.endsAt)}
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            )}
          </section>

          <section aria-labelledby="assurances" className="flex flex-col gap-4">
            <h2 id="assurances" className="type-title-1 text-brand">
              Assurances acceptées
            </h2>
            <GlassPanel className="flex flex-col gap-1 p-5">
              {p.acceptedInsurances.length === 0 ? (
                <p className="type-body text-ink-muted">
                  Aucune assurance déclarée par la pharmacie.
                </p>
              ) : (
                <ul>
                  {p.acceptedInsurances.map((ins) => (
                    <li key={ins.id} className="type-body flex items-center gap-3 py-2 text-ink">
                      <CircleCheck aria-hidden className="size-4.5 text-available" />
                      {ins.name}
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          </section>
        </div>

        <section aria-labelledby="ici" className="flex flex-col gap-4 lg:w-3/5">
          <h2 id="ici" className="type-display text-brand">
            {hit ? 'Votre ordonnance ici' : 'Votre ordonnance'}
          </h2>
          {hit && fromResult ? (
            <GlassPanel className="flex flex-col gap-6 p-5 md:p-8">
              <MedicineList
                medicines={hit.lines.map((l) => ({
                  id: l.productId,
                  name: l.label,
                  dosage:
                    l.unitPriceFcfa !== null && hit.showPrices && l.status !== 'unavailable'
                      ? `· ${formatFcfa(l.unitPriceFcfa * l.quantity)}`
                      : '',
                  quantity: l.quantity,
                  status:
                    l.status === 'unavailable' ? 'unavailable' : hit.stale ? 'verify' : l.status,
                }))}
              />
              {hit.stockUpdatedAt && (
                <p className="type-caption flex items-center gap-1.5 text-ink-muted">
                  <Clock aria-hidden className="size-3.5" />
                  Stock mis à jour à {formatClock(new Date(hit.stockUpdatedAt))}
                  {hit.stale ? ' : disponibilité à vérifier par téléphone.' : '.'}
                </p>
              )}
              {hit.showPrices && hit.invoice !== null ? (
                <InsuranceCalculator
                  total={hit.invoice}
                  insurances={hit.insurances}
                  prefill={
                    fromResult.view.viewerInsurance
                      ? {
                          insuranceId: fromResult.view.viewerInsurance.id,
                          rate: fromResult.view.viewerInsurance.rate,
                        }
                      : null
                  }
                />
              ) : (
                <p className="type-body-small flex gap-2 text-ink">
                  <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-verify" />
                  Cette pharmacie communique ses prix au comptoir : prix en pharmacie.
                </p>
              )}
            </GlassPanel>
          ) : (
            <GlassPanel className="flex flex-col gap-3 p-5 md:p-8">
              <p className="type-body text-ink">
                Pour voir le prix de vos médicaments ici et votre reste à payer avec votre
                assurance, photographiez votre ordonnance.
              </p>
              <Link
                href="/ordonnance?depart=photo"
                className="type-label min-h-11 self-start text-action hover:underline"
              >
                Photographier mon ordonnance
              </Link>
            </GlassPanel>
          )}
          {hit && r && hit.found === total && settings['guarantee.tripReportHours'] !== null && (
            <ReportMissing
              token={r}
              slug={p.slug}
              loggedIn={Boolean(viewer.user)}
              hours={settings['guarantee.tripReportHours']}
            />
          )}
        </section>
      </div>
    </PublicShell>
  );
}

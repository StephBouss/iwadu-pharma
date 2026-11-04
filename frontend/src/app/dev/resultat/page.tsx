import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Info } from 'lucide-react';
import { BgShapes } from '@/components/brand/BgShapes';
import { AppHeader } from '@/components/layout/AppHeader';
import { MedicineList } from '@/components/pharmacy/MedicineList';
import { PharmacyCard } from '@/components/pharmacy/PharmacyCard';
import { PriceSummary } from '@/components/pharmacy/PriceSummary';
import { ReserveBar } from '@/components/pharmacy/ReserveBar';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DEMO_SEARCH_RESULT } from '@/lib/demo/search-result';
import { formatClock } from '@/lib/format';
import { prescriptionCoverage, sortPharmaciesForResult } from '@/lib/prescription';
import { cn } from '@/lib/utils';

// Aperçu de la maquette Banani « Résultats ordonnance » avec des données
// FICTIVES. Développement uniquement (404 en production).
//
// Mobile : l'ordre de la maquette, l'action « Réserver et payer » collée en
// bas de l'écran. Ordinateur (lg) : les pharmacies à gauche (2 colonnes à
// partir de xl), à droite un panneau fixe avec les médicaments, le prix et
// l'action.

export const metadata: Metadata = {
  title: 'Résultat de votre ordonnance (aperçu)',
  robots: { index: false, follow: false },
};

export default function SearchResultPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const result = DEMO_SEARCH_RESULT;
  const total = result.medicines.length;
  const pharmacies = sortPharmaciesForResult(
    result.pharmacies.map((p) => ({ ...p, found: p.inStock.length })),
    total,
  );
  const best = pharmacies[0];
  if (!best) notFound();
  const bestIsComplete = best.found === total;

  const medicines = result.medicines.map((m) => ({
    ...m,
    status: best.inStock.includes(m.id) ? ('available' as const) : ('unavailable' as const),
  }));
  const remaining = result.price.total - result.price.coverage.amount;

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <BgShapes />

      <div className="relative mx-auto flex w-full max-w-patient flex-col gap-4 px-4 pt-4 pb-3 lg:max-w-6xl lg:gap-6 lg:px-6 lg:pt-6 lg:pb-10">
        <AppHeader subtitle={`Près de votre position · ${result.district}`} />

        <main className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="type-title-1 text-brand lg:type-display">Votre ordonnance</h1>
              <p className="type-body-small text-ink-muted">
                {total} médicaments trouvés · Mis à jour à {formatClock(result.updatedAt)}
              </p>
              <p className="type-caption text-ink-muted">Exemple fictif</p>
            </div>

            <section aria-labelledby="pharmacies-title" className="flex flex-col gap-3">
              <h2 id="pharmacies-title" className="type-title-3 sr-only text-ink lg:not-sr-only">
                Pharmacies autour de vous
              </h2>
              <div className="flex flex-col gap-3 lg:gap-4 xl:grid xl:grid-cols-2">
                {pharmacies.map((pharmacy, i) => {
                  const coverage = prescriptionCoverage(pharmacy.found, total);
                  return (
                    <PharmacyCard
                      key={pharmacy.slug}
                      name={pharmacy.name}
                      distanceMeters={pharmacy.distanceMeters}
                      openingLabel={pharmacy.openingLabel}
                      onDuty={pharmacy.onDuty}
                      highlighted={i === 0 && bestIsComplete}
                      badges={<StatusBadge status={coverage.status}>{coverage.label}</StatusBadge>}
                      stockUpdatedAt={pharmacy.stockUpdatedAt}
                      href={`/pharmacie/${pharmacy.slug}`}
                    />
                  );
                })}
              </div>
            </section>

            <AiReadingNote className="hidden lg:flex" />
          </div>

          {/* Mobile : « contents » fond ce bloc dans la colonne, pour que la
              barre d'action reste collée en bas sur toute la page. */}
          <div className="contents lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-4">
            <GlassPanel
              as="section"
              aria-labelledby="medicines-title"
              className="hidden flex-col gap-4 p-5 lg:flex"
            >
              <div>
                <h2 id="medicines-title" className="type-title-3 text-ink">
                  Votre ordonnance
                </h2>
                <p className="type-body-small text-ink-muted">Chez {best.name}</p>
              </div>
              <MedicineList medicines={medicines} />
            </GlassPanel>

            <PriceSummary total={result.price.total} coverage={result.price.coverage} />

            {/* Sur ordinateur, la note passe sous les pharmacies : la colonne
                de droite garde l'action principale visible sans défiler. */}
            <AiReadingNote className="lg:hidden" />

            <ReserveBar
              amount={remaining}
              href="/connexion"
              demo
              className="sticky bottom-3 z-10 lg:static"
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function AiReadingNote({ className }: { className?: string }) {
  return (
    <GlassPanel className={cn('flex gap-3 p-4', className)}>
      <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-verify" />
      <p className="type-body-small text-ink">
        L’IA lit l’ordonnance ; le pharmacien valide toujours la délivrance.
      </p>
    </GlassPanel>
  );
}

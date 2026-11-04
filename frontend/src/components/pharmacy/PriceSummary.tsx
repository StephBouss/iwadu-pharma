import { Info } from 'lucide-react';
import { Amount } from '@/components/ui/Amount';
import { formatFcfa, NBSP } from '@/lib/format';
import { cn } from '@/lib/utils';

// Charte V1.0 — récapitulatif du prix. Tant que la pharmacie n'a pas
// confirmé : « Prise en charge déclarée » et « Reste à payer estimé » ;
// sans assurance : « Montant estimé ». Toujours une estimation.
//
// Ce composant AFFICHE des montants déjà calculés côté serveur (part de
// l'assurance = taux × médicaments remboursables, arrondi au franc) ; il ne
// recalcule que le reste à payer, qui vaut toujours le total moins la prise
// en charge.

export interface InsuranceCoverage {
  /** Taux déclaré par le patient, en pourcentage entier (ex. 80). */
  ratePercent: number;
  /** Montant pris en charge, en FCFA entiers. */
  amount: number;
  insurerName?: string | undefined;
}

export interface PriceSummaryProps {
  /** Total de l'ordonnance, en FCFA entiers. */
  total: number;
  /** Absent : patient sans assurance (prix plein). */
  coverage?: InsuranceCoverage | undefined;
  className?: string | undefined;
}

export function PriceSummary({ total, coverage, className }: PriceSummaryProps) {
  const remaining = coverage ? total - coverage.amount : total;
  const coverageDetail = coverage
    ? [`${coverage.ratePercent}${NBSP}%`, coverage.insurerName].filter(Boolean).join(' · ')
    : null;

  return (
    <section
      aria-label="Récapitulatif du prix"
      className={cn(
        'flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6 shadow-card',
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <span className="type-body text-ink">Total de l’ordonnance</span>
          <Amount value={total} />
        </div>

        {coverage && (
          <div className="flex items-baseline justify-between gap-4">
            <span className="flex flex-col">
              <span className="type-body text-ink-muted">Prise en charge déclarée</span>
              <span className="type-body-small text-ink-muted">{coverageDetail}</span>
            </span>
            <span className="type-body-strong whitespace-nowrap text-ink-muted tabular-nums">
              {formatFcfa(-coverage.amount)}
            </span>
          </div>
        )}
      </div>

      <hr className="border-hairline" />

      <div className="flex flex-col gap-1">
        <p className="type-overline text-ink-muted">
          {coverage ? 'Reste à payer estimé' : 'Montant estimé'}
        </p>
        <Amount value={remaining} size="lg" className="text-ink" />
      </div>

      <p className="type-body-small flex gap-2 text-ink-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-verify" />
        <span>
          {coverage
            ? 'Prise en charge à confirmer en pharmacie.'
            : 'Prix indicatif, à confirmer en pharmacie.'}
        </span>
      </p>
    </section>
  );
}

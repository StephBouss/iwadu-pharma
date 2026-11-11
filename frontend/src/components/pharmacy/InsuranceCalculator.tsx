'use client';

import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import { PriceSummary } from '@/components/pharmacy/PriceSummary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Field } from '@/components/ui/Field';
import { NBSP, formatFcfa } from '@/lib/format';
import { insuranceSplit, parseCoverageRate } from '@/lib/pricing';

// Assurance choisie sur la fiche de la pharmacie, parmi celles qu'elle
// accepte. Le patient saisit le taux inscrit sur sa carte (la part payée par
// l'assurance) ; l'application calcule ce qui reste à sa charge, arrondi au
// franc supérieur, sur toute l'ordonnance. Toujours une estimation. Le calcul
// se refait librement : il ne compte pas comme une recherche.

type Rate = '70' | '80' | '90' | '100' | 'other';
const RATES: { value: Rate; label: string }[] = [
  { value: '70', label: `70${NBSP}%` },
  { value: '80', label: `80${NBSP}%` },
  { value: '90', label: `90${NBSP}%` },
  { value: '100', label: `100${NBSP}%` },
  { value: 'other', label: 'Autre' },
];

function initialRate(rate: number | null | undefined): { rate: Rate | null; other: string } {
  if (rate === null || rate === undefined) return { rate: null, other: '' };
  const preset = RATES.find((r) => r.value === String(rate));
  return preset ? { rate: preset.value, other: '' } : { rate: 'other', other: String(rate) };
}

export function InsuranceCalculator({
  total,
  insurances,
  prefill,
}: {
  /** Prix plein de l'ordonnance dans cette pharmacie. */
  total: number;
  insurances: { id: string; name: string }[];
  /** Assurance et taux du profil (titulaire du compte seulement). */
  prefill?: { insuranceId: string; rate: number | null } | null | undefined;
}) {
  const id = useId();
  const accepted = prefill && insurances.some((i) => i.id === prefill.insuranceId);
  const pre = initialRate(accepted ? prefill?.rate : null);
  const [insuranceId, setInsuranceId] = useState(accepted ? (prefill?.insuranceId ?? '') : '');
  const [rate, setRate] = useState<Rate | null>(pre.rate);
  const [other, setOther] = useState(pre.other);

  const value = rate === 'other' ? parseCoverageRate(other) : rate ? Number(rate) : null;
  const otherError =
    rate === 'other' && other.trim() !== '' && value === null
      ? 'Le taux est un nombre entier entre 0 et 100.'
      : undefined;
  const insurer = insurances.find((i) => i.id === insuranceId) ?? null;
  const split = insurer && value !== null ? insuranceSplit(total, value) : null;

  return (
    <section aria-labelledby={`${id}-titre`} className="flex flex-col gap-4">
      <h3 id={`${id}-titre`} className="type-title-3 text-ink">
        Avec votre assurance
      </h3>
      {insurances.length === 0 ? (
        <p className="type-body-small flex gap-2 text-ink-muted">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-verify" />
          Cette pharmacie n’a déclaré aucune assurance acceptée : vous payez le prix plein.
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-2">
            <span className="type-label text-ink">Votre assurance</span>
            <select
              value={insuranceId}
              onChange={(e) => setInsuranceId(e.target.value)}
              className="type-body h-12 w-full rounded-field border border-outline bg-surface px-4 text-ink"
            >
              <option value="">Sans assurance</option>
              {insurances.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.name}
                </option>
              ))}
            </select>
            <span className="type-caption text-ink-muted">
              Seules les assurances acceptées par cette pharmacie sont proposées.
            </span>
          </label>
          {insurer && (
            <ChoiceChips
              legend="Taux de prise en charge indiqué sur votre carte"
              name={`${id}-taux`}
              options={RATES}
              value={rate}
              onChange={setRate}
            />
          )}
          {insurer && rate === 'other' && (
            <Field
              label="Taux en pourcentage"
              name={`${id}-autre`}
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              value={other}
              onChange={(e) => setOther(e.target.value.replace(/[^\d]/g, ''))}
              error={otherError}
              hint="Un nombre entier entre 0 et 100."
            />
          )}
        </>
      )}

      {split && value !== null && insurer ? (
        <>
          <p
            role="status"
            className="type-body-strong rounded-field bg-available-soft p-4 text-available"
          >
            Votre assurance paie {value}
            {NBSP}% · Vous payez {100 - value}
            {NBSP}%, soit {formatFcfa(split.patientPays)}
          </p>
          <PriceSummary
            total={total}
            coverage={{
              ratePercent: value,
              amount: split.insurancePays,
              insurerName: insurer.name,
            }}
          />
          <p className="type-body-small flex gap-2 text-ink-muted">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
            Au comptoir, présentez votre carte d’assuré : la pharmacie confirme la prise en charge.
          </p>
        </>
      ) : (
        <PriceSummary total={total} />
      )}
    </section>
  );
}

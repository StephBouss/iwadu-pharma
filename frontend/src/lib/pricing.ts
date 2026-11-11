// Calcul du prix d'une ordonnance dans une pharmacie.
//
// Facture = prix × quantité des médicaments disponibles.
// Part de l'assurance = taux × médicaments remboursables (arrondi au franc).
// À payer = facture − part de l'assurance.
// Toujours une estimation : la pharmacie confirme la prise en charge.

export interface PriceLine {
  unitPriceFcfa: number;
  quantity: number;
  reimbursable: boolean;
}

export interface Quote {
  invoice: number;
  insurancePart: number;
  toPay: number;
}

export function quote(lines: readonly PriceLine[], coverageRate: number | null): Quote {
  if (coverageRate !== null && (coverageRate < 0 || coverageRate > 100)) {
    throw new RangeError(`quote: invalid coverage rate ${coverageRate}`);
  }
  let invoice = 0;
  let reimbursable = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line.unitPriceFcfa) || !Number.isSafeInteger(line.quantity)) {
      throw new RangeError('quote: prices and quantities must be integers');
    }
    const amount = line.unitPriceFcfa * line.quantity;
    invoice += amount;
    if (line.reimbursable) reimbursable += amount;
  }
  const insurancePart = coverageRate ? Math.round((reimbursable * coverageRate) / 100) : 0;
  return { invoice, insurancePart, toPay: invoice - insurancePart };
}

/** Frais ou part calculés sur un montant, au franc près. */
export function percentOf(amount: number, ratePercent: number): number {
  return Math.round((amount * ratePercent) / 100);
}

// ─── Assurance choisie sur la fiche de la pharmacie (PRD MVP) ─────────────
// Le patient saisit le taux inscrit sur sa carte (part payée par
// l'assurance). Le taux s'applique à toute l'ordonnance ; le reste à payer
// est arrondi au franc supérieur. Toujours une estimation.

export interface InsuranceSplit {
  insurancePays: number;
  patientPays: number;
}

/** Taux de carte valide : entier de 0 à 100, sinon `null`. */
export function parseCoverageRate(raw: unknown): number | null {
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
  if (!/^\d{1,3}$/.test(text)) return null;
  const n = Number(text);
  return n >= 0 && n <= 100 ? n : null;
}

export function insuranceSplit(total: number, coverageRate: number): InsuranceSplit {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new RangeError(`insuranceSplit: invalid total ${total}`);
  }
  if (!Number.isInteger(coverageRate) || coverageRate < 0 || coverageRate > 100) {
    throw new RangeError(`insuranceSplit: invalid coverage rate ${coverageRate}`);
  }
  const patientPays = Math.ceil((total * (100 - coverageRate)) / 100);
  return { insurancePays: total - patientPays, patientPays };
}

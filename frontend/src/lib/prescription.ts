// Couverture d'une ordonnance par une pharmacie : combien des médicaments
// demandés elle a en stock. Sert au badge de chaque carte de pharmacie.

export type CoverageStatus = 'available' | 'low' | 'unavailable';

export interface PrescriptionCoverage {
  status: CoverageStatus;
  label: string;
}

/**
 * 3 sur 3 → « Ordonnance complète · 3/3 » ; 2 sur 3 → « Ordonnance
 * partielle · 2/3 » ; 0 → « Aucun médicament disponible ».
 */
export function prescriptionCoverage(found: number, total: number): PrescriptionCoverage {
  if (
    !Number.isInteger(found) ||
    !Number.isInteger(total) ||
    total <= 0 ||
    found < 0 ||
    found > total
  ) {
    throw new RangeError(`prescriptionCoverage: invalid counts ${found}/${total}`);
  }
  if (found === 0) return { status: 'unavailable', label: 'Aucun médicament disponible' };
  if (found === total) {
    return { status: 'available', label: `Ordonnance complète · ${found}/${total}` };
  }
  return { status: 'low', label: `Ordonnance partielle · ${found}/${total}` };
}

/**
 * Ordre d'affichage d'un résultat : les pharmacies qui ont toute
 * l'ordonnance d'abord, puis la distance. Renvoie une nouvelle liste.
 */
export function sortPharmaciesForResult<T extends { found: number; distanceMeters: number }>(
  pharmacies: readonly T[],
  total: number,
): T[] {
  return [...pharmacies].sort((a, b) => {
    const aComplete = a.found === total ? 0 : 1;
    const bComplete = b.found === total ? 0 : 1;
    return aComplete - bComplete || a.distanceMeters - b.distanceMeters;
  });
}

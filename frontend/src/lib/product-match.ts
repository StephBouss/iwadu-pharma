// Rapproche une ligne lue sur l'ordonnance d'un médicament du catalogue.
// Prudent : en cas de doute (aucun ou plusieurs candidats), la ligne reste à
// vérifier par le patient plutôt que d'être devinée.

import { normalizeSearch } from './products';

export interface CatalogItem {
  id: string;
  name: string;
  dosage: string | null;
}

export interface MatchResult {
  productId: string | null;
  ambiguous: boolean;
}

function digits(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/[^0-9/]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchProduct(
  line: { name: string; dosage: string | null },
  catalog: readonly CatalogItem[],
): MatchResult {
  const name = normalizeSearch(line.name);
  if (name.length < 3) return { productId: null, ambiguous: false };

  const byName = catalog.filter((p) => {
    const candidate = normalizeSearch(p.name);
    return candidate === name || candidate.startsWith(`${name} `) || name.startsWith(candidate);
  });
  if (byName.length === 0) return { productId: null, ambiguous: false };

  const wanted = digits(line.dosage) || digits(line.name.replace(/^[^0-9]*/, ''));
  const byDosage = wanted ? byName.filter((p) => digits(p.dosage) === wanted) : [];
  if (byDosage.length === 1) return { productId: byDosage[0]!.id, ambiguous: false };
  if (byName.length === 1 && !wanted) return { productId: byName[0]!.id, ambiguous: false };
  return { productId: null, ambiguous: true };
}

/**
 * Propositions quand la ligne est douteuse : jusqu'à `max` médicaments du
 * catalogue au même nom (même dosage d'abord), pour que le patient choisisse.
 */
export function matchCandidates(
  line: { name: string; dosage: string | null },
  catalog: readonly CatalogItem[],
  max = 3,
): string[] {
  const name = normalizeSearch(line.name);
  if (name.length < 3) return [];
  const first = name.split(' ')[0] ?? name;
  const byName = catalog.filter((p) => {
    const candidate = normalizeSearch(p.name);
    return (
      candidate === name ||
      candidate.startsWith(`${name} `) ||
      name.startsWith(candidate) ||
      (first.length >= 4 && candidate.startsWith(first))
    );
  });
  const wanted = digits(line.dosage) || digits(line.name.replace(/^[^0-9]*/, ''));
  const ranked = [...byName].sort(
    (a, b) => Number(digits(b.dosage) === wanted) - Number(digits(a.dosage) === wanted),
  );
  return ranked.slice(0, max).map((p) => p.id);
}

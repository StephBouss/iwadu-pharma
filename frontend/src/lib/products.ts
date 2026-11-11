// Médicaments : clé de recherche et état du stock.

/** Minuscules, sans accents ni ponctuation, espaces simples. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.,/%]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function productSearchKey(name: string, dosage?: string | null): string {
  return normalizeSearch(dosage ? `${name} ${dosage}` : name);
}

export type StockStatus = 'available' | 'low' | 'unavailable';

/**
 * État d'un médicament dans une pharmacie pour la quantité demandée.
 * « Faible » : la quantité demandée est là, mais le stock ne dépasse pas le
 * seuil du paramètre `stock.lowMax`.
 */
export function stockStatus(
  quantityInStock: number,
  requested: number,
  lowMax: number,
): StockStatus {
  if (quantityInStock <= 0 || quantityInStock < requested) return 'unavailable';
  return quantityInStock <= lowMax ? 'low' : 'available';
}

export function productLabel(p: { name: string; dosage?: string | null }): string {
  return p.dosage ? `${p.name} ${p.dosage}` : p.name;
}

import { describe, expect, it } from 'vitest';
import { normalizeSearch, productSearchKey, stockStatus } from './products';

describe('normalizeSearch', () => {
  it('retire accents, majuscules et ponctuation', () => {
    expect(normalizeSearch('  Ibuprofène  400 mg ')).toBe('ibuprofene 400 mg');
    expect(normalizeSearch('Artéméther-Luméfantrine')).toBe('artemether lumefantrine');
  });

  it('garde les séparateurs utiles aux dosages', () => {
    expect(productSearchKey('Artéméther-Luméfantrine', '20/120 mg')).toBe(
      'artemether lumefantrine 20/120 mg',
    );
  });
});

describe('stockStatus', () => {
  it('indisponible sans stock ou si la quantité demandée manque', () => {
    expect(stockStatus(0, 1, 4)).toBe('unavailable');
    expect(stockStatus(2, 3, 4)).toBe('unavailable');
  });

  it('faible jusqu’au seuil, disponible au-delà', () => {
    expect(stockStatus(4, 1, 4)).toBe('low');
    expect(stockStatus(5, 1, 4)).toBe('available');
  });
});

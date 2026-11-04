import { describe, it, expect } from 'vitest';
import { prescriptionCoverage, sortPharmaciesForResult } from './prescription';

describe('sortPharmaciesForResult', () => {
  it('met d’abord celles qui ont toute l’ordonnance, puis trie par distance', () => {
    const sorted = sortPharmaciesForResult(
      [
        { name: 'Partielle proche', found: 2, distanceMeters: 300 },
        { name: 'Complète loin', found: 3, distanceMeters: 2500 },
        { name: 'Complète proche', found: 3, distanceMeters: 800 },
        { name: 'Partielle loin', found: 2, distanceMeters: 1400 },
      ],
      3,
    );
    expect(sorted.map((p) => p.name)).toEqual([
      'Complète proche',
      'Complète loin',
      'Partielle proche',
      'Partielle loin',
    ]);
  });

  it('ne modifie pas la liste reçue', () => {
    const input = [
      { name: 'B', found: 1, distanceMeters: 900 },
      { name: 'A', found: 3, distanceMeters: 100 },
    ];
    sortPharmaciesForResult(input, 3);
    expect(input.map((p) => p.name)).toEqual(['B', 'A']);
  });
});

describe('prescriptionCoverage', () => {
  it('toute l’ordonnance disponible → « Ordonnance complète »', () => {
    expect(prescriptionCoverage(3, 3)).toEqual({
      status: 'available',
      label: 'Ordonnance complète · 3/3',
    });
  });

  it('une partie seulement → « Ordonnance partielle »', () => {
    expect(prescriptionCoverage(2, 3)).toEqual({
      status: 'low',
      label: 'Ordonnance partielle · 2/3',
    });
  });

  it('rien de disponible → « Aucun médicament disponible »', () => {
    expect(prescriptionCoverage(0, 3)).toEqual({
      status: 'unavailable',
      label: 'Aucun médicament disponible',
    });
  });

  it.each([
    [1, 0],
    [4, 3],
    [-1, 3],
    [1.5, 3],
  ])('refuse des comptes incohérents (%s sur %s)', (found, total) => {
    expect(() => prescriptionCoverage(found, total)).toThrow(RangeError);
  });
});

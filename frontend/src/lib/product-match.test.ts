import { describe, expect, it } from 'vitest';
import { matchCandidates, matchProduct } from './product-match';

const CATALOG = [
  { id: 'p500', name: 'Paracétamol', dosage: '500 mg' },
  { id: 'p1g', name: 'Paracétamol', dosage: '1 g' },
  { id: 'amox1g', name: 'Amoxicilline', dosage: '1 g' },
  { id: 'al', name: 'Artéméther-Luméfantrine', dosage: '20/120 mg' },
  { id: 'sro', name: 'Sels de réhydratation orale', dosage: null },
];

describe('matchProduct', () => {
  it('nom et dosage identiques, accents et majuscules ignorés', () => {
    expect(matchProduct({ name: 'PARACETAMOL', dosage: '500mg' }, CATALOG)).toEqual({
      productId: 'p500',
      ambiguous: false,
    });
  });

  it('dosage écrit dans le nom', () => {
    expect(matchProduct({ name: 'Amoxicilline 1 g', dosage: null }, CATALOG).productId).toBe(
      'amox1g',
    );
  });

  it('nom connu sans dosage alors que plusieurs existent : ambigu, à vérifier', () => {
    expect(matchProduct({ name: 'Paracétamol', dosage: null }, CATALOG)).toEqual({
      productId: null,
      ambiguous: true,
    });
  });

  it('médicament absent du catalogue : non rapproché', () => {
    expect(matchProduct({ name: 'Doliprane', dosage: '1000 mg' }, CATALOG)).toEqual({
      productId: null,
      ambiguous: false,
    });
  });

  it('nom composé et dosage avec barre', () => {
    expect(
      matchProduct({ name: 'Artéméther Luméfantrine', dosage: '20/120 mg' }, CATALOG).productId,
    ).toBe('al');
  });

  it('produit sans dosage, nom seul', () => {
    expect(
      matchProduct({ name: 'Sels de réhydratation orale', dosage: null }, CATALOG).productId,
    ).toBe('sro');
  });
});

describe('matchCandidates', () => {
  const catalog = [
    { id: 'p1', name: 'Paracétamol', dosage: '500 mg' },
    { id: 'p2', name: 'Paracétamol', dosage: '1 g' },
    { id: 'a1', name: 'Amoxicilline', dosage: '1 g' },
  ];
  it('propose les médicaments du même nom, même dosage en premier', () => {
    expect(matchCandidates({ name: 'Paracetamol', dosage: '1 g' }, catalog)).toEqual(['p2', 'p1']);
  });
  it('aucune proposition pour un nom inconnu', () => {
    expect(matchCandidates({ name: 'Inconnu', dosage: null }, catalog)).toEqual([]);
  });
});

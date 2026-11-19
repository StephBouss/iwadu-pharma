import { describe, expect, it } from 'vitest';
import { editDistance, matchOcrText } from './ocr-match';

// Catalogue d'exemple (fictif).
const CATALOG = [
  { id: 'para500', name: 'Paracétamol', dosage: '500 mg' },
  { id: 'para1000', name: 'Paracétamol', dosage: '1 g' },
  { id: 'amox1', name: 'Amoxicilline', dosage: '1 g' },
  { id: 'ibu400', name: 'Ibuprofène', dosage: '400 mg' },
  { id: 'aspirine', name: 'Acide acétylsalicylique', dosage: '500 mg' },
  { id: 'acidefol', name: 'Acide folique', dosage: '5 mg' },
  { id: 'smecta', name: 'Smecta', dosage: null },
];

describe('editDistance', () => {
  it('counts edits and stops past the bound', () => {
    expect(editDistance('paracetamol', 'paracetamol', 2)).toBe(0);
    expect(editDistance('paracetam0l', 'paracetamol', 2)).toBe(1);
    expect(editDistance('abc', 'xyzxyz', 1)).toBe(2);
  });
});

describe('matchOcrText', () => {
  it('reads printed lines with dosage and boxes', () => {
    const text = [
      'Dr ****  Cabinet médical',
      '1) PARACETAMOL 500 mg comprimés    2 boîtes',
      '2) Amoxicilline 1g gélules - 1 bte',
      '3 fois par jour pendant 5 jours',
    ].join('\n');
    const lines = matchOcrText(text, CATALOG);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ productId: 'para500', quantity: 2, dosage: '500 mg' });
    expect(lines[1]).toMatchObject({ productId: 'amox1', quantity: 1 });
    expect(lines[0]!.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('tolerates one misread letter on a long name, with lower confidence', () => {
    const [line] = matchOcrText('Amoxici1line 1 g', CATALOG);
    expect(line).toMatchObject({ productId: 'amox1' });
    expect(line!.confidence).toBeLessThan(0.8);
  });

  it('keeps the line to check with proposals when the dosage is unknown', () => {
    const [line] = matchOcrText('Paracetamol cp', CATALOG);
    expect(line!.productId).toBeNull();
    expect(line!.candidates).toEqual(expect.arrayContaining(['para500', 'para1000']));
  });

  it('prefers the longest known name', () => {
    const [line] = matchOcrText('Acide acetylsalicylique 500mg', CATALOG);
    expect(line!.productId).toBe('aspirine');
  });

  it('accepts a single-dosage product without dosage on the line', () => {
    const [line] = matchOcrText('SMECTA sachets  3 boites', CATALOG);
    expect(line).toMatchObject({ productId: 'smecta', quantity: 3 });
  });

  it('ignores lines without any known medicine and short words', () => {
    expect(matchOcrText('Signature et cachet\nTel 077 00 00 00\npar jour', CATALOG)).toEqual([]);
  });

  it('does not repeat the same medicine', () => {
    const lines = matchOcrText('Ibuprofene 400 mg\nIbuprofène 400mg', CATALOG);
    expect(lines).toHaveLength(1);
  });
});

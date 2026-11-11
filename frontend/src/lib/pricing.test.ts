import { describe, expect, it } from 'vitest';
import { insuranceSplit, parseCoverageRate, percentOf, quote } from './pricing';

describe('quote', () => {
  const lines = [
    { unitPriceFcfa: 1000, quantity: 2, reimbursable: true },
    { unitPriceFcfa: 2500, quantity: 1, reimbursable: false },
  ];

  it('sans assurance : prix plein', () => {
    expect(quote(lines, null)).toEqual({ invoice: 4500, insurancePart: 0, toPay: 4500 });
  });

  it('avec assurance : le taux ne porte que sur les médicaments remboursables', () => {
    expect(quote(lines, 80)).toEqual({ invoice: 4500, insurancePart: 1600, toPay: 2900 });
  });

  it('arrondit la part de l’assurance au franc', () => {
    expect(quote([{ unitPriceFcfa: 333, quantity: 1, reimbursable: true }], 50)).toEqual({
      invoice: 333,
      insurancePart: 167,
      toPay: 166,
    });
  });

  it('refuse un taux hors de 0–100 et des montants non entiers', () => {
    expect(() => quote(lines, 120)).toThrow(RangeError);
    expect(() => quote([{ unitPriceFcfa: 10.5, quantity: 1, reimbursable: true }], null)).toThrow(
      RangeError,
    );
  });
});

describe('percentOf', () => {
  it('arrondit au franc', () => {
    expect(percentOf(1500, 2)).toBe(30);
    expect(percentOf(250, 3)).toBe(8);
  });
});

describe('insuranceSplit (assurance choisie sur la fiche)', () => {
  it('carte à 80 % sur 18 400 FCFA : le patient paie 3 680, l’assurance 14 720', () => {
    expect(insuranceSplit(18400, 80)).toEqual({ insurancePays: 14720, patientPays: 3680 });
  });
  it('arrondit le reste à payer au franc supérieur', () => {
    expect(insuranceSplit(1001, 70)).toEqual({ insurancePays: 700, patientPays: 301 });
  });
  it('0 % : prix plein ; 100 % : rien à payer', () => {
    expect(insuranceSplit(5000, 0)).toEqual({ insurancePays: 0, patientPays: 5000 });
    expect(insuranceSplit(5000, 100)).toEqual({ insurancePays: 5000, patientPays: 0 });
  });
  it('ne donne jamais un reste à payer négatif', () => {
    for (const rate of [0, 33, 99, 100]) {
      expect(insuranceSplit(7, rate).patientPays).toBeGreaterThanOrEqual(0);
    }
  });
  it('refuse un taux hors de 0 à 100 ou non entier', () => {
    expect(() => insuranceSplit(1000, 101)).toThrow(RangeError);
    expect(() => insuranceSplit(1000, -1)).toThrow(RangeError);
    expect(() => insuranceSplit(1000, 50.5)).toThrow(RangeError);
  });
});

describe('parseCoverageRate', () => {
  it('accepte un entier de 0 à 100', () => {
    expect(parseCoverageRate('80')).toBe(80);
    expect(parseCoverageRate(0)).toBe(0);
    expect(parseCoverageRate('100')).toBe(100);
  });
  it('refuse tout autre chiffre', () => {
    for (const bad of ['101', '-5', '50.5', 'abc', '', ' ', '1e2', null, undefined]) {
      expect(parseCoverageRate(bad)).toBeNull();
    }
  });
});

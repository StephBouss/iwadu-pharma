import { describe, it, expect } from 'vitest';
import {
  formatClock,
  formatDistance,
  formatFcfa,
  formatGroupedInt,
  formatLongDate,
} from './format';

// U+00A0 (espace insécable) : jamais de retour à la ligne au milieu d'un
// montant ni entre le nombre et son unité.
const NBSP = String.fromCharCode(0x00a0);
const MINUS = String.fromCharCode(0x2212);

describe('formatGroupedInt', () => {
  it.each([
    [0, '0'],
    [300, '300'],
    [1500, `1${NBSP}500`],
    [12500, `12${NBSP}500`],
    [250000, `250${NBSP}000`],
    [1234567, `1${NBSP}234${NBSP}567`],
  ])('groupe %i par milliers → %s', (input, expected) => {
    expect(formatGroupedInt(input)).toBe(expected);
  });

  it('préfixe les négatifs du signe moins typographique (U+2212)', () => {
    expect(formatGroupedInt(-1500)).toBe(`${MINUS}1${NBSP}500`);
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuse %s : les montants sont des entiers en FCFA',
    (input) => {
      expect(() => formatGroupedInt(input)).toThrow(RangeError);
    },
  );
});

describe('formatFcfa', () => {
  it('ajoute « FCFA » après une espace insécable', () => {
    expect(formatFcfa(12500)).toBe(`12${NBSP}500${NBSP}FCFA`);
    expect(formatFcfa(300)).toBe(`300${NBSP}FCFA`);
  });

  it('gère zéro et les déductions', () => {
    expect(formatFcfa(0)).toBe(`0${NBSP}FCFA`);
    expect(formatFcfa(-1500)).toBe(`${MINUS}1${NBSP}500${NBSP}FCFA`);
  });
});

describe('formatDistance', () => {
  it.each([
    [0, `0${NBSP}m`],
    [42, `40${NBSP}m`],
    [800, `800${NBSP}m`],
    [995, `1${NBSP}km`],
    [1000, `1${NBSP}km`],
    [1400, `1,4${NBSP}km`],
    [2149, `2,1${NBSP}km`],
    [3000, `3${NBSP}km`],
    [12345, `12${NBSP}km`],
  ])('%i m → %s', (meters, expected) => {
    expect(formatDistance(meters)).toBe(expected);
  });

  it('refuse une distance négative ou non finie', () => {
    expect(() => formatDistance(-1)).toThrow(RangeError);
    expect(() => formatDistance(Number.NaN)).toThrow(RangeError);
  });
});

describe('formatClock', () => {
  // Le Gabon est en UTC+1 toute l'année (Africa/Libreville, pas d'heure d'été).
  it('affiche « 14 h 05 » à l’heure de Libreville', () => {
    expect(formatClock(new Date('2026-11-04T13:05:00Z'))).toBe(`14${NBSP}h${NBSP}05`);
  });

  it('omet les minutes pile : « 21 h »', () => {
    expect(formatClock(new Date('2026-11-04T20:00:00Z'))).toBe(`21${NBSP}h`);
  });

  it('sans zéro initial pour les heures : « 8 h »', () => {
    expect(formatClock(new Date('2026-11-04T07:00:00Z'))).toBe(`8${NBSP}h`);
  });

  it('minuit : « 0 h 30 »', () => {
    expect(formatClock(new Date('2026-11-04T23:30:00Z'))).toBe(`0${NBSP}h${NBSP}30`);
  });

  it('accepte un autre fuseau', () => {
    expect(formatClock(new Date('2026-11-04T13:05:00Z'), 'UTC')).toBe(`13${NBSP}h${NBSP}05`);
  });
});

describe('formatLongDate', () => {
  it('écrit la date en toutes lettres, jour en majuscule', () => {
    expect(formatLongDate(new Date('2026-11-04T10:00:00Z'))).toBe('Mercredi 4 novembre 2026');
  });

  it('suit le jour de Libreville, pas celui du serveur', () => {
    // 23 h 30 UTC = 0 h 30 le lendemain à Libreville (UTC+1).
    expect(formatLongDate(new Date('2026-11-04T23:30:00Z'))).toBe('Jeudi 5 novembre 2026');
  });

  it('écrit « 1er » pour le premier jour du mois', () => {
    expect(formatLongDate(new Date('2026-12-01T10:00:00Z'))).toBe('Mardi 1er décembre 2026');
  });
});

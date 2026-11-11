import { describe, expect, it } from 'vitest';
import {
  distanceBand,
  librevilleDayStart,
  librevilleNextDay,
  monthlyAverage,
  passUsage,
} from './entitlement-rules';

describe('librevilleDayStart', () => {
  it('minuit à Libreville = 23 h UTC la veille', () => {
    expect(librevilleDayStart(new Date('2026-11-10T10:00:00Z')).toISOString()).toBe(
      '2026-11-09T23:00:00.000Z',
    );
  });
  it('à 23 h 30 UTC, la journée de Libreville a déjà changé', () => {
    expect(librevilleDayStart(new Date('2026-11-10T23:30:00Z')).toISOString()).toBe(
      '2026-11-10T23:00:00.000Z',
    );
    expect(librevilleNextDay(new Date('2026-11-10T10:00:00Z')).toISOString()).toBe(
      '2026-11-10T23:00:00.000Z',
    );
  });
});

describe('passUsage', () => {
  it('Pass Solo : la 11e recherche sur 10 est refusée (propose l’acte ou le Pass Famille)', () => {
    const base = { plan: 'SOLO' as const, quota: 10, usedToday: 0, dailyMax: 10 };
    expect(passUsage({ ...base, usedInPeriod: 9 })).toEqual({
      allowed: true,
      block: null,
      remaining: 1,
    });
    expect(passUsage({ ...base, usedInPeriod: 10 })).toEqual({
      allowed: false,
      block: 'SOLO_EXHAUSTED',
      remaining: 0,
    });
  });
  it('Pass Famille : aucune limite affichée, la 11e recherche du jour est bloquée', () => {
    const base = { plan: 'FAMILY' as const, quota: 0, usedInPeriod: 400, dailyMax: 10 };
    expect(passUsage({ ...base, usedToday: 9 })).toEqual({
      allowed: true,
      block: null,
      remaining: null,
    });
    expect(passUsage({ ...base, usedToday: 10 }).block).toBe('DAILY_MAX');
  });
  it('sans seuil quotidien saisi, le Pass Famille n’est pas bloqué', () => {
    expect(
      passUsage({ plan: 'FAMILY', quota: 0, usedInPeriod: 0, usedToday: 99, dailyMax: null })
        .allowed,
    ).toBe(true);
  });
});

describe('monthlyAverage et distanceBand', () => {
  it('moyenne sur 3 mois', () => {
    expect(monthlyAverage(150, 3)).toBe(50);
  });
  it('tranches de distance', () => {
    expect(distanceBand(300)).toBe('Moins de 1 km');
    expect(distanceBand(1500)).toBe('Entre 1 et 3 km');
    expect(distanceBand(4000)).toBe('Entre 3 et 5 km');
    expect(distanceBand(9000)).toBe('Plus de 5 km');
  });
});

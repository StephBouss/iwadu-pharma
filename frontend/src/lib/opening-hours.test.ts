import { describe, expect, it } from 'vitest';
import { NBSP } from './format';
import {
  dayHoursLabel,
  formatDayRanges,
  openingState,
  parseDayRanges,
  type WeeklyHours,
} from './opening-hours';

const h = (s: string) => s.replace(/ h/g, `${NBSP}h`).replace(/h (\d)/g, `h${NBSP}$1`);

// Libreville = UTC+1. 2026-11-04 est un mercredi.
const HOURS: WeeklyHours = {
  '1': [['08:00', '20:00']],
  '2': [['08:00', '20:00']],
  '3': [
    ['08:00', '12:30'],
    ['15:00', '21:00'],
  ],
  '4': [['08:00', '20:00']],
  '5': [['08:00', '20:00']],
  '6': [['09:00', '13:00']],
  '7': [],
};

describe('openingState', () => {
  it('ouverte : donne l’heure de fermeture du créneau en cours', () => {
    const s = openingState(HOURS, new Date('2026-11-04T09:00:00Z')); // 10 h
    expect(s).toEqual({ open: true, onDuty: false, label: h('Ouverte jusqu’à 12 h 30') });
  });

  it('pause de midi : ouvre plus tard dans la journée', () => {
    const s = openingState(HOURS, new Date('2026-11-04T12:00:00Z')); // 13 h
    expect(s.label).toBe(h('Fermée · ouvre à 15 h'));
    expect(s.open).toBe(false);
  });

  it('le soir : ouvre demain', () => {
    expect(openingState(HOURS, new Date('2026-11-04T21:30:00Z')).label).toBe(
      h('Fermée · ouvre demain à 8 h'),
    );
  });

  it('samedi soir : saute le dimanche fermé', () => {
    expect(openingState(HOURS, new Date('2026-11-07T15:00:00Z')).label).toBe(
      h('Fermée · ouvre lundi à 8 h'),
    );
  });

  it('une garde en cours l’emporte sur les horaires', () => {
    const s = openingState(HOURS, new Date('2026-11-04T22:00:00Z'), [
      { startsAt: new Date('2026-11-04T18:00:00Z'), endsAt: new Date('2026-11-05T07:00:00Z') },
    ]);
    expect(s).toEqual({ open: true, onDuty: true, label: h('De garde jusqu’à 8 h') });
  });

  it('aucun horaire : « Fermée »', () => {
    expect(openingState({}, new Date('2026-11-04T09:00:00Z')).label).toBe('Fermée');
  });
});

describe('dayHoursLabel', () => {
  it('liste les créneaux, ou « Fermé »', () => {
    expect(dayHoursLabel(HOURS, 3)).toBe(h('8 h – 12 h 30, 15 h – 21 h'));
    expect(dayHoursLabel(HOURS, 7)).toBe('Fermé');
  });
});

describe('parseDayRanges', () => {
  it('lit les plages courantes', () => {
    expect(parseDayRanges('08:00-12:30, 15:00-20:00')).toEqual([
      ['08:00', '12:30'],
      ['15:00', '20:00'],
    ]);
    expect(parseDayRanges('8h00 - 20h00')).toEqual([['08:00', '20:00']]);
    expect(parseDayRanges('')).toEqual([]);
    expect(parseDayRanges('Fermé')).toEqual([]);
  });
  it('refuse une plage illisible ou à l’envers', () => {
    expect(parseDayRanges('matin')).toBeNull();
    expect(parseDayRanges('20:00-08:00')).toBeNull();
  });
  it('se relit', () => {
    expect(formatDayRanges([['08:00', '20:00']])).toBe('08:00-20:00');
  });
});

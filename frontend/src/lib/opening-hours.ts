// Horaires d'une pharmacie : ouverte ou fermée maintenant, à l'heure de
// Libreville, et la phrase à afficher (« Ouverte jusqu'à 21 h », « Fermée ·
// ouvre demain à 8 h », « De garde jusqu'à 8 h »).

import { DEFAULT_TIME_ZONE, formatClock, formatHourMinute } from './format';

/** 1 = lundi … 7 = dimanche ; créneaux « HH:MM » dans la journée (fin ≤ 24:00). */
export type WeeklyHours = Partial<Record<string, readonly (readonly [string, string])[]>>;

export interface DutyWindow {
  startsAt: Date;
  endsAt: Date;
}

export interface OpeningState {
  open: boolean;
  onDuty: boolean;
  label: string;
}

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

function clock(minutes: number): string {
  return formatHourMinute(Math.floor(minutes / 60) % 24, minutes % 60);
}

/** Jour (1–7) et minute du jour à Libreville. */
export function localDayAndMinute(
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(date);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd) + 1;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { day, minute: hour * 60 + minute };
}

function intervals(hours: WeeklyHours, day: number): [number, number][] {
  const raw = hours[String(day)] ?? [];
  const out: [number, number][] = [];
  for (const [from, to] of raw) {
    const a = toMinutes(from);
    const b = toMinutes(to);
    if (a !== null && b !== null && b > a) out.push([a, b]);
  }
  return out.sort((x, y) => x[0] - y[0]);
}

/**
 * État d'ouverture à `now`. Une garde en cours l'emporte sur les horaires.
 */
export function openingState(
  hours: WeeklyHours,
  now: Date,
  duty: readonly DutyWindow[] = [],
  timeZone: string = DEFAULT_TIME_ZONE,
): OpeningState {
  const currentDuty = duty.find((d) => d.startsAt <= now && now < d.endsAt);
  if (currentDuty) {
    return {
      open: true,
      onDuty: true,
      label: `De garde jusqu’à ${formatClock(currentDuty.endsAt, timeZone)}`,
    };
  }

  const { day, minute } = localDayAndMinute(now, timeZone);
  const today = intervals(hours, day);
  const current = today.find(([a, b]) => a <= minute && minute < b);
  if (current) {
    return { open: true, onDuty: false, label: `Ouverte jusqu’à ${clock(current[1])}` };
  }

  const laterToday = today.find(([a]) => a > minute);
  if (laterToday) {
    return { open: false, onDuty: false, label: `Fermée · ouvre à ${clock(laterToday[0])}` };
  }
  for (let offset = 1; offset <= 7; offset += 1) {
    const d = ((day - 1 + offset) % 7) + 1;
    const first = intervals(hours, d)[0];
    if (first) {
      const when = offset === 1 ? 'demain' : WEEKDAYS[d - 1];
      return { open: false, onDuty: false, label: `Fermée · ouvre ${when} à ${clock(first[0])}` };
    }
  }
  return { open: false, onDuty: false, label: 'Fermée' };
}

/** Horaires lisibles d'un jour : « 8 h – 20 h », « Fermé ». */
export function dayHoursLabel(hours: WeeklyHours, day: number): string {
  const list = intervals(hours, day);
  if (list.length === 0) return 'Fermé';
  return list.map(([a, b]) => `${clock(a)} – ${clock(b)}`).join(', ');
}

export const WEEKDAY_LABELS = WEEKDAYS.map((d) => d.charAt(0).toUpperCase() + d.slice(1));

const RANGE = /^([01]?\d|2[0-3])[:hH]([0-5]\d)\s*[-–à]\s*([01]?\d|2[0-4])[:hH]([0-5]\d)$/;

function pad(h: string, m: string): string {
  return `${h.padStart(2, '0')}:${m}`;
}

/**
 * Lit une journée saisie par la pharmacie : « 08:00-12:30, 15:00-20:00 »
 * (ou « 8h00 - 20h00 »). Vide ou « fermé » : fermée. null si illisible.
 */
export function parseDayRanges(text: string): [string, string][] | null {
  const t = text.trim().toLowerCase();
  if (!t || t === 'fermé' || t === 'ferme' || t === 'fermée') return [];
  const out: [string, string][] = [];
  for (const part of t.split(/[,;]/)) {
    const m = RANGE.exec(part.trim());
    if (!m) return null;
    const from = pad(m[1]!, m[2]!);
    const to = pad(m[3]!, m[4]!);
    if (to === '24:00' ? false : to <= from) return null;
    out.push([from, to === '24:00' ? '23:59' : to]);
  }
  return out;
}

export function formatDayRanges(
  ranges: readonly (readonly [string, string])[] | undefined,
): string {
  return (ranges ?? []).map(([a, b]) => `${a}-${b}`).join(', ');
}

// Mise en forme des montants, distances et heures selon la charte V1.0 :
// « 12 500 FCFA », « 1,4 km », « 14 h 05 ». Une espace insécable (U+00A0)
// sépare les milliers et précède chaque unité, pour qu'un retour à la ligne
// ne coupe jamais un montant. U+00A0 plutôt que l'espace fine U+202F : elle
// s'affiche partout, y compris sur les Android d'entrée de gamme.

// Construits depuis leur code plutôt que tapés : à l'écran, ces caractères
// sont invisibles ou se confondent avec une espace et un tiret ordinaires.
/** Espace insécable (U+00A0). */
export const NBSP = String.fromCharCode(0x00a0);
/** Signe moins typographique (U+2212). */
const MINUS = String.fromCharCode(0x2212);

/** Fuseau du Gabon : UTC+1 toute l'année. */
export const DEFAULT_TIME_ZONE = 'Africa/Libreville';

/**
 * Groupe un entier par milliers : 12500 → « 12 500 ».
 * Les montants sont toujours des entiers en FCFA (aucune décimale) : tout
 * autre nombre est une erreur de programmation, d'où l'exception.
 */
export function formatGroupedInt(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`formatGroupedInt expects an integer, got ${value}`);
  }
  const digits = Math.abs(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return value < 0 ? `${MINUS}${digits}` : digits;
}

/** 12500 → « 12 500 FCFA ». */
export function formatFcfa(amount: number): string {
  return `${formatGroupedInt(amount)}${NBSP}FCFA`;
}

/**
 * Distance lisible : « 800 m » (à 10 m près), « 1,4 km » (une décimale sous
 * 10 km), « 12 km » (entier au-delà).
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    throw new RangeError(`formatDistance expects a non-negative distance, got ${meters}`);
  }
  const roundedMeters = Math.round(meters / 10) * 10;
  if (roundedMeters < 1000) return `${roundedMeters}${NBSP}m`;

  const km = meters / 1000;
  const value = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  return `${text}${NBSP}km`;
}

/**
 * Heure à la française : « 14 h 05 », « 21 h » (minutes pile omises),
 * « 8 h » (sans zéro initial). Affichée à l'heure de Libreville par défaut,
 * quel que soit le fuseau du serveur.
 */
export function formatClock(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return formatHourMinute(hour, minute);
}

/** « Mercredi 4 novembre » : la date longue sans l'année. */
export function formatDayMonth(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  return formatLongDate(date, timeZone).replace(/ \d{4}$/, '');
}

/** « 4 nov. 2026 à 14 h 05 » : date courte et heure, pour les listes. */
export function formatDateTime(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  const day = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  })
    .format(date)
    .replace(/\s/g, NBSP);
  return `${day} à ${formatClock(date, timeZone)}`;
}

/** « 21 h », « 8 h 30 » à partir d'heures et de minutes déjà connues. */
export function formatHourMinute(hour: number, minute: number): string {
  const mm = String(minute).padStart(2, '0');
  return minute === 0 ? `${hour}${NBSP}h` : `${hour}${NBSP}h${NBSP}${mm}`;
}

/**
 * Date en toutes lettres : « Mercredi 4 novembre 2026 », « Mardi 1er décembre
 * 2026 ». Jour calculé à Libreville par défaut, quel que soit le serveur.
 */
export function formatLongDate(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const weekday = part('weekday');
  const day = part('day') === '1' ? '1er' : part('day');
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized} ${day} ${part('month')} ${part('year')}`;
}

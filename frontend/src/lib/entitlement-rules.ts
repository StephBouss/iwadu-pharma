// Règles pures des droits du patient (sans base de données) : journée de
// Libreville, compteurs des Pass, tranches de distance de l'aperçu gratuit.
// Les seuils viennent toujours des paramètres ; rien n'est écrit ici.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Libreville : UTC+1 toute l'année (pas d'heure d'été au Gabon). */
const LIBREVILLE_OFFSET_MS = HOUR_MS;

/** Début de la journée en cours à Libreville (minuit local), en UTC. */
export function librevilleDayStart(now: Date): Date {
  const local = now.getTime() + LIBREVILLE_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - LIBREVILLE_OFFSET_MS);
}

/** Minuit suivant à Libreville : fin d'un blocage « jusqu'au lendemain ». */
export function librevilleNextDay(now: Date): Date {
  return new Date(librevilleDayStart(now).getTime() + DAY_MS);
}

export type PassBlock = 'SOLO_EXHAUSTED' | 'DAILY_MAX';

export interface PassUsageInput {
  plan: 'SOLO' | 'FAMILY';
  /** Recherches incluses sur la durée du Pass ; 0 = illimitées. */
  quota: number;
  usedInPeriod: number;
  usedToday: number;
  /** Usage raisonnable : nouvelles recherches par jour au plus (Pass Famille). */
  dailyMax: number | null;
}

export interface PassUsage {
  allowed: boolean;
  block: PassBlock | null;
  /** Recherches restantes sur la période ; `null` = illimitées. */
  remaining: number | null;
}

export function passUsage(input: PassUsageInput): PassUsage {
  if (input.plan === 'SOLO' || input.quota > 0) {
    const remaining = Math.max(input.quota - input.usedInPeriod, 0);
    return remaining > 0
      ? { allowed: true, block: null, remaining }
      : { allowed: false, block: 'SOLO_EXHAUSTED', remaining: 0 };
  }
  if (input.dailyMax !== null && input.dailyMax > 0 && input.usedToday >= input.dailyMax) {
    return { allowed: false, block: 'DAILY_MAX', remaining: null };
  }
  return { allowed: true, block: null, remaining: null };
}

/** Moyenne mensuelle des recherches sur une période glissante de `months` mois. */
export function monthlyAverage(searches: number, months: number): number {
  return months > 0 ? searches / months : searches;
}

/** Tranche de distance montrée sur une pharmacie verrouillée (sans la nommer). */
export function distanceBand(meters: number): string {
  if (meters < 1000) return 'Moins de 1 km';
  if (meters < 3000) return 'Entre 1 et 3 km';
  if (meters < 5000) return 'Entre 3 et 5 km';
  return 'Plus de 5 km';
}

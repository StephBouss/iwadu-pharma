import 'server-only';
import type { Offer } from '@/lib/offer-types';
import type { SettingsValues } from '@/lib/settings-registry';
import { getSettings } from './settings';

// Offres lues dans les paramètres : une offre sans prix n'est pas proposée.
// « Illimité » est toujours suivi de sa règle d'usage raisonnable ; le Pass
// Famille se présente comme « plus de recherches », jamais par un nombre
// de personnes.

function durationLabel(days: number): string {
  if (days % 365 === 0) return days === 365 ? 'pour 12 mois' : `pour ${days / 365} ans`;
  return `pour ${days} jours`;
}

export function fairUseRule(s: SettingsValues): string | null {
  const max = s['fairUse.dailyMax'];
  return max ? `Usage raisonnable : ${max} nouvelles recherches par jour au plus.` : null;
}

export function buildOffers(s: SettingsValues): Offer[] {
  const offers: Offer[] = [];
  const days = s['pass.durationDays'];
  const hours = s['result.linkHours'];
  const solo = s['pass.soloSearches'];
  if (s['price.unlock']) {
    offers.push({
      purpose: 'UNLOCK',
      title: 'À l’acte',
      tagline: 'Sans compte',
      price: s['price.unlock'],
      period: 'par ordonnance',
      perSearch: s['price.unlock'],
      searches: '1 recherche',
      rule: null,
      points: [
        'Noms, adresses et téléphones des pharmacies',
        'Prix exact par pharmacie et par médicament',
        'Reste à payer avec votre assurance',
        hours ? `Résultat à jour pendant ${hours} h, à partager` : 'Résultat à partager',
      ],
      requiresAccount: false,
    });
  }
  if (s['price.passSolo'] && days && solo) {
    offers.push({
      purpose: 'PASS_SOLO',
      title: 'Pass Solo',
      tagline: null,
      price: s['price.passSolo'],
      period: durationLabel(days),
      perSearch: Math.round(s['price.passSolo'] / solo),
      searches: `${solo} recherches`,
      rule: null,
      points: [
        'Carnet d’ordonnances',
        'Assurance enregistrée',
        'Ancienne ordonnance relancée sans nouvelle photo',
      ],
      requiresAccount: true,
    });
  }
  if (s['price.passFamily'] && days) {
    offers.push({
      purpose: 'PASS_FAMILY',
      title: 'Pass Famille',
      tagline: 'Zéro tour de pharmacie',
      price: s['price.passFamily'],
      period: durationLabel(days),
      perSearch: null,
      searches: 'Recherches illimitées',
      rule: fairUseRule(s),
      points: [
        'Tout le Pass Solo',
        'Ordonnances classées par prénom, pour qui vous voulez',
        'Offert : le guide « Comprendre votre prise en charge »',
      ],
      requiresAccount: true,
    });
  }
  if (s['price.passFamilyAnnual'] && s['pass.annualDays']) {
    offers.push({
      purpose: 'PASS_FAMILY_ANNUAL',
      title: 'Pass Famille 12 mois',
      tagline: 'Un seul paiement',
      price: s['price.passFamilyAnnual'],
      period: durationLabel(s['pass.annualDays']),
      perSearch: null,
      searches: 'Recherches illimitées',
      rule: fairUseRule(s),
      points: ['Tout le Pass Famille, toute l’année'],
      requiresAccount: true,
    });
  }
  return offers;
}

export async function passOffers(): Promise<Offer[]> {
  return buildOffers(await getSettings()).filter((o) => o.purpose !== 'UNLOCK');
}

export async function allOffers(): Promise<Offer[]> {
  return buildOffers(await getSettings());
}

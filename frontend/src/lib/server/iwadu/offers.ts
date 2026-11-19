import 'server-only';
import { formatFcfa } from '@/lib/format';
import type { Offer } from '@/lib/offer-types';
import type { SettingsValues } from '@/lib/settings-registry';
import { getSettings } from './settings';

// Offres lues dans les paramètres : une offre sans prix n'est pas proposée.
// « Illimité » est toujours suivi de sa règle d'usage raisonnable ; le Pass
// Famille se présente comme « plus de recherches », jamais par un nombre
// de personnes.
//
// Présentation (méthode « $100M Offers ») : le résultat promis d'abord, puis
// ce que la personne reçoit, chaque point formulé comme un problème réglé
// (temps, déplacements, surprise à la caisse), un repère de prix calculé
// (par jour, par recherche, face à l'acte), le bonus, puis les garanties.
// Pas de fausse rareté : tous les chiffres viennent des paramètres.

function durationLabel(days: number): string {
  if (days % 365 === 0) return days === 365 ? 'pour 12 mois' : `pour ${days / 365} ans`;
  return `pour ${days} jours`;
}

export function fairUseRule(s: SettingsValues): string | null {
  const max = s['fairUse.dailyMax'];
  return max ? `Usage raisonnable : ${max} nouvelles recherches par jour au plus.` : null;
}

const FOUND = {
  title: 'Les pharmacies qui ont toute l’ordonnance',
  detail: 'Nom, adresse, téléphone et itinéraire : vous y allez une seule fois.',
};
const PRICES = {
  title: 'Le prix exact, pharmacie par pharmacie',
  detail: 'Vous choisissez où payer moins, avant de vous déplacer.',
};
const INSURANCE = {
  title: 'Le reste à payer avec votre assurance',
  detail:
    'Indiquez votre taux de prise en charge : le montant est estimé pour chaque pharmacie, puis confirmé par le pharmacien.',
};

export function buildOffers(s: SettingsValues): Offer[] {
  const offers: Offer[] = [];
  const days = s['pass.durationDays'];
  const hours = s['result.linkHours'];
  const solo = s['pass.soloSearches'];
  const unlockPrice = s['price.unlock'] ?? null;
  const rule = fairUseRule(s);

  if (unlockPrice) {
    offers.push({
      purpose: 'UNLOCK',
      title: 'À l’acte',
      tagline: 'Une ordonnance, une réponse',
      price: unlockPrice,
      period: 'par ordonnance',
      perSearch: unlockPrice,
      searches: '1 recherche',
      rule: null,
      points: [
        'Noms, adresses et téléphones des pharmacies',
        'Prix exact par pharmacie et par médicament',
        'Reste à payer avec votre assurance',
        hours ? `Résultat à jour pendant ${hours} h, à partager` : 'Résultat à partager',
      ],
      requiresAccount: false,
      audience: 'Pour une ordonnance de temps en temps.',
      promise: 'Vous savez où aller avant de sortir, sans compte et sans engagement.',
      benefits: [
        FOUND,
        PRICES,
        INSURANCE,
        {
          title: hours ? `Résultat à jour pendant ${hours} h, à partager` : 'Résultat à partager',
          detail: 'Envoyez le lien à un proche qui va à la pharmacie pour vous.',
        },
      ],
      bonus: null,
      anchor: null,
    });
  }

  if (s['price.passSolo'] && days && solo) {
    const perSearch = Math.round(s['price.passSolo'] / solo);
    offers.push({
      purpose: 'PASS_SOLO',
      title: 'Pass Solo',
      tagline: 'Vos ordonnances du mois, sans chercher',
      price: s['price.passSolo'],
      period: durationLabel(days),
      perSearch,
      searches: `${solo} recherches`,
      rule: null,
      points: [
        'Carnet d’ordonnances',
        'Assurance enregistrée',
        'Ancienne ordonnance relancée sans nouvelle photo',
      ],
      requiresAccount: true,
      audience: 'Pour vous, si vous avez plusieurs ordonnances dans le mois.',
      promise: `${solo} ordonnances trouvées sans faire le tour des pharmacies.`,
      benefits: [
        {
          title: `${solo} recherches complètes`,
          detail: 'Noms, prix et reste à payer, comme à l’acte, pour chaque recherche.',
        },
        {
          title: 'Votre carnet d’ordonnances',
          detail:
            'Chaque ordonnance reste dans votre espace : vous la rouvrez sans la photographier.',
        },
        {
          title: 'Relance en un geste',
          detail:
            'Un traitement à renouveler ? Le stock est vérifié de nouveau, sans nouvelle photo.',
        },
        {
          title: 'Assurance enregistrée',
          detail: 'Votre taux est gardé : le reste à payer est calculé à chaque recherche.',
        },
      ],
      bonus: null,
      anchor:
        unlockPrice && unlockPrice > perSearch
          ? `Soit ${formatFcfa(perSearch)} la recherche, au lieu de ${formatFcfa(unlockPrice)} à l’acte.`
          : `Soit ${formatFcfa(perSearch)} la recherche.`,
    });
  }

  if (s['price.passFamily'] && days) {
    const perDay = Math.round(s['price.passFamily'] / days);
    offers.push({
      purpose: 'PASS_FAMILY',
      title: 'Pass Famille',
      tagline: 'Zéro tour de pharmacie',
      price: s['price.passFamily'],
      period: durationLabel(days),
      perSearch: null,
      searches: 'Recherches illimitées',
      rule,
      points: [
        'Tout le Pass Solo',
        'Ordonnances classées par prénom, pour qui vous voulez',
        'Offert : le guide « Comprendre votre prise en charge »',
      ],
      requiresAccount: true,
      audience: 'Pour les familles qui ont souvent des ordonnances.',
      promise: 'Toute la famille trouve ses médicaments sans courir d’une pharmacie à l’autre.',
      benefits: [
        {
          title: 'Recherches illimitées',
          detail: `${rule ? `${rule} ` : ''}Assez pour les ordonnances de toute la famille.`,
        },
        {
          title: 'Une ordonnance par proche, classée par prénom',
          detail:
            'Enfants, parents, grands-parents : chaque ordonnance porte un prénom, vous retrouvez tout en un instant.',
        },
        {
          title: 'Tout le Pass Solo',
          detail: 'Carnet d’ordonnances, relance sans nouvelle photo, assurance enregistrée.',
        },
        {
          title: 'Les pharmacies qui ont tout, avec les prix',
          detail: 'Vous savez où aller et combien prévoir avant de sortir.',
        },
      ],
      bonus: 'Le guide « Comprendre votre prise en charge »',
      anchor: `Soit ${formatFcfa(perDay)} par jour, pour toute la famille.`,
    });
  }

  const annualDays = s['pass.annualDays'];
  if (s['price.passFamilyAnnual'] && annualDays) {
    const months = days ? Math.round(annualDays / days) : 0;
    const saving =
      s['price.passFamily'] && months > 1
        ? s['price.passFamily'] * months - s['price.passFamilyAnnual']
        : 0;
    offers.push({
      purpose: 'PASS_FAMILY_ANNUAL',
      title: 'Pass Famille 12 mois',
      tagline: 'Un seul paiement',
      price: s['price.passFamilyAnnual'],
      period: durationLabel(annualDays),
      perSearch: null,
      searches: 'Recherches illimitées',
      rule,
      points: ['Tout le Pass Famille, toute l’année'],
      requiresAccount: true,
      audience: 'Pour les familles qui veulent être tranquilles toute l’année.',
      promise: 'Toute l’année sans tour de pharmacie, en un seul paiement.',
      benefits: [
        {
          title: 'Tout le Pass Famille, toute l’année',
          detail: 'Les mêmes avantages, sans rien renouveler.',
        },
      ],
      bonus: null,
      anchor:
        saving > 0
          ? `${formatFcfa(saving)} de moins que ${months} Pass Famille ${durationLabel(days!).replace('pour ', 'de ')}.`
          : null,
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

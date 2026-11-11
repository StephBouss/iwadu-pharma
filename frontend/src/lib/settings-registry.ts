// Registre des paramètres métier. Aucune VALEUR ici : les valeurs vivent dans
// la table `Setting` et se changent dans /admin/parametres sans republier le
// site. Ce fichier décrit seulement chaque clé (libellé, type, groupe) pour
// valider les saisies et construire l'écran des paramètres.

export type SettingType =
  | 'fcfa'
  | 'count'
  | 'km'
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'days'
  | 'percent'
  | 'boolean'
  | 'text';

export type SettingGroup =
  | 'Tarifs patients'
  | 'Aperçu gratuit et lien'
  | 'Usage raisonnable'
  | 'Garanties'
  | 'Recherche et stocks'
  | 'Paiements'
  | 'Pharmacies'
  | 'Contact et mentions'
  | 'Hors MVP';

export interface SettingDef {
  label: string;
  help?: string;
  group: SettingGroup;
  type: SettingType;
  /** Facultatif : vide = fonction désactivée ou information absente. */
  optional?: boolean;
  /** Fonction hors MVP (V2) : gardée en base, masquée dans le back-office. */
  hidden?: boolean;
}

export const SETTINGS = {
  // ─── Tarifs patients ────────────────────────────────────────────────────
  'price.unlock': {
    label: 'Paiement à l’acte',
    help: 'Une ordonnance débloquée : noms, prix exacts, assurance, itinéraire.',
    group: 'Tarifs patients',
    type: 'fcfa',
  },
  'price.passSolo': { label: 'Pass Solo', group: 'Tarifs patients', type: 'fcfa' },
  'price.passFamily': { label: 'Pass Famille', group: 'Tarifs patients', type: 'fcfa' },
  'price.passFamilyAnnual': {
    label: 'Pass Famille annuel',
    help: 'Vide : formule annuelle non proposée.',
    group: 'Tarifs patients',
    type: 'fcfa',
    optional: true,
  },
  'pass.durationDays': {
    label: 'Durée du Pass Solo et du Pass Famille',
    group: 'Tarifs patients',
    type: 'days',
  },
  'pass.annualDays': {
    label: 'Durée du Pass Famille annuel',
    group: 'Tarifs patients',
    type: 'days',
  },
  'pass.soloSearches': {
    label: 'Recherches incluses dans le Pass Solo',
    help: 'Sur la durée du Pass.',
    group: 'Tarifs patients',
    type: 'count',
  },

  // ─── Aperçu gratuit et lien ─────────────────────────────────────────────
  'preview.freeCount': {
    label: 'Aperçus gratuits par appareil',
    help: 'Au-delà, chaque nouvelle ordonnance demande un déblocage ou un Pass.',
    group: 'Aperçu gratuit et lien',
    type: 'count',
  },
  'preview.windowDays': {
    label: 'Période glissante des aperçus gratuits',
    group: 'Aperçu gratuit et lien',
    type: 'days',
  },
  'account.firstUnlockOffered': {
    label: 'Première ordonnance complète offerte avec un compte',
    help: 'Une seule fois par compte.',
    group: 'Aperçu gratuit et lien',
    type: 'boolean',
  },
  'result.linkHours': {
    label: 'Validité du lien d’une ordonnance débloquée',
    group: 'Aperçu gratuit et lien',
    type: 'hours',
  },

  // ─── Usage raisonnable du Pass Famille ──────────────────────────────────
  'fairUse.dailyMax': {
    label: 'Nouvelles recherches par jour, au plus',
    help: 'Au-delà, la recherche est bloquée jusqu’au lendemain.',
    group: 'Usage raisonnable',
    type: 'count',
  },
  'fairUse.monthlyAverage': {
    label: 'Moyenne mensuelle surveillée',
    help: 'Au-delà : alerte dans le back-office, sans coupure.',
    group: 'Usage raisonnable',
    type: 'count',
  },
  'fairUse.averageMonths': {
    label: 'Mois glissants pour la moyenne',
    group: 'Usage raisonnable',
    type: 'count',
  },

  // ─── Garanties ──────────────────────────────────────────────────────────
  'guarantee.tripReportHours': {
    label: 'Délai pour signaler un trajet inutile',
    help: 'Une recherche est rendue en crédit.',
    group: 'Garanties',
    type: 'hours',
  },
  'guarantee.tripText': {
    label: 'Texte de la garantie « Trajet utile »',
    group: 'Garanties',
    type: 'text',
    optional: true,
  },
  'guarantee.passRefundDays': {
    label: 'Remboursement du premier mois de Pass, demandé sous',
    group: 'Garanties',
    type: 'days',
  },
  'guarantee.passRefundMaxSearches': {
    label: 'Recherches utilisées au plus pour le remboursement',
    group: 'Garanties',
    type: 'count',
  },
  'guarantee.passRefundText': {
    label: 'Texte de la garantie du Pass',
    group: 'Garanties',
    type: 'text',
    optional: true,
  },

  // ─── Recherche et stocks ────────────────────────────────────────────────
  'ai.freeReadsPerDay': {
    label: 'Lectures par l’IA par appareil et par jour, sans Pass',
    help: 'Protège contre les abus et le coût de l’IA.',
    group: 'Recherche et stocks',
    type: 'count',
  },
  'search.radiusKm': { label: 'Rayon de recherche', group: 'Recherche et stocks', type: 'km' },
  'stock.lowMax': {
    label: 'Stock faible jusqu’à',
    help: 'Nombre de boîtes ; au-delà : « Disponible ».',
    group: 'Recherche et stocks',
    type: 'count',
  },
  'stock.staleMinutes': {
    label: 'Stock à confirmer après',
    help: 'Au-delà, le patient est invité à appeler la pharmacie.',
    group: 'Recherche et stocks',
    type: 'minutes',
  },

  // ─── Paiements ──────────────────────────────────────────────────────────
  'payment.timeoutSeconds': {
    label: 'Temps laissé pour valider un paiement',
    group: 'Paiements',
    type: 'seconds',
  },
  'fees.providerRatePercent': {
    label: 'Frais du prestataire de paiement',
    help: 'Sur chaque paiement reçu.',
    group: 'Paiements',
    type: 'percent',
  },
  'share.partnerRatePercent': {
    label: 'Part du partenaire logiciel',
    help: 'Sur le montant payé par le client, avant les frais ; hors annonces.',
    group: 'Paiements',
    type: 'percent',
  },
  'share.partnerName': {
    label: 'Nom du partenaire logiciel',
    group: 'Paiements',
    type: 'text',
    optional: true,
  },

  // ─── Pharmacies ─────────────────────────────────────────────────────────
  'pharmacy.syncAlertMinutes': {
    label: 'Alerte de synchronisation des stocks après',
    group: 'Pharmacies',
    type: 'minutes',
    optional: true,
  },

  // ─── Contact et mentions ────────────────────────────────────────────────
  'contact.whatsapp': {
    label: 'Numéro WhatsApp d’aide',
    help: 'Format international, ex. +241…',
    group: 'Contact et mentions',
    type: 'text',
    optional: true,
  },
  'contact.email': {
    label: 'E-mail de contact',
    group: 'Contact et mentions',
    type: 'text',
    optional: true,
  },
  'legal.publisher': {
    label: 'Responsable de la publication',
    group: 'Contact et mentions',
    type: 'text',
    optional: true,
  },
  'legal.host': {
    label: 'Hébergeur du site',
    group: 'Contact et mentions',
    type: 'text',
    optional: true,
  },

  // ─── Hors MVP (V2) : conservés pour la suite, masqués ───────────────────
  'reservation.expiryMinutes': {
    label: 'Délai d’une réservation',
    group: 'Hors MVP',
    type: 'minutes',
    optional: true,
    hidden: true,
  },
  'pharmacy.subscriptionMonthly': {
    label: 'Abonnement pharmacie, par mois',
    group: 'Hors MVP',
    type: 'fcfa',
    optional: true,
    hidden: true,
  },
  'pharmacy.subscriptionLaunch': {
    label: 'Abonnement au tarif de lancement, par mois',
    group: 'Hors MVP',
    type: 'fcfa',
    optional: true,
    hidden: true,
  },
  'pharmacy.launchMonths': {
    label: 'Durée du tarif de lancement',
    group: 'Hors MVP',
    type: 'count',
    optional: true,
    hidden: true,
  },
  'pharmacy.subscriptionAnnual': {
    label: 'Abonnement pharmacie annuel',
    group: 'Hors MVP',
    type: 'fcfa',
    optional: true,
    hidden: true,
  },
  'ads.enabled': {
    label: 'Annonces affichées',
    group: 'Hors MVP',
    type: 'boolean',
    optional: true,
    hidden: true,
  },
  'ads.priceMonthly': {
    label: 'Prix d’une annonce, par mois',
    group: 'Hors MVP',
    type: 'fcfa',
    optional: true,
    hidden: true,
  },
  'ads.perSlot': {
    label: 'Annonces par emplacement',
    group: 'Hors MVP',
    type: 'count',
    optional: true,
    hidden: true,
  },
} as const satisfies Record<string, SettingDef>;

export type SettingKey = keyof typeof SETTINGS;

type ValueFor<T extends SettingType> = T extends 'boolean'
  ? boolean
  : T extends 'text'
    ? string
    : number;

export type SettingValue<K extends SettingKey> = ValueFor<(typeof SETTINGS)[K]['type']>;

/** Valeurs lues en base ; `null` = paramètre absent ou invalide. */
export type SettingsValues = { [K in SettingKey]: SettingValue<K> | null };

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

/** Clés affichées dans le back-office (hors fonctions reportées en V2). */
export const VISIBLE_SETTING_KEYS = SETTING_KEYS.filter(
  (k) => !('hidden' in SETTINGS[k] && (SETTINGS[k] as SettingDef).hidden),
);

export const SETTING_UNITS: Record<SettingType, string> = {
  fcfa: 'FCFA',
  count: '',
  km: 'km',
  seconds: 's',
  minutes: 'min',
  hours: 'h',
  days: 'jours',
  percent: '%',
  boolean: '',
  text: '',
};

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS, key);
}

/**
 * Valide une valeur (lue en base ou saisie). Renvoie la valeur typée, ou
 * `null` si elle ne convient pas au type du paramètre.
 */
export function parseSettingValue<K extends SettingKey>(
  key: K,
  raw: unknown,
): SettingValue<K> | null {
  const { type } = SETTINGS[key];
  if (type === 'boolean') {
    return (typeof raw === 'boolean' ? raw : null) as SettingValue<K> | null;
  }
  if (type === 'text') {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return (trimmed.length > 0 && trimmed.length <= 300 ? trimmed : null) as SettingValue<K> | null;
  }
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
  if (type === 'percent') {
    return (n <= 100 ? Math.round(n * 100) / 100 : null) as SettingValue<K> | null;
  }
  if (!Number.isSafeInteger(n)) return null;
  return n as SettingValue<K>;
}

// Données FICTIVES d'un résultat de recherche d'ordonnance (maquette Banani
// « Résultats ordonnance »). Le vrai résultat viendra de la lecture de
// l'ordonnance et des stocks des pharmacies ; ce module disparaîtra alors.
// Rien ici ne doit être présenté comme réel.

import { formatClock, NBSP } from '@/lib/format';

/** Heure à Libreville, avec espace insécable (« 21 h »). */
const at = (isoUtc: string) => formatClock(new Date(isoUtc));

export interface DemoMedicine {
  id: string;
  name: string;
  /** Dosage tel que lu sur l'ordonnance : « 500 mg ». */
  dosage: string;
  /** Nombre de boîtes demandées. */
  quantity: number;
}

export interface DemoResultPharmacy {
  slug: string;
  name: string;
  distanceMeters: number;
  openingLabel: string;
  onDuty: boolean;
  /** Identifiants des médicaments de l'ordonnance en stock. */
  inStock: readonly string[];
  stockUpdatedAt: Date;
}

export interface DemoSearchResult {
  /** Quartier de la position actuelle du visiteur. */
  district: string;
  updatedAt: Date;
  medicines: readonly DemoMedicine[];
  pharmacies: readonly DemoResultPharmacy[];
  /** Prix chez la pharmacie mise en avant, en FCFA entiers. */
  price: {
    total: number;
    coverage: { ratePercent: number; amount: number; insurerName: string };
  };
}

export const DEMO_SEARCH_RESULT: DemoSearchResult = {
  district: 'Louis',
  updatedAt: new Date('2026-11-04T13:05:00Z'),
  medicines: [
    { id: 'paracetamol', name: 'Paracétamol', dosage: `500${NBSP}mg`, quantity: 2 },
    { id: 'amoxicilline', name: 'Amoxicilline', dosage: `1${NBSP}g`, quantity: 1 },
    { id: 'ibuprofene', name: 'Ibuprofène', dosage: `400${NBSP}mg`, quantity: 1 },
  ],
  pharmacies: [
    {
      slug: 'pharmacie-exemple',
      name: 'Pharmacie Exemple',
      distanceMeters: 1400,
      openingLabel: 'De garde cette nuit',
      onDuty: true,
      inStock: ['paracetamol', 'ibuprofene'],
      stockUpdatedAt: new Date('2026-11-04T12:40:00Z'),
    },
    {
      slug: 'pharmacie-demo',
      name: 'Pharmacie Démo',
      distanceMeters: 800,
      openingLabel: `Ouverte jusqu’à ${at('2026-11-04T20:00:00Z')}`,
      onDuty: false,
      inStock: ['paracetamol', 'amoxicilline', 'ibuprofene'],
      stockUpdatedAt: new Date('2026-11-04T13:05:00Z'),
    },
  ],
  price: {
    total: 6000,
    coverage: { ratePercent: 25, amount: 1500, insurerName: 'Assurance Démo' },
  },
};

// Offres présentées au patient (tarifs, accueil, résultat, Mon espace).
// Construites côté serveur à partir des paramètres ; ce fichier ne porte
// que leur forme, utilisable dans les composants clients.

export type OfferPurpose = 'UNLOCK' | 'PASS_SOLO' | 'PASS_FAMILY' | 'PASS_FAMILY_ANNUAL';

export interface Offer {
  purpose: OfferPurpose;
  title: string;
  /** Accroche courte sous le titre. */
  tagline: string | null;
  price: number;
  /** « par ordonnance », « pour 30 jours »… */
  period: string;
  /** Prix d'une recherche quand il se calcule (acte, Pass Solo). */
  perSearch: number | null;
  /** « 10 recherches » ou « Recherches illimitées ». */
  searches: string;
  /** Règle affichée juste à côté du mot « Illimité ». */
  rule: string | null;
  points: string[];
  requiresAccount: boolean;
}

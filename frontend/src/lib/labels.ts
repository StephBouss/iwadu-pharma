// Libellés partagés (pages serveur et composants client).

export const PURPOSE_LABELS: Record<string, string> = {
  UNLOCK: 'Paiement à l’acte',
  PASS_SOLO: 'Pass Solo',
  PASS_FAMILY: 'Pass Famille',
  PASS_FAMILY_ANNUAL: 'Pass Famille annuel',
  PHARMACY_SUBSCRIPTION: 'Abonnement pharmacie',
  AD: 'Annonce',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PAID: 'Payé',
  FAILED: 'Échoué',
  EXPIRED: 'Expiré',
  CANCELLED: 'Annulé',
  REFUNDED: 'Remboursé',
};

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  SENT: 'Envoyée',
  ACCEPTED: 'Acceptée',
  READY: 'Prête',
  PICKED_UP: 'Retirée',
  REFUSED: 'Refusée',
  EXPIRED: 'Expirée',
  CANCELLED: 'Annulée',
};

/** État visuel (StatusBadge) d'un statut de réservation : couleur + icône + mot. */
export function reservationTone(
  status: string,
): 'available' | 'low' | 'unavailable' | 'verify' | 'error' {
  switch (status) {
    case 'READY':
    case 'PICKED_UP':
      return 'available';
    case 'ACCEPTED':
      return 'low';
    case 'SENT':
      return 'verify';
    case 'REFUSED':
      return 'error';
    default:
      return 'unavailable';
  }
}

export function orderTone(status: string): 'available' | 'verify' | 'error' | 'unavailable' {
  if (status === 'PAID') return 'available';
  if (status === 'PENDING') return 'verify';
  if (status === 'FAILED') return 'error';
  return 'unavailable';
}

export const PLAN_LABELS: Record<string, string> = { SOLO: 'Pass Solo', FAMILY: 'Pass Famille' };

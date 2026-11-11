import 'server-only';
import type { WebhookProvider } from '@/lib/server/webhook/handler';
import { simulatorProvider } from './simulator';

// Paiement Mobile Money par demande envoyée sur le téléphone (Airtel Money,
// Moov Money) : le serveur crée la demande, le patient compose son code
// secret, le prestataire confirme par webhook. Seul le webhook vérifié
// active un déblocage ou un Pass.
//
// BambooPay : l'adaptateur sera écrit dès réception de la documentation de
// son API, de ses clés de test et de la méthode de signature du webhook
// (rien n'est inventé en attendant). D'ici là, un SIMULATEUR signe un
// webhook et le fait passer par la même fabrique protégée : la page affiche
// alors « Paiement de démonstration ». Actif par défaut en développement ;
// sur le site de démonstration, seulement avec PAYMENT_SIMULATOR=1.

export type Operator = 'AIRTEL' | 'MOOV';

export interface PaymentRequestInput {
  orderId: string;
  amount: number;
  currency: 'XAF';
  phone: string;
  operator: Operator;
  description: string;
}

export interface MobileMoneyProvider {
  name: string;
  simulated: boolean;
  requestPayment(input: PaymentRequestInput): Promise<{ providerChargeId: string }>;
}

export interface WebhookEvent {
  chargeId: string;
  operator: string | null;
  /** Montant confirmé par le prestataire, vérifié contre la commande. */
  amount: number | null;
}

export type ProviderWebhook = WebhookProvider<unknown> & {
  chargeOf(payload: unknown): WebhookEvent | null;
};

export class PaymentUnavailableError extends Error {
  constructor() {
    super('Aucun prestataire de paiement configuré');
    this.name = 'PaymentUnavailableError';
  }
}

export function isSimulatorEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return process.env.PAYMENT_SIMULATOR === '1';
  return process.env.PAYMENT_SIMULATOR !== '0';
}

export function getMobileMoneyProvider(): MobileMoneyProvider {
  // BambooPay sera branché ici dès que son API est confirmée.
  if (isSimulatorEnabled()) return simulatorProvider;
  throw new PaymentUnavailableError();
}

import 'server-only';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { MobileMoneyProvider, ProviderWebhook } from './provider';

// Simulateur de paiement Mobile Money — développement et site de démonstration.
// Il imite un prestataire : la demande est « envoyée » au téléphone, puis
// le développeur choisit l'issue ; le simulateur signe alors un webhook
// HMAC qui passe par la fabrique de webhooks protégée, exactement comme
// le ferait BambooPay. Désactivé en production sauf PAYMENT_SIMULATOR=1.

const HEADER = 'x-simulator-signature';

function secret(): string {
  return (
    process.env.PAYMENT_SIMULATOR_SECRET ||
    createHash('sha256')
      .update(`iwadu-simulator:${process.env.JWT_SECRET ?? ''}`)
      .digest('hex')
  );
}

export function signSimulatorPayload(raw: string): string {
  return createHmac('sha256', secret()).update(raw).digest('hex');
}

export interface SimulatorPayload {
  eventId: string;
  type: 'payment.succeeded' | 'payment.failed';
  chargeId: string;
  operator: string;
  amount: number;
}

export function buildSimulatorEvent(
  chargeId: string,
  outcome: 'paid' | 'failed',
  operator: string,
  amount: number,
): { raw: string; signature: string } {
  const payload: SimulatorPayload = {
    eventId: randomUUID(),
    type: outcome === 'paid' ? 'payment.succeeded' : 'payment.failed',
    chargeId,
    operator,
    amount,
  };
  const raw = JSON.stringify(payload);
  return { raw, signature: signSimulatorPayload(raw) };
}

export const simulatorProvider: MobileMoneyProvider = {
  name: 'simulator',
  simulated: true,
  async requestPayment(input) {
    return { providerChargeId: `sim_${input.orderId}` };
  },
};

export const simulatorWebhook: ProviderWebhook = {
  name: 'simulator',
  verifySignature(rawBody, headers) {
    const given = headers[HEADER];
    if (!given) return { valid: false, reason: 'missing signature' };
    const expected = Buffer.from(signSimulatorPayload(rawBody.toString('utf8')));
    const actual = Buffer.from(given);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return { valid: false, reason: 'bad signature' };
    }
    return { valid: true };
  },
  parsePayload(rawBody) {
    return JSON.parse(rawBody.toString('utf8')) as unknown;
  },
  extractIds(payload) {
    const p = payload as Partial<SimulatorPayload>;
    return {
      externalId: String(p.eventId ?? ''),
      eventType: String(p.type ?? 'unknown'),
      kind:
        p.type === 'payment.succeeded' ? 'paid' : p.type === 'payment.failed' ? 'failed' : 'other',
    };
  },
  chargeOf(payload) {
    const p = payload as Partial<SimulatorPayload>;
    return p.chargeId
      ? {
          chargeId: p.chargeId,
          operator: p.operator ?? null,
          amount: typeof p.amount === 'number' ? p.amount : null,
        }
      : null;
  },
};

export const SIMULATOR_SIGNATURE_HEADER = HEADER;

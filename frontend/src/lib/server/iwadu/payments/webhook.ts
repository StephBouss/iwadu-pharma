import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { createWebhookHandler } from '@/lib/server/webhook/handler';
import { pushEmailPointers } from '../mail';
import { failCharge, fulfilPaidCharge } from './fulfil';
import type { ProviderWebhook } from './provider';

/**
 * Route webhook d'un prestataire Mobile Money, branchée sur la fabrique
 * protégée (corps brut, signature, transaction sérialisable, déduplication).
 * Le même code sert au simulateur de développement et servira à BambooPay.
 */
export function providerWebhookRoute(provider: ProviderWebhook) {
  return createWebhookHandler<unknown>({
    prisma,
    provider,
    async onPaid(payload, tx) {
      const charge = provider.chargeOf(payload);
      if (!charge) return {};
      const { emailIds } = await fulfilPaidCharge(
        tx,
        charge.chargeId,
        charge.operator,
        charge.amount,
      );
      return emailIds.length > 0 ? { postCommit: () => pushEmailPointers(emailIds) } : {};
    },
    async onFailed(payload, tx) {
      const charge = provider.chargeOf(payload);
      if (charge) await failCharge(tx, charge.chargeId);
      return {};
    },
  });
}

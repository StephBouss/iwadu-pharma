import 'server-only';
import type { Prisma } from '@prisma/client';
import { normalizeGabonPhone } from '@/lib/phone';
import { percentOf } from '@/lib/pricing';
import { prisma } from '@/lib/server/prisma';
import { track } from '../analytics';
import { getSettings } from '../settings';
import type { Viewer } from '../viewer';
import { PURPOSE_LABELS, type OrderMeta } from './fulfil';
import { getMobileMoneyProvider, type Operator } from './provider';

export type Purpose =
  | 'UNLOCK'
  | 'PASS_SOLO'
  | 'PASS_FAMILY'
  | 'PASS_FAMILY_ANNUAL'
  | 'PHARMACY_SUBSCRIPTION';

export class PaymentStartError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface StartedPayment {
  orderId: string;
  status: string;
  amount: number;
  timeoutSeconds: number;
  simulated: boolean;
}

const GRACE_MS = 10 * 60 * 1000;

export async function startPayment(input: {
  purpose: Purpose;
  searchToken?: string | undefined;
  plan?: 'MONTHLY' | 'ANNUAL' | undefined;
  phone: string;
  operator: Operator;
  idempotencyKey: string;
  viewer: Viewer;
  deviceId: string;
}): Promise<StartedPayment> {
  const settings = await getSettings();
  const timeoutSeconds = settings['payment.timeoutSeconds'];
  const feeRate = settings['fees.providerRatePercent'];
  const partnerRate = settings['share.partnerRatePercent'] ?? 0;
  const required = [
    'result.linkHours',
    'pass.durationDays',
    'pass.annualDays',
    'pass.soloSearches',
  ] as const;
  if (!timeoutSeconds || feeRate === null || required.some((k) => settings[k] === null)) {
    throw new PaymentStartError('SETTINGS_MISSING', 503, 'Le paiement n’est pas encore ouvert.');
  }

  const provider = getMobileMoneyProvider();

  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    if (existing.purpose !== input.purpose) {
      throw new PaymentStartError('IDEMPOTENCY_KEY_BODY_MISMATCH', 422, 'Demande déjà utilisée.');
    }
    return {
      orderId: existing.id,
      status: existing.status,
      amount: existing.amount,
      timeoutSeconds,
      simulated: existing.provider === 'simulator',
    };
  }

  const phone = normalizeGabonPhone(input.phone);
  if (!phone) throw new PaymentStartError('PHONE_INVALID', 400, 'Numéro de téléphone invalide.');

  const user = input.viewer.user;
  const meta: OrderMeta = { deviceId: input.deviceId, operator: input.operator };
  let amount: number | null = null;

  switch (input.purpose) {
    case 'UNLOCK': {
      // Déblocage à l’acte : sans compte.
      const session = input.searchToken
        ? await prisma.searchSession.findUnique({ where: { token: input.searchToken } })
        : null;
      if (!session || session.expiresAt <= new Date()) {
        throw new PaymentStartError('SEARCH_NOT_FOUND', 404, 'Cette recherche a expiré.');
      }
      if (session.completeCount + session.partialCount === 0) {
        throw new PaymentStartError(
          'NO_RESULT',
          409,
          'Aucune pharmacie n’a ces médicaments : vous ne payez rien.',
        );
      }
      const already = await prisma.unlock.findFirst({ where: { searchSessionId: session.id } });
      if (already) throw new PaymentStartError('ALREADY_UNLOCKED', 409, 'Déjà débloqué.');
      meta.searchSessionId = session.id;
      amount = settings['price.unlock'];
      break;
    }
    case 'PASS_SOLO':
    case 'PASS_FAMILY':
    case 'PASS_FAMILY_ANNUAL': {
      if (!user)
        throw new PaymentStartError('LOGIN_REQUIRED', 401, 'Connectez-vous pour prendre un Pass.');
      amount =
        input.purpose === 'PASS_SOLO'
          ? settings['price.passSolo']
          : input.purpose === 'PASS_FAMILY'
            ? settings['price.passFamily']
            : settings['price.passFamilyAnnual'];
      // Pass pris depuis un résultat : cette ordonnance est débloquée avec lui.
      if (input.searchToken) {
        const session = await prisma.searchSession.findUnique({
          where: { token: input.searchToken },
          select: { id: true, expiresAt: true },
        });
        if (session && session.expiresAt > new Date()) meta.searchSessionId = session.id;
      }
      break;
    }
    case 'PHARMACY_SUBSCRIPTION': {
      if (!user?.pharmacyId) {
        throw new PaymentStartError('PHARMACY_REQUIRED', 403, 'Réservé aux pharmacies.');
      }
      const pharmacy = await prisma.pharmacy.findUnique({ where: { id: user.pharmacyId } });
      if (!pharmacy)
        throw new PaymentStartError('PHARMACY_REQUIRED', 403, 'Pharmacie introuvable.');
      const annual = input.plan === 'ANNUAL';
      amount = annual
        ? settings['pharmacy.subscriptionAnnual']
        : pharmacy.launchPricing
          ? settings['pharmacy.subscriptionLaunch']
          : settings['pharmacy.subscriptionMonthly'];
      meta.pharmacyId = pharmacy.id;
      meta.plan = annual ? 'ANNUAL' : 'MONTHLY';
      break;
    }
  }
  if (!amount || amount <= 0) {
    throw new PaymentStartError('OFFER_UNAVAILABLE', 400, 'Cette offre n’est pas disponible.');
  }

  const now = new Date();
  const order = await prisma.order.create({
    data: {
      userId: user?.id ?? null,
      amount,
      currency: 'XAF',
      status: 'PENDING',
      customerEmail: user?.email ?? null,
      customerPhone: phone,
      customerName: user?.name ?? null,
      metadata: meta as Prisma.InputJsonValue,
      idempotencyKey: input.idempotencyKey,
      provider: provider.name,
      purpose: input.purpose,
      // Frais du prestataire et part du partenaire, au taux en vigueur ; la
      // part se calcule sur le montant payé par le client, avant les frais.
      feeAmount: percentOf(amount, feeRate),
      commissionAmount: percentOf(amount, partnerRate),
      netAmount: amount - percentOf(amount, feeRate) - percentOf(amount, partnerRate),
      paymentMethod: input.operator,
      expiresAt: new Date(now.getTime() + timeoutSeconds * 1000 + GRACE_MS),
    },
  });

  try {
    const { providerChargeId } = await provider.requestPayment({
      orderId: order.id,
      amount,
      currency: 'XAF',
      phone,
      operator: input.operator,
      description: `Iwadu Pharma — ${PURPOSE_LABELS[input.purpose]}`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { providerChargeId } });
  } catch {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    throw new PaymentStartError('PAYMENT_FAILED', 502, 'La demande de paiement n’a pas pu partir.');
  }

  if (user)
    await prisma.user.update({ where: { id: user.id }, data: { phone } }).catch(() => undefined);
  await track(
    'payment_started',
    { userId: user?.id, deviceId: input.deviceId },
    { purpose: input.purpose, amount },
  );

  return {
    orderId: order.id,
    status: 'PENDING',
    amount,
    timeoutSeconds,
    simulated: provider.simulated,
  };
}

/** Le paiement appartient-il au visiteur (compte ou appareil) ? */
export function ownsOrder(
  order: { userId: string | null; metadata: Prisma.JsonValue },
  viewer: Viewer,
): boolean {
  if (viewer.user && order.userId === viewer.user.id) return true;
  const meta = (order.metadata ?? {}) as OrderMeta;
  return Boolean(viewer.deviceId && meta.deviceId === viewer.deviceId);
}

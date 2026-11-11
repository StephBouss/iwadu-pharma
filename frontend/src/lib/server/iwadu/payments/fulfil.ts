import 'server-only';
import type { Prisma } from '@prisma/client';
import { formatDayMonth, formatFcfa } from '@/lib/format';
import { track } from '../analytics';
import { queueEmail } from '../mail';
import { getSettings, need } from '../settings';

// Effets d'un paiement CONFIRMÉ par webhook vérifié, dans la transaction
// sérialisable de la fabrique de webhooks : déblocage, Pass, abonnement,
// reçu. Rejouer le même webhook ne fait rien (WebhookLog + identifiants
// uniques sur Unlock.orderId et Pass.orderId).

type Tx = Prisma.TransactionClient;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Débloque une ordonnance (une seule fois) et ouvre son lien pour la durée du paramètre. */
async function unlockSession(
  tx: Tx,
  searchSessionId: string,
  data: { userId: string | null; deviceId: string | null; kind: 'PAID' | 'PASS'; orderId: string },
  linkHours: number,
  now: Date,
): Promise<boolean> {
  const session = await tx.searchSession.findUnique({
    where: { id: searchSessionId },
    select: { id: true, userId: true, completeCount: true, partialCount: true },
  });
  if (!session || session.completeCount + session.partialCount === 0) return false;
  if ((await tx.unlock.count({ where: { searchSessionId } })) > 0) return false;
  await tx.unlock.create({ data: { searchSessionId, ...data } });
  await tx.searchSession.update({
    where: { id: searchSessionId },
    data: {
      unlockedAt: now,
      expiresAt: new Date(now.getTime() + linkHours * HOUR_MS),
      userId: session.userId ?? data.userId,
    },
  });
  return true;
}

export { PURPOSE_LABELS } from '@/lib/labels';
import { PURPOSE_LABELS } from '@/lib/labels';

export interface OrderMeta {
  deviceId?: string | null;
  searchSessionId?: string | null;
  pharmacyId?: string | null;
  plan?: string | null;
  operator?: string | null;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export async function fulfilPaidCharge(
  tx: Tx,
  chargeId: string,
  operator: string | null,
  /** Montant confirmé par le prestataire : il doit égaler celui de la commande. */
  amount: number | null = null,
): Promise<{ emailIds: string[] }> {
  const order = await tx.order.findFirst({ where: { providerChargeId: chargeId } });
  if (!order || order.status === 'PAID' || order.status === 'REFUNDED') return { emailIds: [] };
  if (amount !== null && amount !== order.amount) {
    // Montant différent de la référence : rien n’est débloqué.
    await tx.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    return { emailIds: [] };
  }

  const now = new Date();
  const settings = await getSettings();
  const meta = (order.metadata ?? {}) as OrderMeta;
  await tx.order.update({
    where: { id: order.id },
    data: { status: 'PAID', paidAt: now, ...(operator ? { paymentMethod: operator } : {}) },
  });

  let detail = '';
  switch (order.purpose) {
    case 'UNLOCK': {
      if (!meta.searchSessionId) break;
      await unlockSession(
        tx,
        meta.searchSessionId,
        { userId: order.userId, deviceId: meta.deviceId ?? null, kind: 'PAID', orderId: order.id },
        need(settings, 'result.linkHours'),
        now,
      );
      detail = 'Les noms et les prix de votre ordonnance sont débloqués.';
      break;
    }
    case 'PASS_SOLO':
    case 'PASS_FAMILY':
    case 'PASS_FAMILY_ANNUAL': {
      if (!order.userId) break;
      const plan = order.purpose === 'PASS_SOLO' ? 'SOLO' : 'FAMILY';
      const current = await tx.pass.findFirst({
        where: { userId: order.userId, endsAt: { gt: now } },
        orderBy: { endsAt: 'desc' },
      });
      const startsAt = current ? current.endsAt : now;
      const days =
        order.purpose === 'PASS_FAMILY_ANNUAL'
          ? need(settings, 'pass.annualDays')
          : need(settings, 'pass.durationDays');
      // Pass Solo : recherches incluses ; Pass Famille : 0 = illimitées (usage raisonnable).
      const quota = plan === 'SOLO' ? need(settings, 'pass.soloSearches') : 0;
      const endsAt = new Date(startsAt.getTime() + days * DAY_MS);
      await tx.pass.create({
        data: {
          userId: order.userId,
          plan,
          startsAt,
          endsAt,
          aiReadsQuota: quota,
          orderId: order.id,
        },
      });
      await track('pass_bought', { userId: order.userId }, { plan: order.purpose }, tx);
      // Pass pris depuis un résultat : il débloque cette ordonnance (1re recherche du Pass).
      if (meta.searchSessionId && startsAt <= now) {
        await unlockSession(
          tx,
          meta.searchSessionId,
          {
            userId: order.userId,
            deviceId: meta.deviceId ?? null,
            kind: 'PASS',
            orderId: order.id,
          },
          need(settings, 'result.linkHours'),
          now,
        );
      }
      detail = `Votre ${PURPOSE_LABELS[order.purpose]} est actif jusqu’au ${formatDayMonth(endsAt).toLowerCase()}.`;
      break;
    }
    case 'PHARMACY_SUBSCRIPTION': {
      if (!meta.pharmacyId) break;
      const pharmacy = await tx.pharmacy.findUnique({ where: { id: meta.pharmacyId } });
      if (!pharmacy) break;
      const base =
        pharmacy.subscriptionEndsAt && pharmacy.subscriptionEndsAt > now
          ? pharmacy.subscriptionEndsAt
          : now;
      const annual = meta.plan === 'ANNUAL';
      const endsAt = addMonths(base, annual ? 12 : 1);
      await tx.pharmacy.update({
        where: { id: pharmacy.id },
        data: { subscriptionEndsAt: endsAt, plan: annual ? 'ANNUAL' : 'MONTHLY' },
      });
      detail = `Votre abonnement court jusqu’au ${formatDayMonth(endsAt).toLowerCase()}.`;
      break;
    }
    default:
      break;
  }

  await track(
    'payment_confirmed',
    { userId: order.userId, deviceId: meta.deviceId ?? null },
    { purpose: order.purpose ?? 'UNKNOWN', amount: order.amount },
    tx,
  );

  const emailIds: string[] = [];
  if (order.customerEmail) {
    emailIds.push(
      await queueEmail(tx, {
        to: order.customerEmail,
        subject: 'Votre reçu Iwadu Pharma',
        title: 'Paiement confirmé',
        paragraphs: [
          `${PURPOSE_LABELS[order.purpose ?? ''] ?? 'Paiement'} : ${formatFcfa(order.amount)}.`,
          detail,
          `Référence : ${order.id}`,
        ].filter(Boolean),
      }),
    );
  }
  return { emailIds };
}

export async function failCharge(tx: Tx, chargeId: string): Promise<void> {
  await tx.order.updateMany({
    where: { providerChargeId: chargeId, status: 'PENDING' },
    data: { status: 'FAILED' },
  });
}

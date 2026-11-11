import 'server-only';
import type { Prisma } from '@prisma/client';
import { createLogger } from '@/lib/server/logger';
import { prisma } from '@/lib/server/prisma';

// Événements de mesure de l'entonnoir. Jamais de position exacte : le
// quartier seulement. Une mesure qui échoue ne casse jamais le parcours.

export const EVENT_NAMES = [
  'landing_view',
  'photo_sent',
  'list_validated',
  'insurance_answered',
  'free_result_shown',
  'unlock_clicked',
  'payment_started',
  'payment_confirmed',
  'reservation_created',
  'account_created',
  'pass_bought',
  'directions_clicked',
  'call_clicked',
  'pharmacy_viewed',
  'result_unlocked',
  'trip_reported',
  'share_clicked',
  'name_detected',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export interface EventContext {
  userId?: string | null | undefined;
  deviceId?: string | null | undefined;
  districtId?: string | null | undefined;
}

type EventClient = Pick<Prisma.TransactionClient, 'analyticsEvent'>;

const logger = createLogger();

export async function track(
  name: EventName,
  ctx: EventContext,
  props?: Record<string, string | number | boolean | null>,
  client: EventClient = prisma,
): Promise<void> {
  try {
    await client.analyticsEvent.create({
      data: {
        name,
        userId: ctx.userId ?? null,
        deviceId: ctx.deviceId ?? null,
        districtId: ctx.districtId ?? null,
        ...(props ? { props } : {}),
      },
    });
  } catch (err) {
    logger.warn('[analytics] event not recorded', { name, err: String(err) });
  }
}

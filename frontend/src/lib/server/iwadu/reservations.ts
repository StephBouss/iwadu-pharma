import 'server-only';
import { RESERVATIONS_ENABLED } from '@/lib/features';
import { randomInt } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { formatFcfa } from '@/lib/format';
import { prisma } from '@/lib/server/prisma';
import { track } from './analytics';
import { pushEmailPointers, queueEmail } from './mail';
import { getSearchView } from './search';
import { getSettings, need } from './settings';
import type { Viewer } from './viewer';

// Réservations : le patient (Pass, ou paiement à l'acte encore valable)
// réserve chez une pharmacie du résultat ; la pharmacie accepte, prépare
// ou refuse ; le patient paie au comptoir. Statuts :
//   SENT → ACCEPTED → READY → PICKED_UP
//   SENT | ACCEPTED → REFUSED ; SENT | ACCEPTED | READY → CANCELLED (patient)
//   sans suite avant l'échéance → EXPIRED

export const OPEN_STATUSES = ['SENT', 'ACCEPTED', 'READY'] as const;
export type ReservationStatus =
  | 'SENT'
  | 'ACCEPTED'
  | 'READY'
  | 'PICKED_UP'
  | 'REFUSED'
  | 'EXPIRED'
  | 'CANCELLED';

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  SENT: 'Envoyée',
  ACCEPTED: 'Acceptée',
  READY: 'Prête',
  PICKED_UP: 'Retirée',
  REFUSED: 'Refusée',
  EXPIRED: 'Expirée',
  CANCELLED: 'Annulée',
};

export interface ReservationItem {
  productId: string;
  label: string;
  quantity: number;
  unitPriceFcfa: number | null;
}

export class ReservationError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function newCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Passe en EXPIRED les réservations ouvertes dont l'échéance est passée. */
export async function expireDueReservations(client: PrismaClient = prisma): Promise<number> {
  const res = await client.reservation.updateMany({
    where: { status: { in: [...OPEN_STATUSES] }, expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return res.count;
}

async function pharmacyEmails(tx: Prisma.TransactionClient, pharmacyId: string): Promise<string[]> {
  const members = await tx.pharmacyMember.findMany({
    where: { pharmacyId },
    select: { user: { select: { email: true } } },
  });
  return members.map((m) => m.user.email);
}

export async function createReservation(input: {
  viewer: Viewer;
  searchToken: string;
  pharmacySlug: string;
  familyMemberId?: string | null | undefined;
}): Promise<{ id: string; code: string }> {
  const user = input.viewer.user;
  if (!user) throw new ReservationError('LOGIN_REQUIRED', 401, 'Connectez-vous pour réserver.');

  const view = await getSearchView(input.searchToken, input.viewer);
  if (view.state !== 'ready')
    throw new ReservationError('SEARCH_NOT_FOUND', 404, 'Cette recherche a expiré.');
  if (!RESERVATIONS_ENABLED || view.access.kind !== 'unlocked') {
    throw new ReservationError(
      'RESERVATION_NOT_INCLUDED',
      403,
      'La réservation arrive bientôt. Appelez la pharmacie pour vos médicaments.',
    );
  }
  const pharmacy = view.pharmacies.find((p) => p.slug === input.pharmacySlug);
  if (!pharmacy)
    throw new ReservationError(
      'PHARMACY_NOT_FOUND',
      404,
      'Pharmacie introuvable dans ce résultat.',
    );
  const items: ReservationItem[] = pharmacy.lines
    .filter((l) => l.status !== 'unavailable')
    .map((l) => ({
      productId: l.productId,
      label: l.label,
      quantity: l.quantity,
      unitPriceFcfa: pharmacy.showPrices ? l.unitPriceFcfa : null,
    }));
  if (items.length === 0) {
    throw new ReservationError(
      'NOTHING_TO_RESERVE',
      400,
      'Cette pharmacie n’a aucun de ces médicaments en stock.',
    );
  }

  let familyMemberId: string | null = null;
  if (input.familyMemberId) {
    const member = await prisma.familyMember.findFirst({
      where: { id: input.familyMemberId, userId: user.id },
    });
    familyMemberId = member?.id ?? null;
  }

  const row = await prisma.pharmacy.findUnique({
    where: { slug: pharmacy.slug },
    select: { id: true, name: true, districtId: true },
  });
  if (!row) throw new ReservationError('PHARMACY_NOT_FOUND', 404, 'Pharmacie introuvable.');
  const session = await prisma.searchSession.findUnique({
    where: { token: input.searchToken },
    select: { id: true },
  });

  const existing = await prisma.reservation.findFirst({
    where: {
      userId: user.id,
      pharmacyId: row.id,
      searchSessionId: session?.id ?? null,
      status: { in: [...OPEN_STATUSES] },
    },
  });
  if (existing) return { id: existing.id, code: existing.code };

  const settings = await getSettings();
  const minutes = need(settings, 'reservation.expiryMinutes');
  const now = new Date();
  const total = pharmacy.showPrices ? pharmacy.invoice : null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      const { reservation, emailIds } = await prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.create({
          data: {
            code,
            userId: user.id,
            pharmacyId: row.id,
            searchSessionId: session?.id ?? null,
            familyMemberId,
            items: items as unknown as Prisma.InputJsonValue,
            totalFcfa: total,
            expiresAt: new Date(now.getTime() + minutes * 60_000),
          },
        });
        const lines = items.map((i) => `${i.label} × ${i.quantity}`);
        const emailIds: string[] = [];
        emailIds.push(
          await queueEmail(tx, {
            to: user.email,
            subject: `Réservation ${code} envoyée à ${row.name}`,
            title: 'Votre réservation est envoyée',
            paragraphs: [
              `${row.name} va confirmer la disponibilité. Vous serez prévenu par e-mail.`,
              ...lines,
              total !== null
                ? `Montant estimé : ${formatFcfa(total)}, à payer en pharmacie.`
                : 'Prix communiqué en pharmacie.',
              `Code à donner au comptoir : ${code}`,
            ],
          }),
        );
        for (const to of await pharmacyEmails(tx, row.id)) {
          emailIds.push(
            await queueEmail(tx, {
              to,
              subject: `Nouvelle réservation ${code}`,
              title: 'Nouvelle réservation',
              paragraphs: [
                ...lines,
                'Ouvrez votre espace pharmacie pour l’accepter ou la refuser.',
              ],
            }),
          );
        }
        await track(
          'reservation_created',
          { userId: user.id, districtId: row.districtId },
          { items: items.length },
          tx,
        );
        return { reservation, emailIds };
      });
      await pushEmailPointers(emailIds);
      return { id: reservation.id, code: reservation.code };
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') continue; // code déjà pris : on en tire un autre
      throw err;
    }
  }
  throw new ReservationError('RESERVATION_FAILED', 500, 'La réservation n’a pas pu être créée.');
}

type PharmacyAction = 'accept' | 'ready' | 'refuse' | 'picked_up';

const TRANSITIONS: Record<PharmacyAction, { from: ReservationStatus[]; to: ReservationStatus }> = {
  accept: { from: ['SENT'], to: 'ACCEPTED' },
  ready: { from: ['SENT', 'ACCEPTED'], to: 'READY' },
  refuse: { from: ['SENT', 'ACCEPTED'], to: 'REFUSED' },
  picked_up: { from: ['READY', 'ACCEPTED'], to: 'PICKED_UP' },
};

export async function pharmacyUpdateReservation(input: {
  pharmacyId: string;
  reservationId: string;
  action: PharmacyAction;
  reason?: string | undefined;
  missing?: boolean | undefined;
}): Promise<{ status: ReservationStatus }> {
  await expireDueReservations();
  const settings = await getSettings();
  const minutes = need(settings, 'reservation.expiryMinutes');
  const rule = TRANSITIONS[input.action];
  const now = new Date();

  const { status, emailIds } = await prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findFirst({
      where: { id: input.reservationId, pharmacyId: input.pharmacyId },
      include: { user: { select: { email: true } }, pharmacy: { select: { name: true } } },
    });
    if (!r) throw new ReservationError('NOT_FOUND', 404, 'Réservation introuvable.');
    if (!rule.from.includes(r.status as ReservationStatus)) {
      throw new ReservationError(
        'INVALID_STATUS',
        409,
        'Cette réservation a déjà changé de statut.',
      );
    }
    const data: Prisma.ReservationUpdateInput = { status: rule.to };
    if (input.action === 'accept' || input.action === 'refuse') data.respondedAt = now;
    if (input.action === 'ready') {
      data.readyAt = now;
      data.respondedAt = r.respondedAt ?? now;
      data.expiresAt = new Date(now.getTime() + minutes * 60_000);
    }
    if (input.action === 'accept') data.expiresAt = new Date(now.getTime() + minutes * 60_000);
    if (input.action === 'picked_up') data.pickedUpAt = now;
    if (input.action === 'refuse') {
      data.refusalReason = input.reason?.trim().slice(0, 300) || null;
      data.missingReported = Boolean(input.missing);
    }
    await tx.reservation.update({ where: { id: r.id }, data });

    const emailIds: string[] = [];
    const mails: Partial<
      Record<PharmacyAction, { subject: string; title: string; text: string[] }>
    > = {
      accept: {
        subject: `Réservation ${r.code} acceptée`,
        title: 'Votre réservation est acceptée',
        text: [
          `${r.pharmacy.name} prépare vos médicaments. Vous serez prévenu quand ils seront prêts.`,
        ],
      },
      ready: {
        subject: `Réservation ${r.code} prête`,
        title: 'Vos médicaments sont prêts',
        text: [
          `Rendez-vous chez ${r.pharmacy.name} avec votre ordonnance.`,
          `Donnez le code ${r.code} au comptoir. Vous payez sur place.`,
        ],
      },
      refuse: {
        subject: `Réservation ${r.code} refusée`,
        title: 'Votre réservation n’a pas pu être acceptée',
        text: [
          `${r.pharmacy.name} ne peut pas servir cette réservation.`,
          ...(data.refusalReason ? [`Motif : ${String(data.refusalReason)}`] : []),
          'Relancez votre recherche pour trouver une autre pharmacie.',
        ],
      },
    };
    const mail = mails[input.action];
    if (mail) {
      emailIds.push(
        await queueEmail(tx, {
          to: r.user.email,
          subject: mail.subject,
          title: mail.title,
          paragraphs: mail.text,
        }),
      );
    }
    return { status: rule.to, emailIds };
  });
  await pushEmailPointers(emailIds);
  return { status };
}

export async function cancelReservation(userId: string, reservationId: string): Promise<void> {
  await expireDueReservations();
  const res = await prisma.reservation.updateMany({
    where: { id: reservationId, userId, status: { in: [...OPEN_STATUSES] } },
    data: { status: 'CANCELLED' },
  });
  if (res.count === 0)
    throw new ReservationError(
      'INVALID_STATUS',
      409,
      'Cette réservation ne peut plus être annulée.',
    );
}

export function reservationItems(json: Prisma.JsonValue): ReservationItem[] {
  return Array.isArray(json) ? (json as unknown as ReservationItem[]) : [];
}

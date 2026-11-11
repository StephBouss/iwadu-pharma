import 'server-only';
import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { normalizeGabonPhone } from '@/lib/phone';
import { productLabel } from '@/lib/products';
import { prisma } from '@/lib/server/prisma';
import { activePass, offeredUnlockAvailable, passState } from './entitlements';
import { expireDueReservations, reservationItems } from './reservations';
import { getSearchView } from './search';
import { getSettings } from './settings';
import type { Viewer } from './viewer';

// Espace patient : Pass, réservations, ordonnances enregistrées, paiements,
// famille, profil. Toutes les lectures sont limitées au compte connecté.

export class AccountError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function accountOverview(viewer: Viewer & { user: NonNullable<Viewer['user']> }) {
  const userId = viewer.user.id;
  const settings = await getSettings();
  const now = new Date();
  const pass = await activePass(userId, now);
  const [state, upcoming, credits, offered, recent] = await Promise.all([
    pass ? passState(pass, settings, now) : Promise.resolve(null),
    prisma.pass.findFirst({
      where: { userId, startsAt: { gt: now } },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.credit.count({ where: { userId, usedAt: null } }),
    offeredUnlockAvailable(userId, settings),
    listCarnet(userId, 4),
  ]);
  return { pass, state, upcoming, credits, offered, recent, fairUse: settings['fairUse.dailyMax'] };
}

export interface CarnetEntry {
  token: string;
  label: string | null;
  createdAt: Date;
  expiresAt: Date;
  unlocked: boolean;
  expired: boolean;
  medicines: string[];
  found: number;
}

/** Carnet d'ordonnances du titulaire : ses recherches, classées par prénom. */
export async function listCarnet(userId: string, take = 60): Promise<CarnetEntry[]> {
  const rows = await prisma.searchSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      token: true,
      label: true,
      createdAt: true,
      expiresAt: true,
      unlockedAt: true,
      items: true,
      completeCount: true,
      partialCount: true,
    },
  });
  const ids = [
    ...new Set(rows.flatMap((r) => (r.items as { productId: string }[]).map((i) => i.productId))),
  ];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, dosage: true },
  });
  const now = new Date();
  return rows.map((r) => ({
    token: r.token,
    label: r.label,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    unlocked: r.unlockedAt !== null,
    expired: r.expiresAt <= now,
    found: r.completeCount + r.partialCount,
    medicines: (r.items as { productId: string; quantity: number }[]).map((i) => {
      const p = products.find((x) => x.id === i.productId);
      return p ? productLabel(p) : 'Médicament';
    }),
  }));
}

export async function listReservations(userId: string) {
  await expireDueReservations();
  return prisma.reservation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      pharmacy: { select: { name: true, slug: true } },
      familyMember: { select: { name: true } },
    },
  });
}

export async function getReservation(userId: string, id: string) {
  await expireDueReservations();
  const r = await prisma.reservation.findFirst({
    where: { id, userId },
    include: {
      pharmacy: {
        select: { name: true, slug: true, phone: true, address: true, lat: true, lng: true },
      },
      familyMember: { select: { name: true } },
    },
  });
  return r ? { ...r, lines: reservationItems(r.items) } : null;
}

export async function listOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId, purpose: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      purpose: true,
      amount: true,
      status: true,
      paymentMethod: true,
      createdAt: true,
      paidAt: true,
      refundedAt: true,
    },
  });
}

export async function getOrder(userId: string, id: string) {
  return prisma.order.findFirst({ where: { id, userId } });
}

export async function updateProfile(
  userId: string,
  input: {
    name?: string | null | undefined;
    phone?: string | null | undefined;
    insuranceId?: string | null | undefined;
    coverageRate?: number | null | undefined;
  },
): Promise<void> {
  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name?.trim().slice(0, 80) || null;
  if (input.phone !== undefined) {
    if (input.phone && input.phone.trim()) {
      const phone = normalizeGabonPhone(input.phone);
      if (!phone) throw new AccountError('PHONE_INVALID', 400, 'Numéro de téléphone invalide.');
      data.phone = phone;
    } else data.phone = null;
  }
  if (input.insuranceId !== undefined) {
    if (input.insuranceId) {
      const ins = await prisma.insurance.findFirst({
        where: { id: input.insuranceId, active: true },
      });
      if (!ins) throw new AccountError('INSURANCE_NOT_FOUND', 400, 'Assurance introuvable.');
      data.insurance = { connect: { id: ins.id } };
    } else data.insurance = { disconnect: true };
  }
  if (input.coverageRate !== undefined) data.coverageRate = input.coverageRate;
  await prisma.user.update({ where: { id: userId }, data });
}

/**
 * Pass géré par le titulaire, sans liste de membres : chaque ordonnance porte
 * un prénom libre. Les proches déjà saisis restent consultables et supprimables.
 */
export async function addFamilyMember(): Promise<never> {
  throw new AccountError(
    'FAMILY_DISABLED',
    410,
    'Donnez plutôt un prénom à chaque ordonnance : le Pass se gère sans liste de membres.',
  );
}

export async function removeFamilyMember(userId: string, id: string): Promise<void> {
  await prisma.familyMember.deleteMany({ where: { id, ownerId: userId } });
}

/** Enregistre la liste d'une recherche (pour la relancer plus tard). */
export async function savePrescription(
  viewer: Viewer,
  searchToken: string,
  label: string,
): Promise<string> {
  if (!viewer.user)
    throw new AccountError('LOGIN_REQUIRED', 401, 'Connectez-vous pour enregistrer.');
  const view = await getSearchView(searchToken, viewer);
  if (view.state !== 'ready')
    throw new AccountError('SEARCH_NOT_FOUND', 404, 'Cette recherche a expiré.');
  const items = view.medicines.map((m) => ({ productId: m.productId, quantity: m.quantity }));
  const row = await prisma.savedPrescription.create({
    data: {
      userId: viewer.user.id,
      label:
        label.trim().slice(0, 80) ||
        view.medicines
          .map((m) => m.label)
          .slice(0, 2)
          .join(', '),
      items: items as Prisma.InputJsonValue,
    },
  });
  return row.id;
}

export async function listSavedPrescriptions(userId: string) {
  const rows = await prisma.savedPrescription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  const ids = [
    ...new Set(rows.flatMap((r) => (r.items as { productId: string }[]).map((i) => i.productId))),
  ];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, dosage: true },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    createdAt: r.createdAt,
    lines: (r.items as { productId: string; quantity: number }[]).map((i) => {
      const p = products.find((x) => x.id === i.productId);
      return {
        label: p ? productLabel(p) : 'Médicament retiré du catalogue',
        quantity: i.quantity,
      };
    }),
  }));
}

export async function deleteSavedPrescription(userId: string, id: string): Promise<void> {
  await prisma.savedPrescription.deleteMany({ where: { id, userId } });
}

/**
 * Suppression du compte : les données personnelles sont effacées (nom,
 * e-mail, téléphone, assurance, proches, ordonnances enregistrées), les
 * sessions sont fermées. Les reçus de paiement restent, sans identité,
 * pour la comptabilité.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.savedPrescription.deleteMany({ where: { userId } });
    await tx.familyMember.deleteMany({ where: { ownerId: userId } });
    await tx.pharmacyMember.deleteMany({ where: { userId } });
    await tx.oAuthAccount.deleteMany({ where: { userId } });
    await tx.reservation.updateMany({
      where: { userId, status: { in: ['SENT', 'ACCEPTED', 'READY'] } },
      data: { status: 'CANCELLED' },
    });
    await tx.searchSession.updateMany({ where: { userId }, data: { userId: null } });
    await tx.order.updateMany({
      where: { userId },
      data: { customerEmail: null, customerPhone: null, customerName: null },
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `supprime-${userId}@iwadu.invalid`,
        name: null,
        avatarUrl: null,
        phone: null,
        insuranceId: null,
        coverageRate: null,
        passwordHash: randomBytes(32).toString('hex'),
        status: 'SUSPENDED',
        tokenVersion: { increment: 1 },
      },
    });
  });
}

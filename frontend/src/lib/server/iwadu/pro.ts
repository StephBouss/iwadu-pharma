import 'server-only';
import type { Prisma } from '@prisma/client';
import { normalizeGabonPhone } from '@/lib/phone';
import { productLabel } from '@/lib/products';
import { prisma } from '@/lib/server/prisma';
import { expireDueReservations, reservationItems } from './reservations';
import { getSettings } from './settings';

// Espace pharmacie : réservations reçues, fiche, stock saisi à la main,
// abonnement. Toujours limité à la pharmacie du compte connecté.

export class ProError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ProReservation {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  customer: string;
  phone: string | null;
  forMember: string | null;
  totalFcfa: number | null;
  items: { label: string; quantity: number }[];
  refusalReason: string | null;
}

export async function proReservations(pharmacyId: string): Promise<ProReservation[]> {
  await expireDueReservations();
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const rows = await prisma.reservation.findMany({
    where: {
      pharmacyId,
      OR: [{ status: { in: ['SENT', 'ACCEPTED', 'READY'] } }, { updatedAt: { gte: since } }],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { name: true, email: true, phone: true } },
      familyMember: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    customer: r.user.name ?? r.user.email.replace(/@.*/, ''),
    phone: r.user.phone,
    forMember: r.familyMember?.name ?? null,
    totalFcfa: r.totalFcfa,
    items: reservationItems(r.items).map((i) => ({ label: i.label, quantity: i.quantity })),
    refusalReason: r.refusalReason,
  }));
}

export async function updatePharmacyProfile(
  pharmacyId: string,
  input: {
    phone?: string | null | undefined;
    address?: string | null | undefined;
    openingHours?: Record<string, [string, string][]> | undefined;
    showPrices?: boolean | undefined;
    insuranceIds?: string[] | undefined;
  },
): Promise<void> {
  const data: Prisma.PharmacyUpdateInput = {};
  if (input.phone !== undefined) {
    if (input.phone) {
      const phone = normalizeGabonPhone(input.phone);
      if (!phone) throw new ProError('PHONE_INVALID', 400, 'Numéro de téléphone invalide.');
      data.phone = phone;
    } else data.phone = null;
  }
  if (input.address !== undefined) data.address = input.address?.trim().slice(0, 200) || null;
  if (input.openingHours !== undefined)
    data.openingHours = input.openingHours as Prisma.InputJsonValue;
  if (input.showPrices !== undefined) data.showPrices = input.showPrices;

  await prisma.$transaction(async (tx) => {
    await tx.pharmacy.update({ where: { id: pharmacyId }, data });
    if (input.insuranceIds) {
      const valid = await tx.insurance.findMany({
        where: { id: { in: input.insuranceIds }, active: true },
        select: { id: true },
      });
      await tx.pharmacyInsurance.deleteMany({ where: { pharmacyId } });
      if (valid.length > 0) {
        await tx.pharmacyInsurance.createMany({
          data: valid.map((v) => ({ pharmacyId, insuranceId: v.id })),
        });
      }
    }
  });
}

export async function proStock(pharmacyId: string) {
  const [rows, settings, pharmacy] = await Promise.all([
    prisma.stock.findMany({
      where: { pharmacyId },
      include: { product: { select: { name: true, dosage: true } } },
    }),
    getSettings(),
    prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { lastSyncAt: true, softwareId: true },
    }),
  ]);
  const lowMax = settings['stock.lowMax'] ?? 0;
  const staleMs = (settings['stock.staleMinutes'] ?? 0) * 60_000;
  const now = Date.now();
  return {
    lastSyncAt: pharmacy?.lastSyncAt ?? null,
    softwareId: pharmacy?.softwareId ?? null,
    lowMax,
    items: rows
      .map((s) => ({
        productId: s.productId,
        label: productLabel(s.product),
        quantity: s.quantity,
        priceFcfa: s.priceFcfa,
        updatedAt: s.updatedAt.toISOString(),
        stale: staleMs > 0 && now - s.updatedAt.getTime() > staleMs,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
  };
}

export async function upsertStock(
  pharmacyId: string,
  input: { productId: string; quantity: number; priceFcfa: number },
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) throw new ProError('UNKNOWN_PRODUCT', 400, 'Médicament introuvable.');
  await prisma.stock.upsert({
    where: { pharmacyId_productId: { pharmacyId, productId: input.productId } },
    create: {
      pharmacyId,
      productId: input.productId,
      quantity: input.quantity,
      priceFcfa: input.priceFcfa,
      updatedAt: new Date(),
    },
    update: { quantity: input.quantity, priceFcfa: input.priceFcfa, updatedAt: new Date() },
  });
}

export async function removeStock(pharmacyId: string, productId: string): Promise<void> {
  await prisma.stock.deleteMany({ where: { pharmacyId, productId } });
}

export async function subscriptionOrders(userId: string, pharmacyId: string) {
  const rows = await prisma.order.findMany({
    where: { userId, purpose: 'PHARMACY_SUBSCRIPTION' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, amount: true, status: true, createdAt: true, paidAt: true, metadata: true },
  });
  return rows.filter(
    (o) => (o.metadata as { pharmacyId?: string } | null)?.pharmacyId === pharmacyId,
  );
}

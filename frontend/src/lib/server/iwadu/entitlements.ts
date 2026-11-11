import 'server-only';
import type { Credit, Pass, Prisma } from '@prisma/client';
import { librevilleDayStart, passUsage, type PassUsage } from '@/lib/entitlement-rules';
import { prisma } from '@/lib/server/prisma';
import type { SettingsValues } from '@/lib/settings-registry';
import type { Viewer } from './viewer';

// Ce à quoi le visiteur a droit : aperçus gratuits, Pass en cours et ses
// compteurs, première ordonnance offerte avec un compte, crédits. Toujours
// calculé côté serveur à partir de la base (paiements confirmés par webhook),
// jamais d'un état du navigateur.
//
// Vocabulaire : une « recherche » est une ordonnance lue (nouvelle, ou
// ancienne relancée) ; rouvrir une ordonnance déjà débloquée ne compte pas.
// Une recherche faite avec un Pass = un déblocage de type PASS.

const DAY_MS = 24 * 60 * 60 * 1000;

type Db = Prisma.TransactionClient | typeof prisma;

export async function activePass(
  userId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<Pass | null> {
  return db.pass.findFirst({
    where: { userId, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { endsAt: 'desc' },
  });
}

export interface PassState extends PassUsage {
  pass: Pass;
  usedInPeriod: number;
  usedToday: number;
}

/** Compteurs du Pass en cours : recherches de la période et du jour. */
export async function passState(
  pass: Pass,
  settings: SettingsValues,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<PassState> {
  // Les Pass qui se suivent sans interruption forment une même période
  // pour le Pass Solo : on compte depuis le début du Pass en cours.
  const [usedInPeriod, usedToday] = await Promise.all([
    db.unlock.count({
      where: { userId: pass.userId, kind: 'PASS', createdAt: { gte: pass.startsAt } },
    }),
    db.unlock.count({
      where: { userId: pass.userId, kind: 'PASS', createdAt: { gte: librevilleDayStart(now) } },
    }),
  ]);
  const usage = passUsage({
    plan: pass.plan === 'SOLO' ? 'SOLO' : 'FAMILY',
    quota: pass.aiReadsQuota,
    usedInPeriod,
    usedToday,
    dailyMax: settings['fairUse.dailyMax'],
  });
  return { ...usage, pass, usedInPeriod, usedToday };
}

export interface PreviewAllowance {
  total: number;
  used: number;
  remaining: number;
  windowDays: number | null;
}

/** Aperçus gratuits restants pour cet appareil (et ce compte) sur la période glissante. */
export async function previewAllowance(
  viewer: Viewer,
  settings: SettingsValues,
  now: Date = new Date(),
): Promise<PreviewAllowance> {
  const total = settings['preview.freeCount'] ?? 0;
  const windowDays = settings['preview.windowDays'];
  const or: Prisma.SearchSessionWhereInput[] = [];
  if (viewer.deviceId) or.push({ deviceId: viewer.deviceId });
  if (viewer.user) or.push({ userId: viewer.user.id });
  if (total <= 0 || !windowDays || or.length === 0) {
    return { total, used: 0, remaining: total > 0 && or.length === 0 ? total : 0, windowDays };
  }
  const used = await prisma.searchSession.count({
    where: {
      freePreview: true,
      createdAt: { gt: new Date(now.getTime() - windowDays * DAY_MS) },
      OR: or,
    },
  });
  return { total, used, remaining: Math.max(total - used, 0), windowDays };
}

/** La première ordonnance complète offerte avec un compte est-elle encore disponible ? */
export async function offeredUnlockAvailable(
  userId: string,
  settings: SettingsValues,
  db: Db = prisma,
): Promise<boolean> {
  if (!settings['account.firstUnlockOffered']) return false;
  const used = await db.unlock.count({ where: { userId, kind: 'OFFERED' } });
  return used === 0;
}

/** Plus ancien crédit non utilisé du compte. */
export async function availableCredit(userId: string, db: Db = prisma): Promise<Credit | null> {
  return db.credit.findFirst({ where: { userId, usedAt: null }, orderBy: { createdAt: 'asc' } });
}

export async function creditCount(userId: string): Promise<number> {
  return prisma.credit.count({ where: { userId, usedAt: null } });
}

export interface AiAllowance {
  allowed: boolean;
  remaining: number | null;
  scope: 'pass' | 'free';
}

/**
 * Lectures par l'IA : coût et abus limités par appareil et par jour, sauf
 * pour un titulaire de Pass (ses recherches sont comptées par le Pass).
 */
export async function aiReadsAllowance(
  viewer: Viewer,
  settings: SettingsValues,
  now: Date = new Date(),
): Promise<AiAllowance> {
  if (viewer.user && (await activePass(viewer.user.id, now))) {
    return { allowed: true, remaining: null, scope: 'pass' };
  }
  const perDay = settings['ai.freeReadsPerDay'] ?? 0;
  const or: Prisma.PrescriptionReadWhereInput[] = [];
  if (viewer.user) or.push({ userId: viewer.user.id });
  if (viewer.deviceId) or.push({ deviceId: viewer.deviceId });
  if (perDay <= 0) return { allowed: false, remaining: 0, scope: 'free' };
  if (or.length === 0) return { allowed: true, remaining: perDay, scope: 'free' };
  const used = await prisma.prescriptionRead.count({
    where: { failed: false, createdAt: { gt: new Date(now.getTime() - DAY_MS) }, OR: or },
  });
  const remaining = Math.max(perDay - used, 0);
  return { allowed: remaining > 0, remaining, scope: 'free' };
}

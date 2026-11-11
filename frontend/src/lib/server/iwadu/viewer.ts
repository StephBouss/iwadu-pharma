import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { optionalAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';

// Qui regarde : un compte connecté, et/ou un appareil identifié par un
// cookie aléatoire (recherches offertes et déblocages sans compte).

export const DEVICE_COOKIE = 'iwadu-device';
const DEVICE_RE = /^[A-Za-z0-9_-]{16,64}$/;
const ONE_YEAR_S = 365 * 24 * 60 * 60;

export interface ViewerUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  insuranceId: string | null;
  coverageRate: number | null;
  pharmacyId: string | null;
}

export interface Viewer {
  user: ViewerUser | null;
  deviceId: string | null;
}

export async function readDeviceId(): Promise<string | null> {
  const value = (await cookies()).get(DEVICE_COOKIE)?.value;
  return value && DEVICE_RE.test(value) ? value : null;
}

/** Route Handlers seulement : crée le cookie d'appareil s'il manque. */
export async function ensureDeviceId(): Promise<string> {
  const existing = await readDeviceId();
  if (existing) return existing;
  const id = randomBytes(18).toString('base64url');
  (await cookies()).set(DEVICE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_S,
  });
  return id;
}

export const getViewer = cache(async (): Promise<Viewer> => {
  const [auth, deviceId] = await Promise.all([optionalAuth(), readDeviceId()]);
  if (!auth) return { user: null, deviceId };
  const user = await prisma.user.findUnique({
    where: { id: auth.user.sub },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      insuranceId: true,
      coverageRate: true,
      pharmacyMember: { select: { pharmacyId: true } },
    },
  });
  if (!user || user.status !== 'ACTIVE') return { user: null, deviceId };
  return {
    deviceId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      insuranceId: user.insuranceId,
      coverageRate: user.coverageRate,
      pharmacyId: user.pharmacyMember?.pharmacyId ?? null,
    },
  };
});

function loginUrl(next: string): string {
  return `/connexion?next=${encodeURIComponent(next)}`;
}

/** Page réservée aux comptes : renvoie vers la connexion sinon. */
export async function requirePageUser(next: string): Promise<ViewerUser> {
  const { user } = await getViewer();
  if (!user) redirect(loginUrl(next));
  return user;
}

export function isAdminRole(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

/** Back-office : 404 pour qui n'est pas administrateur (ne révèle rien). */
export async function requirePageAdmin(next: string): Promise<ViewerUser> {
  const user = await requirePageUser(next);
  if (!isAdminRole(user.role)) notFound();
  return user;
}

/** Espace pharmacie : réservé aux comptes rattachés à une pharmacie. */
export async function requirePagePharmacist(
  next: string,
): Promise<ViewerUser & { pharmacyId: string }> {
  const user = await requirePageUser(next);
  if (!user.pharmacyId) redirect('/compte');
  return { ...user, pharmacyId: user.pharmacyId };
}

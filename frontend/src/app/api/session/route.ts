// GET /api/session — donne à un visiteur sans compte de quoi agir :
// le cookie d'appareil (recherches offertes, déblocages sans compte) et un
// jeton CSRF (toutes les écritures l'exigent). Réutilise le jeton existant.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, setCsrfCookie } from '@/lib/server/auth';
import { ensureDeviceId } from '@/lib/server/iwadu/viewer';

export async function GET(): Promise<NextResponse> {
  await ensureDeviceId();
  const existing = (await cookies()).get(CSRF_COOKIE_NAME)?.value;
  const csrfToken = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : await setCsrfCookie();
  return NextResponse.json({ csrfToken }, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/events — mesure des gestes qui ne passent pas par le serveur
// (itinéraire lancé, appel, ouverture du déblocage). Jamais de position :
// le quartier de la pharmacie ou de la recherche seulement.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { track } from '@/lib/server/iwadu/analytics';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

const Body = z.discriminatedUnion('name', [
  z.object({ name: z.literal('directions_clicked'), pharmacySlug: z.string().max(120) }),
  z.object({ name: z.literal('call_clicked'), pharmacySlug: z.string().max(120) }),
  z.object({ name: z.literal('unlock_clicked'), searchToken: z.string().max(64) }),
  z.object({ name: z.literal('share_clicked') }),
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrf = verifyCsrf(req);
  if (csrf) return csrf;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  const viewer = await getViewer();
  const base = { userId: viewer.user?.id, deviceId: viewer.deviceId };
  const event = parsed.data;

  if (event.name === 'unlock_clicked') {
    const session = await prisma.searchSession.findUnique({
      where: { token: event.searchToken },
      select: { id: true, districtId: true },
    });
    if (session)
      await track(
        'unlock_clicked',
        { ...base, districtId: session.districtId },
        { searchId: session.id },
      );
    return NextResponse.json({ ok: true });
  }

  if (event.name === 'share_clicked') {
    await track('share_clicked', base, {});
    return NextResponse.json({ ok: true });
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { slug: event.pharmacySlug },
    select: { id: true, districtId: true },
  });
  if (pharmacy) {
    await track(
      event.name,
      { ...base, districtId: pharmacy.districtId },
      { pharmacyId: pharmacy.id },
    );
  }
  return NextResponse.json({ ok: true });
}

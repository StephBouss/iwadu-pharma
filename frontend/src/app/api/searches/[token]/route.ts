// PATCH /api/searches/:token — classe une ordonnance du titulaire dans son
// carnet, sous un prénom libre (ou retire le prénom). Compte obligatoire ;
// seul le titulaire peut le faire. Le prénom n'apparaît jamais sur le lien
// partagé.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { userMutation } from '@/lib/server/iwadu/route-helpers';
import { prisma } from '@/lib/server/prisma';

const Body = z.object({ label: z.string().trim().max(40).nullable() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  return userMutation(req, Body, async ({ user, viewer, body }) => {
    // Ordonnance faite sans compte sur cet appareil : elle rejoint le carnet.
    const res = await prisma.searchSession.updateMany({
      where: {
        token,
        OR: [
          { userId: user.id },
          ...(viewer.deviceId ? [{ userId: null, deviceId: viewer.deviceId }] : []),
        ],
      },
      data: { label: body.label ? body.label : null, userId: user.id },
    });
    if (res.count === 0) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}

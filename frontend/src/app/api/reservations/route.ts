// POST /api/reservations — réserve chez une pharmacie du résultat (compte
// requis ; Pass ou paiement à l'acte encore valable). Paiement au comptoir.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { createReservation, ReservationError } from '@/lib/server/iwadu/reservations';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  searchToken: z.string().min(1).max(64),
  pharmacySlug: z.string().min(1).max(120),
  familyMemberId: z.string().max(40).nullable().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
    const viewer = await getViewer();
    try {
      const reservation = await createReservation({ viewer, ...parsed.data });
      return NextResponse.json(reservation, { status: 201 });
    } catch (err) {
      if (err instanceof ReservationError) {
        return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
      }
      throw err;
    }
  });
}

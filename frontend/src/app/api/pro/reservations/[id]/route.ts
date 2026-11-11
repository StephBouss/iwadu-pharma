// POST /api/pro/reservations/:id — la pharmacie accepte, prépare, refuse
// une réservation ou la marque retirée. Réservé aux membres de la pharmacie.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { pharmacyUpdateReservation, ReservationError } from '@/lib/server/iwadu/reservations';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  action: z.enum(['accept', 'ready', 'refuse', 'picked_up']),
  reason: z.string().max(300).optional(),
  missing: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const { user } = await getViewer();
    if (!user?.pharmacyId) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
    const { id } = await params;
    try {
      const result = await pharmacyUpdateReservation({
        pharmacyId: user.pharmacyId,
        reservationId: id,
        ...parsed.data,
      });
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof ReservationError) {
        return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
      }
      throw err;
    }
  });
}

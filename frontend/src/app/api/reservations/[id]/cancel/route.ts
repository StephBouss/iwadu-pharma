// POST /api/reservations/:id/cancel — le patient annule sa réservation.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { cancelReservation, ReservationError } from '@/lib/server/iwadu/reservations';
import { getViewer } from '@/lib/server/iwadu/viewer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const csrf = verifyCsrf(req);
  if (csrf) return csrf;
  const { user } = await getViewer();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    await cancelReservation(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ReservationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    }
    throw err;
  }
}

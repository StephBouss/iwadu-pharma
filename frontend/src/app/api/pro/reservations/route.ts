// GET /api/pro/reservations — réservations de la pharmacie (ouvertes et
// des trois derniers jours), interrogée régulièrement par l'espace pro.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { proReservations } from '@/lib/server/iwadu/pro';
import { pharmacistRoute } from '@/lib/server/iwadu/pro-route';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return pharmacistRoute(
    req,
    null,
    async ({ pharmacyId }) =>
      NextResponse.json(
        { reservations: await proReservations(pharmacyId), serverTime: new Date().toISOString() },
        { headers: { 'Cache-Control': 'no-store' } },
      ),
    { mutation: false },
  );
}

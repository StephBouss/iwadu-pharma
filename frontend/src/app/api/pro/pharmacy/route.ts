// PATCH /api/pro/pharmacy — la pharmacie met à jour sa fiche : téléphone,
// adresse, horaires, assurances acceptées, affichage des prix.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { updatePharmacyProfile } from '@/lib/server/iwadu/pro';
import { pharmacistRoute } from '@/lib/server/iwadu/pro-route';

const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Body = z.object({
  phone: z.string().max(24).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  openingHours: z
    .record(z.enum(['1', '2', '3', '4', '5', '6', '7']), z.array(z.tuple([Time, Time])).max(4))
    .optional(),
  showPrices: z.boolean().optional(),
  insuranceIds: z.array(z.string().max(40)).max(50).optional(),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  return pharmacistRoute(req, Body, async ({ pharmacyId, body }) => {
    await updatePharmacyProfile(pharmacyId, {
      ...body,
      ...(body.openingHours
        ? { openingHours: body.openingHours as Record<string, [string, string][]> }
        : {}),
    });
    return NextResponse.json({ ok: true });
  });
}

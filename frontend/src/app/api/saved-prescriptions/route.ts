// POST /api/saved-prescriptions — enregistre la liste d'une recherche.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { savePrescription } from '@/lib/server/iwadu/account';
import { userMutation } from '@/lib/server/iwadu/route-helpers';

const Body = z.object({
  searchToken: z.string().min(1).max(64),
  label: z.string().max(80).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  return userMutation(req, Body, async ({ viewer, body }) => {
    const id = await savePrescription(viewer, body.searchToken, body.label ?? '');
    return NextResponse.json({ id }, { status: 201 });
  });
}

// PATCH /api/me/profile — nom, téléphone, assurance et taux du compte.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { updateProfile } from '@/lib/server/iwadu/account';
import { userMutation } from '@/lib/server/iwadu/route-helpers';

const Body = z.object({
  name: z.string().max(80).nullable().optional(),
  phone: z.string().max(24).nullable().optional(),
  insuranceId: z.string().max(40).nullable().optional(),
  coverageRate: z.number().int().min(1).max(100).nullable().optional(),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  return userMutation(req, Body, async ({ user, body }) => {
    await updateProfile(user.id, body);
    return NextResponse.json({ ok: true });
  });
}

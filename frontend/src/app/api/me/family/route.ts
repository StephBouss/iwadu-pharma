// POST /api/me/family — ajoute un proche (Pass Famille).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { addFamilyMember } from '@/lib/server/iwadu/account';
import { userMutation } from '@/lib/server/iwadu/route-helpers';

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  relation: z.string().max(40).nullable().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  return userMutation(req, Body, async ({ user, body }) => {
    void user;
    void body;
    await addFamilyMember();
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}

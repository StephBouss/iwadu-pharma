// POST /api/me/delete — supprime le compte (données personnelles effacées,
// sessions fermées). Confirmation explicite exigée.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { clearAuthCookies } from '@/lib/server/auth';
import { deleteAccount } from '@/lib/server/iwadu/account';
import { jsonError, userMutation } from '@/lib/server/iwadu/route-helpers';
import { isAdminRole } from '@/lib/server/iwadu/viewer';

const Body = z.object({ confirm: z.literal('SUPPRIMER') });

export async function POST(req: NextRequest): Promise<NextResponse> {
  return userMutation(req, Body, async ({ user }) => {
    if (isAdminRole(user.role)) {
      return jsonError('ADMIN_ACCOUNT', 409, 'Un compte d’administration ne se supprime pas ici.');
    }
    await deleteAccount(user.id);
    await clearAuthCookies();
    return NextResponse.json({ ok: true });
  });
}

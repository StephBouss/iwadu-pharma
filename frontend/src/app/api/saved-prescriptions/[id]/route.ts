// DELETE /api/saved-prescriptions/:id — supprime une ordonnance enregistrée.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { deleteSavedPrescription } from '@/lib/server/iwadu/account';
import { userMutation } from '@/lib/server/iwadu/route-helpers';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return userMutation(req, null, async ({ user }) => {
    await deleteSavedPrescription(user.id, id);
    return NextResponse.json({ ok: true });
  });
}

// POST /api/admin/iwadu/:action — actions du back-office Iwadu Pharma
// (pharmacies, gardes, assurances, annonces, paramètres, remboursements,
// prévisions, charges). Administrateurs uniquement ; chaque action est
// tracée au journal par logAdminAction, avec l'ancienne valeur.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { ACTIONS, AdminActionError, isAdminAction } from '@/lib/server/iwadu/admin-actions';
import { requestMeta } from '@/lib/server/iwadu/audit';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { action } = await params;
    if (!isAdminAction(action)) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    const def = ACTIONS[action];
    const parsed = (def.schema as z.ZodTypeAny).safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Vérifiez les champs du formulaire.' },
        { status: 400 },
      );
    }
    try {
      const run = def.run as (
        c: { adminId: string; meta: ReturnType<typeof requestMeta> },
        b: unknown,
      ) => Promise<unknown>;
      const result = await run(
        { adminId: auth.admin.id, meta: requestMeta(req.headers) },
        parsed.data,
      );
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof AdminActionError) {
        return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
      }
      throw err;
    }
  });
}

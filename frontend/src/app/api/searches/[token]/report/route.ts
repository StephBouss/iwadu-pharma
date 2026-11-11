// POST /api/searches/:token/report — garantie « Trajet utile » : la
// pharmacie affichée comme ayant toute l'ordonnance ne l'avait pas. Dans le
// délai du paramètre, une recherche est rendue en crédit au compte.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { ReportError, reportMissing } from '@/lib/server/iwadu/search';
import { MissingSettingError } from '@/lib/server/iwadu/settings';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({ pharmacySlug: z.string().min(1).max(120) });

const MESSAGES: Record<ReportError['code'], string> = {
  NOT_FOUND: 'Cette pharmacie ne fait pas partie de ce résultat.',
  NOT_OWNER: 'Seule la personne qui a fait cette recherche peut la signaler.',
  LOGIN_REQUIRED: 'Connectez-vous pour recevoir votre crédit.',
  NOT_COMPLETE: 'Cette pharmacie n’était pas indiquée comme ayant toute l’ordonnance.',
  TOO_LATE: 'Le délai pour signaler est dépassé.',
  ALREADY_REPORTED: 'Vous avez déjà signalé cette ordonnance.',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
    const { token } = await params;
    try {
      const res = await reportMissing(token, parsed.data.pharmacySlug, await getViewer());
      return NextResponse.json(res, { status: 201 });
    } catch (err) {
      if (err instanceof ReportError) {
        return NextResponse.json(
          { error: err.code, message: MESSAGES[err.code] },
          { status: err.status },
        );
      }
      if (err instanceof MissingSettingError) {
        return NextResponse.json({ error: 'SETTINGS_MISSING' }, { status: 503 });
      }
      throw err;
    }
  });
}

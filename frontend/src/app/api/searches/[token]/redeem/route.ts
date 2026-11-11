// POST /api/searches/:token/redeem — débloque une ordonnance sans paiement :
// avec le Pass en cours, la première ordonnance offerte avec un compte, ou
// un crédit « Trajet utile ». Compte obligatoire. Une seule consommation,
// même si la demande arrive deux fois (verrou par compte).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { RedeemError, redeemSearch } from '@/lib/server/iwadu/search';
import { MissingSettingError } from '@/lib/server/iwadu/settings';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({ with: z.enum(['PASS', 'OFFERED', 'CREDIT']) });

const MESSAGES: Record<RedeemError['code'], string> = {
  NOT_FOUND: 'Ce résultat est introuvable.',
  EXPIRED: 'Ce résultat a expiré. Relancez une recherche.',
  NO_RESULT: 'Aucune pharmacie n’a ces médicaments : rien à débloquer.',
  ALREADY_UNLOCKED: 'Cette ordonnance est déjà débloquée.',
  LOGIN_REQUIRED: 'Connectez-vous pour continuer.',
  NO_PASS: 'Vous n’avez pas de Pass en cours.',
  PASS_EXHAUSTED: 'Votre Pass Solo est épuisé.',
  DAILY_LIMIT: 'Revenez demain ou contactez-nous.',
  OFFER_USED: 'Votre ordonnance offerte a déjà été utilisée.',
  NO_CREDIT: 'Vous n’avez pas de crédit disponible.',
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
      await redeemSearch(token, parsed.data.with, await getViewer());
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof RedeemError) {
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

// POST /api/prescriptions/match — reçoit le TEXTE lu sur l'ordonnance par le
// téléphone (lecture gratuite, sans IA : la photo ne quitte jamais
// l'appareil) et le rapproche du catalogue. Renvoie les lignes au même format
// que /api/prescriptions/read, à faire vérifier par le patient.
// Le texte n'est ni enregistré ni journalisé : seuls le nombre de lignes
// reconnues et la durée sont gardés pour les statistiques.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { matchOcrText } from '@/lib/ocr-match';
import { productLabel } from '@/lib/products';
import { verifyCsrf } from '@/lib/server/auth';
import { track } from '@/lib/server/iwadu/analytics';
import { overLimit } from '@/lib/server/iwadu/guard';
import { ensureDeviceId, getViewer } from '@/lib/server/iwadu/viewer';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

const Body = z.object({
  text: z.string().max(8000),
  /** Durée de la lecture dans le téléphone, pour les statistiques. */
  durationMs: z.number().int().min(0).max(600_000).optional(),
});

function error(code: string, status: number, message: string): NextResponse {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    if (await overLimit('ocr-match', req.headers, 60, 60 * 60 * 1000)) {
      return error(
        'TOO_MANY_REQUESTS',
        429,
        'Trop de lectures en peu de temps. Réessayez plus tard.',
      );
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return error('VALIDATION_FAILED', 400, 'Lecture incomplète. Refaites la photo.');
    }

    const deviceId = await ensureDeviceId();
    const viewer = await getViewer();
    const userId = viewer.user?.id ?? null;
    await track('photo_sent', { userId, deviceId }, { photos: 1, reader: 'ocr' });

    const catalog = await prisma.product.findMany({
      select: { id: true, name: true, dosage: true },
    });
    const matches = matchOcrText(parsed.data.text, catalog);
    const durationMs = parsed.data.durationMs ?? 0;

    if (matches.length === 0) {
      await prisma.prescriptionRead.create({
        data: { userId, deviceId, durationMs, failed: true, failureReason: 'ocr_no_match' },
      });
      return error(
        'UNREADABLE',
        422,
        'Aucun médicament reconnu sur la photo. Refaites-la plus près, en pleine lumière, ou saisissez vos médicaments.',
      );
    }

    const read = await prisma.prescriptionRead.create({
      data: { userId, deviceId, durationMs, costMicroUsd: 0, linesRead: matches.length },
    });
    const byId = new Map(catalog.map((p) => [p.id, p]));
    const lines = matches.map((m) => {
      const product = m.productId ? byId.get(m.productId) : undefined;
      return {
        name: m.name,
        dosage: m.dosage,
        quantity: m.quantity,
        confidence: m.confidence,
        productId: product?.id ?? null,
        productLabel: product ? productLabel(product) : null,
        candidates: m.candidates.flatMap((id) => {
          const c = byId.get(id);
          return c ? [{ id: c.id, label: productLabel(c) }] : [];
        }),
        toCheck: m.confidence < 0.7 || !product,
      };
    });

    return NextResponse.json({ readId: read.id, lines, simulated: false });
  });
}

// POST /api/searches — lance la recherche des pharmacies qui ont
// l'ordonnance, autour de la position donnée. Renvoie le jeton du résultat
// (page /resultat/<jeton>). Aucune position exacte n'est conservée : seul
// le quartier le plus proche est enregistré. L'assurance ne se demande plus
// ici : elle se choisit sur la fiche de chaque pharmacie.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isValidLatLng } from '@/lib/geo';
import { verifyCsrf } from '@/lib/server/auth';
import { overLimit } from '@/lib/server/iwadu/guard';
import { createSearch, SearchBlockedError, SearchInputError } from '@/lib/server/iwadu/search';
import { MissingSettingError } from '@/lib/server/iwadu/settings';
import { ensureDeviceId, getViewer } from '@/lib/server/iwadu/viewer';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

const Body = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(20),
        readText: z.string().max(120).nullable().optional(),
        confidence: z.number().min(0).max(1).nullable().optional(),
        corrected: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(20),
  source: z.enum(['PHOTO', 'MANUAL', 'NAME', 'RELAUNCH']),
  position: z.object({ lat: z.number(), lng: z.number() }),
  /** Prénom libre pour le carnet (compte seulement). */
  label: z.string().trim().max(40).nullable().optional(),
  readId: z.string().max(40).nullable().optional(),
  linesCorrected: z.number().int().min(0).max(40).nullable().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    if (await overLimit('search', req.headers, 60, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 });
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success || !isValidLatLng(parsed.data.position)) {
      return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
    }
    const body = parsed.data;
    const deviceId = await ensureDeviceId();
    const viewer = await getViewer();

    try {
      const { token } = await createSearch({
        items: body.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          readText: it.readText ?? null,
          confidence: it.confidence ?? null,
          corrected: it.corrected ?? false,
        })),
        source: body.source,
        position: body.position,
        label: body.label ? body.label : null,
        viewer: { ...viewer, deviceId },
        deviceId,
      });

      // Corrections du patient sur la lecture IA (mesure de qualité).
      if (body.readId && body.linesCorrected !== undefined && body.linesCorrected !== null) {
        await prisma.prescriptionRead
          .updateMany({
            where: {
              id: body.readId,
              OR: [{ deviceId }, ...(viewer.user ? [{ userId: viewer.user.id }] : [])],
            },
            data: { linesCorrected: body.linesCorrected },
          })
          .catch(() => undefined);
      }
      return NextResponse.json({ token }, { status: 201 });
    } catch (err) {
      if (err instanceof SearchBlockedError) {
        return NextResponse.json(
          {
            error: 'DAILY_LIMIT',
            message: 'Revenez demain ou contactez-nous.',
            until: err.until.toISOString(),
          },
          { status: 429 },
        );
      }
      if (err instanceof SearchInputError) {
        return NextResponse.json({ error: err.code }, { status: 400 });
      }
      if (err instanceof MissingSettingError) {
        return NextResponse.json({ error: 'SETTINGS_MISSING' }, { status: 503 });
      }
      throw err;
    }
  });
}

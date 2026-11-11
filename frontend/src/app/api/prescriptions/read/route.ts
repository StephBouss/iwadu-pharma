// POST /api/prescriptions/read — lit la photo (recadrée dans le navigateur)
// de la liste des médicaments avec l'IA et renvoie les lignes à faire
// vérifier par le patient. La photo n'est jamais enregistrée : elle ne vit
// que le temps de la requête. Si l'IA voit un nom de personne, rien n'est
// rendu (422 NAME_VISIBLE). Sans lecteur configuré : 503 AI_UNAVAILABLE.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { matchCandidates, matchProduct } from '@/lib/product-match';
import { productLabel } from '@/lib/products';
import { verifyCsrf } from '@/lib/server/auth';
import {
  isAiReadingEnabled,
  readPrescription,
  type ImageInput,
} from '@/lib/server/iwadu/ai-prescription';
import { track } from '@/lib/server/iwadu/analytics';
import { aiReadsAllowance } from '@/lib/server/iwadu/entitlements';
import { overLimit } from '@/lib/server/iwadu/guard';
import { getSettings } from '@/lib/server/iwadu/settings';
import { ensureDeviceId, getViewer } from '@/lib/server/iwadu/viewer';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { verifyMagicBytes } from '@/lib/server/upload/sniff';

const MAX_PHOTOS = 3;
// Le navigateur envoie moins de 400 Ko ; marge pour un import déjà léger.
const MAX_BYTES = 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function error(code: string, status: number, message: string): NextResponse {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    if (!isAiReadingEnabled()) {
      return error(
        'AI_UNAVAILABLE',
        503,
        'La lecture automatique est indisponible. Saisissez vos médicaments.',
      );
    }
    if (await overLimit('ai-read', req.headers, 20, 60 * 60 * 1000)) {
      return error(
        'TOO_MANY_REQUESTS',
        429,
        'Trop de lectures en peu de temps. Réessayez plus tard.',
      );
    }

    const form = await req.formData().catch(() => null);
    const files = (form?.getAll('photos') ?? []).filter((f): f is File => f instanceof File);
    if (files.length === 0 || files.length > MAX_PHOTOS) {
      return error('INVALID_FILE', 400, `Envoyez de 1 à ${MAX_PHOTOS} photos.`);
    }

    const images: ImageInput[] = [];
    for (const file of files) {
      const type = TYPES.find((t) => t === file.type);
      if (!type || file.size === 0 || file.size > MAX_BYTES) {
        return error(
          'INVALID_FILE',
          400,
          'Photo trop lourde ou dans un format non pris en charge.',
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      if (!verifyMagicBytes(buf, type).match) {
        return error('INVALID_FILE', 400, 'Ce fichier n’est pas une photo.');
      }
      images.push({ data: buf.toString('base64'), mediaType: type });
    }

    const deviceId = await ensureDeviceId();
    const viewer = { ...(await getViewer()), deviceId };
    const settings = await getSettings();
    const allowance = await aiReadsAllowance(viewer, settings);
    if (!allowance.allowed) {
      return error(
        'AI_QUOTA_REACHED',
        429,
        allowance.scope === 'pass'
          ? 'Vous avez utilisé toutes les lectures de votre Pass. Saisissez vos médicaments.'
          : 'Vous avez utilisé vos lectures du jour. Saisissez vos médicaments.',
      );
    }

    const userId = viewer.user?.id ?? null;
    await track('photo_sent', { userId, deviceId }, { photos: images.length });

    const started = Date.now();
    const outcome = await readPrescription(images);
    const durationMs = Date.now() - started;

    if (!outcome.ok) {
      await prisma.prescriptionRead.create({
        data: { userId, deviceId, durationMs, failed: true, failureReason: outcome.reason },
      });
      if (outcome.reason === 'name_visible') {
        await track('name_detected', { userId, deviceId }, {});
        return error(
          'NAME_VISIBLE',
          422,
          'Nous avons vu un nom sur la photo. Elle a été effacée. Merci de la refaire sans les noms.',
        );
      }
      return outcome.reason === 'unreadable'
        ? error(
            'UNREADABLE',
            422,
            'Nous n’arrivons pas à lire la photo. Rapprochez-vous et refaites-la en pleine lumière.',
          )
        : error(
            'AI_FAILED',
            502,
            'La lecture n’a pas abouti. Réessayez ou saisissez vos médicaments.',
          );
    }

    const read = await prisma.prescriptionRead.create({
      data: {
        userId,
        deviceId,
        durationMs,
        inputTokens: outcome.inputTokens,
        outputTokens: outcome.outputTokens,
        linesRead: outcome.lines.length,
      },
    });

    const catalog = await prisma.product.findMany({
      select: { id: true, name: true, dosage: true },
    });
    const byId = new Map(catalog.map((p) => [p.id, p]));
    const lines = outcome.lines.map((l) => {
      const match = matchProduct({ name: l.name, dosage: l.dosage }, catalog);
      const product = match.productId ? byId.get(match.productId) : undefined;
      // En cas de doute, deux ou trois propositions du catalogue.
      const candidates = product
        ? []
        : matchCandidates({ name: l.name, dosage: l.dosage }, catalog).flatMap((id) => {
            const c = byId.get(id);
            return c ? [{ id: c.id, label: productLabel(c) }] : [];
          });
      return {
        name: l.name,
        dosage: l.dosage,
        quantity: l.quantity,
        confidence: l.confidence,
        productId: product?.id ?? null,
        productLabel: product ? productLabel(product) : null,
        candidates,
        toCheck: l.confidence < 0.7 || !product,
      };
    });

    return NextResponse.json({
      readId: read.id,
      lines,
      simulated: outcome.simulated,
      remaining: allowance.remaining === null ? null : Math.max(allowance.remaining - 1, 0),
    });
  });
}

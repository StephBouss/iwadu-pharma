// POST /api/payments — lance un paiement Mobile Money (demande envoyée sur
// le téléphone). En-tête Idempotency-Key obligatoire : une même tentative
// ne débite jamais deux fois. Rien n'est activé ici : seul le webhook
// vérifié du prestataire débloque ou active un Pass.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { PaymentUnavailableError } from '@/lib/server/iwadu/payments/provider';
import { PaymentStartError, startPayment } from '@/lib/server/iwadu/payments/start';
import { ensureDeviceId, getViewer } from '@/lib/server/iwadu/viewer';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  purpose: z.enum([
    'UNLOCK',
    'PASS_SOLO',
    'PASS_FAMILY',
    'PASS_FAMILY_ANNUAL',
    'PHARMACY_SUBSCRIPTION',
  ]),
  searchToken: z.string().max(64).optional(),
  plan: z.enum(['MONTHLY', 'ANNUAL']).optional(),
  phone: z.string().min(6).max(24),
  operator: z.enum(['AIRTEL', 'MOOV']),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const key = req.headers.get('idempotency-key') ?? '';
    if (!key || key.length > 200) {
      return NextResponse.json({ error: 'IDEMPOTENCY_KEY_REQUIRED' }, { status: 400 });
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });

    const deviceId = await ensureDeviceId();
    const viewer = await getViewer();
    try {
      const payment = await startPayment({
        ...parsed.data,
        idempotencyKey: key,
        viewer: { ...viewer, deviceId },
        deviceId,
      });
      return NextResponse.json(payment, { status: 201 });
    } catch (err) {
      if (err instanceof PaymentStartError) {
        return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
      }
      if (err instanceof PaymentUnavailableError) {
        return NextResponse.json(
          {
            error: 'PAYMENT_PROVIDER_UNCONFIGURED',
            message: 'Le paiement est momentanément indisponible.',
          },
          { status: 503 },
        );
      }
      throw err;
    }
  });
}

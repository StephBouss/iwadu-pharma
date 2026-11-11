// POST /api/dev/payment-simulator — joue le rôle du téléphone du client en
// développement et sur le site de démonstration : « Valider » ou « Refuser »
// la demande de paiement.
// Il signe un webhook et l'envoie à /api/webhooks/simulator ; c'est ce
// webhook vérifié, et lui seul, qui débloque. 404 si le simulateur est inactif.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { isSimulatorEnabled } from '@/lib/server/iwadu/payments/provider';
import {
  SIMULATOR_SIGNATURE_HEADER,
  buildSimulatorEvent,
} from '@/lib/server/iwadu/payments/simulator';
import { ownsOrder } from '@/lib/server/iwadu/payments/start';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

const Body = z.object({ orderId: z.string().min(1).max(64), outcome: z.enum(['paid', 'failed']) });

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSimulatorEnabled()) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  const csrf = verifyCsrf(req);
  if (csrf) return csrf;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  const viewer = await getViewer();
  if (
    !order ||
    !order.providerChargeId ||
    order.provider !== 'simulator' ||
    !ownsOrder(order, viewer)
  ) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  if (order.status !== 'PENDING') {
    return NextResponse.json({ error: 'NOT_PENDING', status: order.status }, { status: 409 });
  }

  const { raw, signature } = buildSimulatorEvent(
    order.providerChargeId,
    parsed.data.outcome,
    order.paymentMethod ?? 'AIRTEL',
    order.amount,
  );
  const res = await fetch(new URL('/api/webhooks/simulator', req.nextUrl.origin), {
    method: 'POST',
    headers: { 'content-type': 'application/json', [SIMULATOR_SIGNATURE_HEADER]: signature },
    body: raw,
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ error: 'WEBHOOK_REJECTED' }, { status: 502 });
  return NextResponse.json({ ok: true });
}

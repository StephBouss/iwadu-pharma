// POST /api/webhooks/simulator — webhook signé du simulateur de paiement.
// Développement uniquement (404 en production). Il passe par la même
// fabrique protégée que le futur webhook BambooPay : ce fichier ne lit
// jamais le corps lui-même.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { isSimulatorEnabled } from '@/lib/server/iwadu/payments/provider';
import { simulatorWebhook } from '@/lib/server/iwadu/payments/simulator';
import { providerWebhookRoute } from '@/lib/server/iwadu/payments/webhook';

const handler = providerWebhookRoute(simulatorWebhook);

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSimulatorEnabled()) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return handler(req);
}

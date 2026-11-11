// GET /api/payments/:id — état d'un paiement, pour la fenêtre qui attend la
// confirmation (interrogée toutes les 5 secondes). Réservé à qui l'a lancé.
// Un paiement resté en attente au-delà de son délai passe « Expiré » ici
// (la tâche planifiée ne tourne qu'une fois par jour). Une fois payé, la
// réponse porte le reçu : référence, date, montant, opérateur.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse } from 'next/server';
import { ownsOrder } from '@/lib/server/iwadu/payments/start';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      purpose: true,
      userId: true,
      metadata: true,
      provider: true,
      amount: true,
      paidAt: true,
      paymentMethod: true,
      expiresAt: true,
    },
  });
  const viewer = await getViewer();
  if (!order || !ownsOrder(order, viewer)) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  let status = order.status;
  if (status === 'PENDING' && order.expiresAt && order.expiresAt <= new Date()) {
    const res = await prisma.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
    if (res.count === 1) status = 'EXPIRED';
  }
  return NextResponse.json(
    {
      id: order.id,
      status,
      purpose: order.purpose,
      simulated: order.provider === 'simulator',
      receipt:
        status === 'PAID'
          ? {
              reference: order.id.slice(-8).toUpperCase(),
              paidAt: order.paidAt?.toISOString() ?? null,
              amount: order.amount,
              operator: order.paymentMethod,
            }
          : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

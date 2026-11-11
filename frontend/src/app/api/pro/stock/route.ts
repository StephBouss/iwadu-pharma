// PUT /api/pro/stock — saisie manuelle d'un stock (pharmacies sans
// connecteur de logiciel) ; DELETE retire un médicament du stock.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { removeStock, upsertStock } from '@/lib/server/iwadu/pro';
import { pharmacistRoute } from '@/lib/server/iwadu/pro-route';

const Upsert = z.object({
  productId: z.string().min(1).max(40),
  quantity: z.number().int().min(0).max(100_000),
  priceFcfa: z.number().int().min(0).max(10_000_000),
});
const Remove = z.object({ productId: z.string().min(1).max(40) });

export async function PUT(req: NextRequest): Promise<NextResponse> {
  return pharmacistRoute(req, Upsert, async ({ pharmacyId, body }) => {
    await upsertStock(pharmacyId, body);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  return pharmacistRoute(req, Remove, async ({ pharmacyId, body }) => {
    await removeStock(pharmacyId, body.productId);
    return NextResponse.json({ ok: true });
  });
}

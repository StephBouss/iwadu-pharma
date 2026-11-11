// GET /api/products?q=parac — médicaments du catalogue dont le nom contient
// tous les mots tapés (sans accents). Sert à la saisie manuelle et à la
// recherche par nom.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeSearch, productLabel } from '@/lib/products';
import { prisma } from '@/lib/server/prisma';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = normalizeSearch(req.nextUrl.searchParams.get('q') ?? '').slice(0, 60);
  if (q.length < 2) return NextResponse.json({ products: [] });
  const words = q.split(' ').slice(0, 5);
  const rows = await prisma.product.findMany({
    where: { AND: words.map((w) => ({ searchKey: { contains: w } })) },
    orderBy: [{ name: 'asc' }, { dosage: 'asc' }],
    take: 12,
    select: { id: true, name: true, dosage: true, form: true },
  });
  return NextResponse.json({
    products: rows.map((p) => ({ ...p, label: productLabel(p) })),
  });
}

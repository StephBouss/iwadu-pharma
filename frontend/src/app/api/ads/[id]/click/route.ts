// GET /api/ads/:id/click — compte le clic sur une annonce puis renvoie vers
// le lien de l'annonceur (https uniquement, vérifié à la création).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { overLimit } from '@/lib/server/iwadu/guard';
import { prisma } from '@/lib/server/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const ad = await prisma.adCampaign.findUnique({
    where: { id },
    select: { id: true, linkUrl: true },
  });
  if (!ad || !/^https:\/\//.test(ad.linkUrl))
    return NextResponse.redirect(new URL('/', req.url), 302);
  if (!(await overLimit('ad-click', req.headers, 30, 60 * 60 * 1000))) {
    await prisma.adEvent
      .create({ data: { campaignId: ad.id, kind: 'CLICK' } })
      .catch(() => undefined);
  }
  return NextResponse.redirect(ad.linkUrl, 302);
}

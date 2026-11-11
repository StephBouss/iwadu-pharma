// POST /api/pharmacy-applications — une pharmacie demande à rejoindre
// Iwadu Pharma. Visible dans le back-office (Pharmacies → Demandes).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { normalizeGabonPhone } from '@/lib/phone';
import { verifyCsrf } from '@/lib/server/auth';
import { overLimit } from '@/lib/server/iwadu/guard';
import { jsonError } from '@/lib/server/iwadu/route-helpers';
import { prisma } from '@/lib/server/prisma';

const Body = z.object({
  pharmacyName: z.string().trim().min(2).max(120),
  districtName: z.string().trim().min(2).max(80),
  contactName: z.string().trim().min(2).max(80),
  phone: z.string().max(24),
  email: z.union([z.email().max(200), z.literal('')]).optional(),
  softwareId: z.string().trim().max(80).optional(),
  message: z.string().trim().max(1000).optional(),
  // Champ piège invisible : rempli par les robots, jamais par une personne.
  website: z.string().max(0).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrf = verifyCsrf(req);
  if (csrf) return csrf;
  if (await overLimit('application', req.headers, 5, 60 * 60 * 1000)) {
    return jsonError('TOO_MANY_REQUESTS', 429, 'Trop de demandes. Réessayez plus tard.');
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return jsonError('VALIDATION_FAILED', 400, 'Vérifiez les champs du formulaire.');
  const phone = normalizeGabonPhone(parsed.data.phone);
  if (!phone) return jsonError('PHONE_INVALID', 400, 'Numéro de téléphone invalide.');
  const d = parsed.data;
  await prisma.pharmacyApplication.create({
    data: {
      pharmacyName: d.pharmacyName,
      districtName: d.districtName,
      contactName: d.contactName,
      phone,
      email: d.email || null,
      softwareId: d.softwareId || null,
      message: d.message || null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { jsonError, type CodedError } from './route-helpers';
import { getViewer, type ViewerUser } from './viewer';

/** Route de l'espace pharmacie : compte rattaché à une pharmacie (404 sinon). */
export async function pharmacistRoute<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S | null,
  handler: (ctx: {
    user: ViewerUser;
    pharmacyId: string;
    body: z.infer<S>;
  }) => Promise<NextResponse>,
  { mutation = true }: { mutation?: boolean } = {},
): Promise<NextResponse> {
  if (mutation) {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
  }
  const { user } = await getViewer();
  if (!user?.pharmacyId) return jsonError('NOT_FOUND', 404);
  let body: z.infer<S> = undefined as z.infer<S>;
  if (schema) {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return jsonError('VALIDATION_FAILED', 400, 'Vérifiez les champs du formulaire.');
    body = parsed.data;
  }
  try {
    return await handler({ user, pharmacyId: user.pharmacyId, body });
  } catch (err) {
    const e = err as Partial<CodedError>;
    if (err instanceof Error && typeof e.code === 'string' && typeof e.status === 'number') {
      return jsonError(e.code, e.status, err.message);
    }
    throw err;
  }
}

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { getViewer, type Viewer, type ViewerUser } from './viewer';

// Petites aides communes aux routes Iwadu : compte connecté, CSRF, corps
// validé, erreurs métier → JSON { error, message }.

export interface CodedError {
  code: string;
  status: number;
  message: string;
}

function isCoded(err: unknown): err is CodedError {
  return (
    err instanceof Error &&
    typeof (err as Partial<CodedError>).code === 'string' &&
    typeof (err as Partial<CodedError>).status === 'number'
  );
}

export function jsonError(code: string, status: number, message?: string): NextResponse {
  return NextResponse.json(message ? { error: code, message } : { error: code }, { status });
}

/** Mutation d'un compte connecté : CSRF, session, corps validé par `schema`. */
export async function userMutation<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S | null,
  handler: (ctx: { user: ViewerUser; viewer: Viewer; body: z.infer<S> }) => Promise<NextResponse>,
): Promise<NextResponse> {
  const csrf = verifyCsrf(req);
  if (csrf) return csrf;
  const viewer = await getViewer();
  if (!viewer.user) return jsonError('UNAUTHORIZED', 401, 'Connectez-vous pour continuer.');
  let body: z.infer<S> = undefined as z.infer<S>;
  if (schema) {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return jsonError('VALIDATION_FAILED', 400, 'Vérifiez les champs du formulaire.');
    body = parsed.data;
  }
  try {
    return await handler({ user: viewer.user, viewer, body });
  } catch (err) {
    if (isCoded(err)) return jsonError(err.code, err.status, err.message);
    throw err;
  }
}

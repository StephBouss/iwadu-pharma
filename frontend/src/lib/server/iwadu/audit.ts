import 'server-only';
import { logAdminAction, type AuditClient } from '@/lib/server/admin/audit';

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

/** Lit l'adresse IP et le navigateur d'une requête, pour le journal. */
export function requestMeta(headers: Headers): RequestMeta {
  const forwarded = headers.get('x-forwarded-for');
  return {
    ip: forwarded ? (forwarded.split(',')[0]?.trim() ?? null) : headers.get('x-real-ip'),
    userAgent: headers.get('user-agent'),
  };
}

/** Trace une action du back-office (passe toujours par `logAdminAction`). */
export async function audit(
  client: AuditClient,
  actorId: string,
  action: string,
  target: { type: string; id: string } | null,
  metadata: Record<string, unknown> | null,
  meta: RequestMeta = {},
): Promise<void> {
  await logAdminAction(client, {
    actorId,
    action,
    ...(target ? { targetType: target.type, targetId: target.id } : {}),
    ...(metadata ? { metadata } : {}),
    ...(meta.ip ? { ip: meta.ip } : {}),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
  });
}

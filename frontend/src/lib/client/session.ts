'use client';

import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { COOKIE_PREFIX } from '@/lib/constants';

// Avant la première écriture d'un visiteur sans compte : récupère un jeton
// CSRF et le cookie d'appareil (GET /api/session), une seule fois.

let pending: Promise<void> | null = null;
const CSRF_COOKIE = `${COOKIE_PREFIX}-csrf=`;

function readCsrf(): string | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((c) => c.startsWith(CSRF_COOKIE));
  return row ? decodeURIComponent(row.slice(CSRF_COOKIE.length)) : null;
}

/**
 * Le cookie CSRF fait foi (le serveur compare l'en-tête au cookie). Après
 * une connexion, le serveur en émet un nouveau alors que `api()` lit
 * d'abord la copie du navigateur : on la réaligne avant chaque écriture.
 */
export function syncCsrfFromCookie(): void {
  const cookie = readCsrf();
  if (!cookie) return;
  try {
    if (localStorage.getItem(`${COOKIE_PREFIX}-csrf`) !== cookie) storeCsrfToken(cookie);
  } catch {
    // stockage indisponible : api() relira le cookie
  }
}

export function ensureSession(): Promise<void> {
  syncCsrfFromCookie();
  if (readCsrf()) return Promise.resolve();
  pending ??= api<{ csrfToken: string }>('/api/session')
    .then((res) => storeCsrfToken(res.csrfToken))
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** `api()` après `ensureSession()` : à utiliser pour toute écriture publique. */
export async function publicApi<T>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  await ensureSession();
  return api<T>(path, options);
}

/**
 * Envoi multipart (photos). `api()` ne sait envoyer que du JSON : même
 * jeton CSRF, mêmes erreurs (`ApiError` avec le code du serveur), jamais
 * de nouvel essai automatique (écriture).
 */
export async function postForm<T>(path: string, form: FormData, timeoutMs = 90_000): Promise<T> {
  await ensureSession();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: 'POST',
      body: form,
      credentials: 'include',
      headers: { 'x-csrf-token': readCsrf() ?? '' },
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new ApiError(res.status, String(body.error ?? res.status), body);
    return body as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'NETWORK');
  } finally {
    clearTimeout(timer);
  }
}

/** Message à montrer au visiteur pour une erreur d'appel (français). */
export function errorMessage(
  err: unknown,
  fallback = 'Une erreur est survenue. Réessayez.',
): string {
  if (err instanceof ApiError) {
    if (typeof err.body.message === 'string' && err.body.message) return err.body.message;
    if (err.status === 0) return 'Pas de connexion. Vérifiez votre réseau, puis réessayez.';
    if (err.status === 429) return 'Trop de tentatives. Patientez un peu avant de réessayer.';
  }
  return fallback;
}

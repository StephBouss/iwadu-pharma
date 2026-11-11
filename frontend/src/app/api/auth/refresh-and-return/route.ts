// GET /api/auth/refresh-and-return?next=<path>
//
// Browser-friendly silent refresh: bounces the user through a 302 → mints
// fresh access+refresh+csrf cookies (same flow as POST /api/auth/refresh) →
// 302s to the validated `next` path. Used by `frontend/src/proxy.ts` when a
// protected page is requested with a missing/expired access cookie but a
// still-valid refresh cookie.
//
// Why a separate route instead of fetching POST /refresh from middleware?
//   1. The refresh cookie is path-scoped to /api/auth (D-21) — the browser
//      attaches it when navigating to /api/auth/refresh-and-return, which is
//      exactly what middleware NextResponse.redirect produces.
//   2. Middleware runs on Edge runtime (no Prisma, no bcrypt). Doing the
//      rotation here keeps DB access + jose in the Node runtime where it
//      belongs.
//
// Open-redirect mitigation: `next` MUST be a same-origin path (`^/[^/]`) —
// `//evil.com` and `https://evil.com` are rejected and fall back to `/`, and
// the final URL is checked to stay on our origin.
//
// When the session is over, every auth cookie is cleared (the CSRF cookie is
// the middleware's session signal): protected pages go to login, public pages
// render as anonymous.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import {
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  clearCsrfCookie,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  setCsrfCookie,
  verifyRefreshToken,
} from '@/lib/server/auth';
import { acquireRefreshLock } from '@/lib/server/auth/refresh-lock';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const FALLBACK_NEXT = '/';

function safeNext(raw: string | null): string {
  if (!raw) return FALLBACK_NEXT;
  if (!raw.startsWith('/')) return FALLBACK_NEXT;
  if (raw.startsWith('//')) return FALLBACK_NEXT;
  if (raw.startsWith('/\\')) return FALLBACK_NEXT;
  if (raw.length > 2000) return FALLBACK_NEXT;
  return raw;
}

function loginRedirect(req: NextRequest, next: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = process.env.AUTH_LOGIN_PATH || '/login';
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url, 303);
}

/** Same literal as SKIP_REFRESH_PARAM in frontend/src/proxy.ts. */
const SKIP_REFRESH_PARAM = '__sr';

function isProtected(pathname: string): boolean {
  return (process.env.AUTH_PROTECTED_PREFIXES || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Back to `next`, query string included (`?r=…` on a pharmacy page). The URL
 * parser drops tabs and newlines, so "/<tab>/evil.com" would become
 * protocol-relative: anything that does not stay on our origin falls back to /.
 */
function backTo(req: NextRequest, next: string, skipRefresh = false): NextResponse {
  let url = new URL(next, req.nextUrl.origin);
  if (url.origin !== req.nextUrl.origin) url = new URL(FALLBACK_NEXT, req.nextUrl.origin);
  if (skipRefresh) url.searchParams.set(SKIP_REFRESH_PARAM, '1');
  return NextResponse.redirect(url, 303);
}

/**
 * The session is over: clear every auth cookie, including the CSRF cookie the
 * middleware reads as a session signal (so it never bounces here again for
 * nothing). Protected pages go to login, public pages render as anonymous.
 */
async function sessionOver(req: NextRequest, next: string): Promise<NextResponse> {
  await clearAuthCookies();
  await clearCsrfCookie();
  const pathname = new URL(next, req.nextUrl.origin).pathname;
  return isProtected(pathname) ? loginRedirect(req, next) : backTo(req, next);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const next = safeNext(req.nextUrl.searchParams.get('next'));

    const refreshCookie = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
    if (!refreshCookie) return sessionOver(req, next);

    const payload = await verifyRefreshToken(refreshCookie);
    if (!payload) return sessionOver(req, next);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, tokenVersion: true, status: true },
    });
    if (!user || user.tokenVersion !== payload.tokenVersion || user.status === 'SUSPENDED') {
      return sessionOver(req, next);
    }

    const release = await acquireRefreshLock(user.id);
    if (!release) {
      // Another tab is rotating. Back to `next` — the in-flight rotation will
      // land cookies before the user's next request; render this one as is
      // instead of bouncing through the middleware again.
      return backTo(req, next, true);
    }

    try {
      const accessToken = await createAccessToken({
        sub: user.id,
        email: user.email,
        tokenVersion: user.tokenVersion,
      });
      const refreshToken = await createRefreshToken(user.id, user.tokenVersion);
      await setAuthCookies(accessToken, refreshToken);
      await setCsrfCookie();
    } finally {
      await release();
    }

    const res = backTo(req, next);
    res.headers.set('x-request-id', ctx.requestId);
    return res;
  });
}

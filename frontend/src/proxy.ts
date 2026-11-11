import { NextResponse, type NextRequest } from 'next/server';

// Silent refresh for every page (Next 16 « proxy », formerly middleware;
// it must sit next to app/, i.e. in src/, to run at all).
//
// The (15-min) access cookie can expire while the session is still alive
// (7-day refresh cookie) — typically when a tab sat unfocused or the laptop
// slept. Server-rendered pages would then render as anonymous (public pages)
// or bounce to the login page (protected pages). This middleware catches that
// case BEFORE the page renders and bounces the request through
// /api/auth/refresh-and-return, which mints fresh cookies and 303s back to the
// original URL — invisible to the user.
//
// Session signal: the refresh cookie is path-scoped to /api/auth, so the
// browser never sends it to page URLs. The CSRF cookie (path "/", same 7-day
// lifetime, set at login and on every rotation, cleared at logout and when a
// refresh fails) is the signal that a session probably exists.
//
// Protected paths (AUTH_PROTECTED_PREFIXES, comma-separated, e.g.
// "/compte,/admin") go to the login page when there is no session at all.
//
// Kept edge-compatible: no DB, no bcrypt, no Prisma. We only inspect cookies and
// build redirects — the heavy lifting happens in /api/auth/refresh-and-return
// (runtime=nodejs).

const COOKIE_PREFIX = process.env.COOKIE_PREFIX || 'app';
const ACCESS_COOKIE = `${COOKIE_PREFIX}-token`;
const CSRF_COOKIE = `${COOKIE_PREFIX}-csrf`;
const LOGIN_PATH = process.env.AUTH_LOGIN_PATH || '/login';
/**
 * Set by refresh-and-return when it could not rotate right now (another tab
 * is rotating): render as is instead of bouncing again. Same literal there.
 */
const SKIP_REFRESH_PARAM = '__sr';

const AUTHED_PREFIXES = (process.env.AUTH_PROTECTED_PREFIXES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isAuthedPath(pathname: string): boolean {
  return AUTHED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;
  if (req.cookies.get(ACCESS_COOKIE)?.value) return NextResponse.next();
  if (req.nextUrl.searchParams.has(SKIP_REFRESH_PARAM)) return NextResponse.next();

  const target = pathname + search;

  if (req.cookies.get(CSRF_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/api/auth/refresh-and-return';
    url.search = `?next=${encodeURIComponent(target)}`;
    return NextResponse.redirect(url, 303);
  }

  if (isAuthedPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = `?next=${encodeURIComponent(target)}`;
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};

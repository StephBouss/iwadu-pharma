// Tests for GET /api/auth/refresh-and-return (silent refresh used by
// frontend/src/proxy.ts on every page when the access cookie has expired).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';

mockNextCookies();

vi.mock('@/lib/server/auth/refresh-lock', () => ({
  acquireRefreshLock: vi.fn(),
}));

vi.mock('@/lib/server/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth');
  return { ...actual, verifyRefreshToken: vi.fn() };
});

import { acquireRefreshLock } from '@/lib/server/auth/refresh-lock';
import { verifyRefreshToken, REFRESH_COOKIE_NAME } from '@/lib/server/auth';
import { GET } from './route';
import { NextRequest } from 'next/server';

function makeReq(next: string, refreshCookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (refreshCookie) headers.cookie = `${REFRESH_COOKIE_NAME}=${refreshCookie}`;
  return new NextRequest(
    `https://test/api/auth/refresh-and-return?next=${encodeURIComponent(next)}`,
    { headers },
  );
}

const releaseSpy = vi.fn().mockResolvedValue(undefined);
const prevPrefixes = process.env.AUTH_PROTECTED_PREFIXES;
const prevLogin = process.env.AUTH_LOGIN_PATH;

beforeEach(() => {
  __cookieStore.clear();
  releaseSpy.mockClear();
  vi.mocked(acquireRefreshLock).mockReset();
  vi.mocked(verifyRefreshToken).mockReset();
  vi.mocked(acquireRefreshLock).mockResolvedValue(releaseSpy);
  process.env.AUTH_PROTECTED_PREFIXES = '/compte,/admin';
  process.env.AUTH_LOGIN_PATH = '/connexion';
});

afterEach(() => {
  process.env.AUTH_PROTECTED_PREFIXES = prevPrefixes;
  process.env.AUTH_LOGIN_PATH = prevLogin;
});

function validUser() {
  vi.mocked(verifyRefreshToken).mockResolvedValue({ sub: 'u1', tokenVersion: 0 });
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'u1',
    email: 'a@b.com',
    tokenVersion: 0,
    status: 'ACTIVE',
  } as never);
}

describe('GET /api/auth/refresh-and-return', () => {
  it('rotates the cookies and returns to the page, query string included', async () => {
    validUser();
    const res = await GET(makeReq('/pharmacie/demo?r=abc', 'valid'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://test/pharmacie/demo?r=abc');
    expect(__cookieStore.get('app-token')?.value).toBeTruthy();
    expect(__cookieStore.get('app-csrf')?.value).toBeTruthy();
    expect(releaseSpy).toHaveBeenCalled();
  });

  it('public page, no refresh cookie: clears the session signal and renders anonymously', async () => {
    const res = await GET(makeReq('/resultat/tok'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://test/resultat/tok');
    // CSRF cookie cleared: the middleware will not bounce here again.
    expect(__cookieStore.get('app-csrf')?.value).toBe('');
  });

  it('protected page, expired session: login with the page as `next`', async () => {
    vi.mocked(verifyRefreshToken).mockResolvedValue(null);
    const res = await GET(makeReq('/compte/pass', 'expired'));
    expect(res.headers.get('location')).toBe('https://test/connexion?next=%2Fcompte%2Fpass');
    expect(__cookieStore.get('app-csrf')?.value).toBe('');
  });

  it('another tab is rotating: back to the page without bouncing again', async () => {
    validUser();
    vi.mocked(acquireRefreshLock).mockResolvedValue(null);
    const res = await GET(makeReq('/compte', 'valid'));
    expect(res.headers.get('location')).toBe('https://test/compte?__sr=1');
  });

  it('never redirects off-origin (tab inside the path, protocol-relative)', async () => {
    validUser();
    for (const next of ['/\t/evil.com', '//evil.com', 'https://evil.com']) {
      const res = await GET(makeReq(next, 'valid'));
      expect(new URL(res.headers.get('location')!).origin).toBe('https://test');
    }
  });
});

// Propriété d'une recherche : le lien partagé ne donne ni la garantie
// « Trajet utile » ni les informations du propriétaire.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '@/test-utils/prisma-mock';

vi.mock('@/lib/server/iwadu/settings', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/iwadu/settings')>(
    '@/lib/server/iwadu/settings',
  );
  return { ...actual, getSettings: vi.fn().mockResolvedValue({ 'guarantee.tripReportHours': 24 }) };
});

import { ownsSession, reportMissing, ReportError } from './search';
import type { Viewer } from './viewer';

const user = (id: string): Viewer['user'] => ({
  id,
  email: `${id}@exemple.test`,
  name: null,
  phone: null,
  role: 'USER',
  insuranceId: null,
  coverageRate: null,
  pharmacyId: null,
});

describe('ownsSession', () => {
  it('account search: only that account', () => {
    const s = { userId: 'u1', deviceId: 'd1' };
    expect(ownsSession(s, { user: user('u1'), deviceId: null })).toBe(true);
    expect(ownsSession(s, { user: user('u2'), deviceId: 'd1' })).toBe(false);
    expect(ownsSession(s, { user: null, deviceId: 'd1' })).toBe(false);
  });

  it('search without account: the device that made it', () => {
    const s = { userId: null, deviceId: 'd1' };
    expect(ownsSession(s, { user: null, deviceId: 'd1' })).toBe(true);
    expect(ownsSession(s, { user: user('u2'), deviceId: 'd1' })).toBe(true);
    expect(ownsSession(s, { user: user('u2'), deviceId: 'd2' })).toBe(false);
    expect(ownsSession(s, { user: null, deviceId: null })).toBe(false);
  });
});

describe('reportMissing', () => {
  beforeEach(() => {
    prismaMock.searchSession.findUnique.mockResolvedValue({
      id: 's1',
      token: 'tok',
      userId: 'owner',
      deviceId: 'd-owner',
      items: [{ productId: 'p1', quantity: 1 }],
      results: [{ pharmacyId: 'ph1', found: ['p1'] }],
      unlocks: [{ createdAt: new Date() }],
    } as never);
  });

  it('refuses a logged-in reader of the shared link (no credit farming)', async () => {
    const err = await reportMissing('tok', 'pharmacie-x', {
      user: user('someone-else'),
      deviceId: 'd-other',
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ReportError);
    expect((err as ReportError).code).toBe('NOT_OWNER');
    expect((err as ReportError).status).toBe(403);
    expect(prismaMock.credit.create).not.toHaveBeenCalled();
  });

  it('asks to log in before anything else', async () => {
    const err = await reportMissing('tok', 'pharmacie-x', {
      user: null,
      deviceId: 'd-owner',
    }).catch((e: unknown) => e);
    expect((err as ReportError).code).toBe('LOGIN_REQUIRED');
  });
});

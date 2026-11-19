// Lectures par l'IA : limite quotidienne par appareil, coupable dans le
// back-office pendant les essais (« ai.dailyLimitOn » = false).
import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '@/test-utils/prisma-mock';
import type { SettingsValues } from '@/lib/settings-registry';
import { aiReadsAllowance } from './entitlements';

const viewer = { user: null, deviceId: 'd1' };
const settings = (values: Record<string, unknown>) => values as unknown as SettingsValues;

describe('aiReadsAllowance', () => {
  beforeEach(() => {
    prismaMock.prescriptionRead.count.mockResolvedValue(3);
  });

  it('limit on by default: blocked once the daily reads are used', async () => {
    const a = await aiReadsAllowance(viewer, settings({ 'ai.freeReadsPerDay': 3 }));
    expect(a).toEqual({ allowed: false, remaining: 0, scope: 'free' });
  });

  it('limit explicitly on: same as the default', async () => {
    const a = await aiReadsAllowance(
      viewer,
      settings({ 'ai.freeReadsPerDay': 3, 'ai.dailyLimitOn': true }),
    );
    expect(a.allowed).toBe(false);
  });

  it('limit switched off: allowed, nothing counted', async () => {
    const a = await aiReadsAllowance(
      viewer,
      settings({ 'ai.freeReadsPerDay': 3, 'ai.dailyLimitOn': false }),
    );
    expect(a).toEqual({ allowed: true, remaining: null, scope: 'free' });
    expect(prismaMock.prescriptionRead.count).not.toHaveBeenCalled();
  });
});

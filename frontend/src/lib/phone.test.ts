import { describe, expect, it } from 'vitest';
import { formatGabonPhone, normalizeGabonPhone } from './phone';

describe('normalizeGabonPhone', () => {
  it('accepte les écritures courantes', () => {
    expect(normalizeGabonPhone('074 82 60 61')).toBe('+241074826061');
    expect(normalizeGabonPhone('+241 074 82 60 61')).toBe('+241074826061');
    expect(normalizeGabonPhone('00241 74 82 60 61')).toBe('+24174826061');
    expect(normalizeGabonPhone('74826061')).toBe('+24174826061');
  });

  it('refuse ce qui n’est pas un numéro', () => {
    expect(normalizeGabonPhone('1234')).toBeNull();
    expect(normalizeGabonPhone('0012345678')).toBeNull();
    expect(normalizeGabonPhone('abc')).toBeNull();
  });
});

describe('formatGabonPhone', () => {
  it('groupe les chiffres pour l’affichage', () => {
    expect(formatGabonPhone('+241074826061')).toBe('+241 074 82 60 61');
  });
});

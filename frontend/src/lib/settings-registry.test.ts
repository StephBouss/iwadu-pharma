import { describe, expect, it } from 'vitest';
import { isSettingKey, parseSettingValue } from './settings-registry';

describe('parseSettingValue', () => {
  it('accepte un montant entier positif, refuse décimales et négatifs', () => {
    expect(parseSettingValue('price.unlock', 250)).toBe(250);
    expect(parseSettingValue('price.unlock', '250')).toBe(250);
    expect(parseSettingValue('price.unlock', 2.5)).toBeNull();
    expect(parseSettingValue('price.unlock', -1)).toBeNull();
    expect(parseSettingValue('price.unlock', '')).toBeNull();
    expect(parseSettingValue('price.unlock', null)).toBeNull();
  });

  it('accepte un pourcentage avec deux décimales au plus, jusqu’à 100', () => {
    expect(parseSettingValue('fees.providerRatePercent', 1.5)).toBe(1.5);
    expect(parseSettingValue('fees.providerRatePercent', '2.456')).toBe(2.46);
    expect(parseSettingValue('fees.providerRatePercent', 101)).toBeNull();
  });

  it('booléen strict', () => {
    expect(parseSettingValue('account.firstUnlockOffered', true)).toBe(true);
    expect(parseSettingValue('account.firstUnlockOffered', 'true')).toBeNull();
  });

  it('texte non vide, espaces retirés', () => {
    expect(parseSettingValue('contact.email', '  aide@example.com ')).toBe('aide@example.com');
    expect(parseSettingValue('contact.email', '   ')).toBeNull();
  });

  it('reconnaît les clés du registre', () => {
    expect(isSettingKey('price.unlock')).toBe(true);
    expect(isSettingKey('price.inconnu')).toBe(false);
    expect(isSettingKey('toString')).toBe(false);
  });
});

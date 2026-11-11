import 'server-only';
import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { audit, type RequestMeta } from './audit';
import { prisma } from '@/lib/server/prisma';
import {
  SETTING_KEYS,
  SETTINGS,
  parseSettingValue,
  type SettingKey,
  type SettingValue,
  type SettingsValues,
} from '@/lib/settings-registry';

// Petit cache mémoire (10 s) en plus du cache par requête : les paramètres
// changent rarement et chaque lecture coûte un aller-retour à la base. Une
// modification depuis le back-office vide le cache de cette instance ; les
// autres instances la voient au plus 10 s plus tard.
const TTL_MS = 10_000;
let memo: { at: number; rows: { key: string; value: Prisma.JsonValue }[] } | null = null;

export function invalidateSettingsCache(): void {
  memo = null;
}

/** Paramètres lus une fois par requête (cache React), relus au plus toutes les 10 s. */
export const getSettings = cache(async (): Promise<SettingsValues> => {
  if (!memo || Date.now() - memo.at > TTL_MS) {
    memo = {
      at: Date.now(),
      rows: await prisma.setting.findMany({ select: { key: true, value: true } }),
    };
  }
  const rows = memo.rows;
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<SettingKey, unknown>;
  for (const key of SETTING_KEYS) {
    out[key] = byKey.has(key) ? parseSettingValue(key, byKey.get(key)) : null;
  }
  return out as SettingsValues;
});

export class MissingSettingError extends Error {
  constructor(readonly key: SettingKey) {
    super(`Paramètre manquant : ${SETTINGS[key].label} (${key})`);
    this.name = 'MissingSettingError';
  }
}

/** Valeur obligatoire : lève `MissingSettingError` si elle n'est pas saisie. */
export function need<K extends SettingKey>(settings: SettingsValues, key: K): SettingValue<K> {
  const value = settings[key];
  if (value === null || value === undefined) throw new MissingSettingError(key);
  return value as SettingValue<K>;
}

/** Clés obligatoires encore vides : affichées en tête du back-office. */
export function missingRequired(settings: SettingsValues): SettingKey[] {
  return SETTING_KEYS.filter(
    (key) => !('optional' in SETTINGS[key] && SETTINGS[key].optional) && settings[key] === null,
  );
}

/**
 * Enregistre des valeurs saisies dans le back-office, chaque changement
 * tracé avec l'ancienne valeur. Les valeurs vides d'un paramètre facultatif
 * suppriment la ligne.
 */
export async function updateSettings(
  adminId: string,
  changes: Partial<Record<SettingKey, unknown>>,
  meta: RequestMeta = {},
): Promise<{ saved: SettingKey[]; invalid: SettingKey[] }> {
  const saved: SettingKey[] = [];
  const invalid: SettingKey[] = [];
  const current = await prisma.setting.findMany();
  const before = new Map(current.map((r) => [r.key, r.value]));

  await prisma.$transaction(async (tx) => {
    for (const key of Object.keys(changes) as SettingKey[]) {
      const raw = changes[key];
      const def = SETTINGS[key];
      const isEmpty = raw === null || raw === undefined || raw === '';
      if (isEmpty && 'optional' in def && def.optional) {
        if (before.has(key)) {
          await tx.setting.delete({ where: { key } });
          await audit(
            tx,
            adminId,
            'setting.clear',
            { type: 'Setting', id: key },
            { before: before.get(key) ?? null },
            meta,
          );
          saved.push(key);
        }
        continue;
      }
      const value = parseSettingValue(key, raw);
      if (value === null) {
        invalid.push(key);
        continue;
      }
      const previous = before.get(key);
      if (previous !== undefined && JSON.stringify(previous) === JSON.stringify(value)) continue;
      await tx.setting.upsert({
        where: { key },
        create: { key, value: value as Prisma.InputJsonValue, updatedById: adminId },
        update: { value: value as Prisma.InputJsonValue, updatedById: adminId },
      });
      await audit(
        tx,
        adminId,
        'setting.update',
        { type: 'Setting', id: key },
        { before: previous ?? null, after: value },
        meta,
      );
      saved.push(key);
    }
  });
  invalidateSettingsCache();
  return { saved, invalid };
}

import 'server-only';
import { redis } from '@/lib/server/redis';
import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
  type RateLimitStore,
} from '@/lib/server/rate-limit-store';

// Garde-fou technique contre les abus (robots, appels en boucle) sur les
// routes publiques coûteuses : lecture d'ordonnance par l'IA, création de
// recherche, candidatures. Ce n'est pas un quota commercial (ceux-là sont
// dans les paramètres) : seulement un plafond par adresse IP.

const stores = new Map<number, RateLimitStore>();

function storeFor(windowMs: number): RateLimitStore {
  let store = stores.get(windowMs);
  if (!store) {
    store = redis
      ? new RedisRateLimitStore({ redis, prefix: '', windowMs })
      : new MemoryRateLimitStore({ windowMs });
    stores.set(windowMs, store);
  }
  return store;
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
}

/** true si la limite est dépassée. */
export async function overLimit(
  bucket: string,
  headers: Headers,
  max: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const { totalHits } = await storeFor(windowMs).increment(
      `rl:iwadu:${bucket}:${clientIp(headers)}`,
    );
    return totalHits > max;
  } catch {
    return false;
  }
}

// lib/birdeyeCache.js
// War of Coins – Server cache + shared promise (quota-safe)
// In-memory cache (per instance). Great for local dev / non-KV environments.

const g = globalThis;

// Cache global persistant entre requêtes (best effort en serverless)
g.__WOC_BIRDEYE_CACHE__ = g.__WOC_BIRDEYE_CACHE__ || new Map();
g.__WOC_BIRDEYE_INFLIGHT__ = g.__WOC_BIRDEYE_INFLIGHT__ || new Map();

const CACHE = g.__WOC_BIRDEYE_CACHE__;
const INFLIGHT = g.__WOC_BIRDEYE_INFLIGHT__;

const now = () => Date.now();

/**
 * Cache entry:
 * {
 *   value: any,
 *   expiresAt: number,
 *   staleUntil: number
 * }
 */

export function getCacheEntry(key) {
  return CACHE.get(key);
}

export function deleteCacheEntry(key) {
  CACHE.delete(key);
  INFLIGHT.delete(key);
}

export async function getOrFetch(key, fetcher, { ttlMs = 15_000, staleMs = 0 } = {}) {
  const t = now();
  const cached = CACHE.get(key);

  // 🟢 Cache HIT (fresh)
  if (cached && t < cached.expiresAt) {
    return { data: cached.value, cache: "HIT" };
  }

  // 🟡 Stale-while-revalidate (sert stale immédiatement, refresh en fond)
  if (cached && staleMs > 0 && t < cached.staleUntil) {
    if (!INFLIGHT.has(key)) {
      const p = (async () => {
        try {
          const fresh = await fetcher();
          const t2 = now();
          CACHE.set(key, {
            value: fresh,
            expiresAt: t2 + ttlMs,
            staleUntil: t2 + ttlMs + staleMs,
          });
          return fresh;
        } finally {
          INFLIGHT.delete(key);
        }
      })();

      INFLIGHT.set(key, p);
    }

    return { data: cached.value, cache: "STALE" };
  }

  // 🔴 Cache MISS mais promesse déjà en cours (dedupe)
  if (INFLIGHT.has(key)) {
    const data = await INFLIGHT.get(key);
    return { data, cache: "DEDUPED" };
  }

  // 🔴 Cache MISS total → 1 seul fetch
  const p = (async () => {
    try {
      const fresh = await fetcher();
      const t2 = now();
      CACHE.set(key, {
        value: fresh,
        expiresAt: t2 + ttlMs,
        staleUntil: t2 + ttlMs + staleMs,
      });
      return fresh;
    } finally {
      INFLIGHT.delete(key);
    }
  })();

  INFLIGHT.set(key, p);
  const data = await p;

  return { data, cache: "MISS" };
}

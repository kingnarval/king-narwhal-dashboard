// lib/birdeyeCacheKV.js
import { kv } from "@vercel/kv";

const now = () => Date.now();

// petit inflight local (encore utile dans une même instance)
// ⚠️ Note: inflight peut contenir soit un "fetch MISS" (retourne une value),
// soit un "refresh STALE" (peut retourner undefined). On gère ce cas plus bas.
const inflight = new Map();

/**
 * Stocke une "envelope" dans KV:
 * { value, expiresAt, staleUntil }
 */
async function kvGetEnvelope(key) {
  const raw = await kv.get(key);
  if (!raw) return null;

  // selon config, Vercel KV peut renvoyer string ou objet
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

async function kvSetEnvelope(key, envelope, ttlSec) {
  // on stocke en string pour être sûr
  await kv.set(key, JSON.stringify(envelope));
  // expire au TTL global (fresh+stale)
  await kv.expire(key, ttlSec);
}

/**
 * lock distribué via KV (NX)
 * IMPORTANT: Upstash/Vercel KV supporte généralement kv.set(key, val, { nx: true, ex: seconds })
 */
async function acquireLock(lockKey, lockSec) {
  try {
    const ok = await kv.set(lockKey, "1", { nx: true, ex: lockSec });
    // selon impl, ok peut être "OK" ou true
    return ok === "OK" || ok === true;
  } catch {
    return false;
  }
}

async function releaseLock(lockKey) {
  try {
    await kv.del(lockKey);
  } catch {}
}

/**
 * getOrFetchKV(key, fetcher, { ttlMs, staleMs, lockSec })
 *
 * - Fresh => renvoie cache
 * - Stale => renvoie stale immédiat, tente refresh global via lock
 * - Miss => tente lock; si lock obtenu -> fetch; sinon -> attend un peu et relit KV
 */
export async function getOrFetchKV(
  key,
  fetcher,
  { ttlMs = 120_000, staleMs = 600_000, lockSec = 15 } = {}
) {
  const t = now();
  const lockKey = `lock:${key}`;

  // 1) cache KV
  const env = await kvGetEnvelope(key);
  if (env) {
    if (t < env.expiresAt) {
      return { data: env.value, cache: "HIT_KV" };
    }

    if (staleMs > 0 && t < env.staleUntil) {
      // STALE: on sert tout de suite, et on essaye un refresh global (non bloquant)
      if (!inflight.has(key)) {
        const p = (async () => {
          const got = await acquireLock(lockKey, lockSec);
          if (!got) return undefined;

          try {
            const fresh = await fetcher();
            const t2 = now();
            const envelope = {
              value: fresh,
              expiresAt: t2 + ttlMs,
              staleUntil: t2 + ttlMs + staleMs,
            };
            const ttlSec = Math.ceil((ttlMs + staleMs) / 1000);
            await kvSetEnvelope(key, envelope, ttlSec);
            return fresh;
          } finally {
            await releaseLock(lockKey);
          }
        })().finally(() => inflight.delete(key));

        inflight.set(key, p);
      }

      return { data: env.value, cache: "STALE_KV" };
    }
  }

  // 2) Dedup local (même instance)
  if (inflight.has(key)) {
    const maybe = await inflight.get(key);

    // ✅ si l'inflight est un "MISS fetch", il renvoie une value
    if (maybe !== undefined) {
      return { data: maybe, cache: "DEDUPED_LOCAL" };
    }

    // ✅ si l'inflight est un refresh STALE (undefined), on relit KV une fois
    const env2 = await kvGetEnvelope(key);
    if (env2?.value) return { data: env2.value, cache: "DEDUPED_LOCAL_STALE" };
  }

  // 3) MISS: lock global
  const p = (async () => {
    const got = await acquireLock(lockKey, lockSec);

    if (got) {
      try {
        const fresh = await fetcher();
        const t2 = now();
        const envelope = {
          value: fresh,
          expiresAt: t2 + ttlMs,
          staleUntil: t2 + ttlMs + staleMs,
        };
        const ttlSec = Math.ceil((ttlMs + staleMs) / 1000);
        await kvSetEnvelope(key, envelope, ttlSec);
        return fresh;
      } finally {
        await releaseLock(lockKey);
      }
    }

    // lock pas obtenu => quelqu’un d’autre refresh.
    // On attend un peu puis on relit KV (2-3 tentatives rapides).
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const env2 = await kvGetEnvelope(key);
      if (env2?.value) return env2.value;
    }

    // en dernier recours, on fetch sans lock — et ✅ on écrit aussi dans KV
    // (si KV a eu un micro souci, ça évite de re-spammer Birdeye)
    const fresh = await fetcher();
    try {
      const t2 = now();
      const envelope = {
        value: fresh,
        expiresAt: t2 + ttlMs,
        staleUntil: t2 + ttlMs + staleMs,
      };
      const ttlSec = Math.ceil((ttlMs + staleMs) / 1000);
      await kvSetEnvelope(key, envelope, ttlSec);
    } catch {
      // si KV re-fail, on renvoie quand même fresh
    }
    return fresh;
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  const data = await p;
  return { data, cache: "MISS_KV" };
}

export async function purgeKV(key) {
  await kv.del(key);
  await kv.del(`lock:${key}`);
}

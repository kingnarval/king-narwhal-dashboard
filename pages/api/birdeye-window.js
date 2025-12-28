// pages/api/birdeye-window.js
// War of Coins – Birdeye Window API (VERCEL KV FORTRESS)
//
// ✅ CDN cache (Vercel): s-maxage + stale-while-revalidate
// ✅ Vercel KV shared cache (cross-instance)
// ✅ Distributed lock (prevents stampede across instances)
// ✅ Timeout + fallback "last good"
// ✅ Local sort by market cap

import { getOrFetchKV, purgeKV } from "../../lib/birdeyeCacheKV";

export default async function handler(req, res) {
  // ✅ CDN cache côté Vercel
  // 5 min fresh, puis 15 min stale pendant revalidate en arrière-plan
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const API_KEY =
    process.env.BIRDEYE_API_KEY ||
    process.env.NEXT_PUBLIC_BIRDEYE_API_KEY ||
    process.env.BIRDEYE_APIKEY ||
    "";

  const CHAIN = (req.query.chain || process.env.BIRDEYE_CHAIN || "solana").toString();

  // Force refresh (optionnel) : /api/birdeye-window?force=1
  // ⚠️ Si un jour tu exposes ça publiquement, tu peux protéger avec un secret (req.query.secret)
  const force = String(req.query.force || "") === "1";

  // ✅ IMPORTANT: last-good fallback (mémoire instance, best effort)
  globalThis.__WOC_BIRDEYE_LASTGOOD__ = globalThis.__WOC_BIRDEYE_LASTGOOD__ || {
    t: 0,
    data: null,
  };
  const lastGood = globalThis.__WOC_BIRDEYE_LASTGOOD__;

  if (!API_KEY) {
    return res.status(200).json({
      source: "Birdeye (missing API key)",
      coins: [],
      error: "Missing env: BIRDEYE_API_KEY",
      meta: { servedFrom: "missing-api-key" },
    });
  }

  // Buckets market cap
  const CAP_BUCKETS = [
    { min: 500_000, max: 2_000_000, label: "0.5–2M" },
    { min: 2_000_000, max: 10_000_000, label: "2–10M" },
    { min: 10_000_000, max: 50_000_000, label: "10–50M" },
  ];

  const LIMIT = 100;

  function urlForBucket(b) {
    return (
      "https://public-api.birdeye.so/defi/v3/token/list" +
      `?limit=${LIMIT}` +
      `&min_market_cap=${b.min}` +
      `&max_market_cap=${b.max}`
    );
  }

  function normSym(it) {
    const s = (it?.symbol || "").toString().trim();
    return s ? s.toUpperCase() : "";
  }
  function normName(it) {
    const s = (it?.name || "").toString().trim();
    return s ? s.toUpperCase() : "";
  }
  function groupKey(it) {
    return (
      normSym(it) ||
      normName(it) ||
      String(it?.address || it?.mint || it?.token_address || "").trim()
    );
  }

  async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, {
        headers: {
          accept: "application/json",
          "X-API-KEY": API_KEY,
          "x-chain": CHAIN,
        },
        signal: ctrl.signal,
      });

      const text = await r.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {}

      return { ok: r.ok, status: r.status, json, text };
    } finally {
      clearTimeout(id);
    }
  }

  async function fetchBucket(b) {
    const url = urlForBucket(b);
    try {
      const out = await fetchWithTimeout(url, 8000);
      if (!out.ok) {
        return { ok: false, bucket: b.label, status: out.status, error: out.json || out.text };
      }
      const items = out.json?.data?.items || out.json?.data?.tokens || [];
      return { ok: true, bucket: b.label, items };
    } catch (e) {
      return { ok: false, bucket: b.label, status: 0, error: String(e?.message || e) };
    }
  }

  // ✅ KV cacheKey stable
  const cacheKey = `birdeye-window:kv:v1:chain=${CHAIN}:limit=${LIMIT}:buckets=${CAP_BUCKETS.map(
    (b) => `${b.min}-${b.max}`
  ).join("|")}`;

  // ✅ KV cache policy
  const ttlMs = 120_000;    // 2 min fresh (0 fetch Birdeye pendant 2 min)
  const staleMs = 600_000;  // +10 min stale (sert stale + refresh en fond)
  const lockSec = 20;       // lock distribué (évite le stampede)

  try {
    // ✅ VRAI force refresh : purge KV
    if (force) {
      await purgeKV(cacheKey);
    }

    const { data, cache } = await getOrFetchKV(
      cacheKey,
      async () => {
        const results = await Promise.all(CAP_BUCKETS.map(fetchBucket));
        const oks = results.filter((r) => r.ok);
        const fails = results.filter((r) => !r.ok);

        const best = new Map();

        for (const r of oks) {
          for (const it of r.items || []) {
            const k = groupKey(it);
            if (!k) continue;

            const cap = Number(it?.market_cap ?? it?.marketCap ?? it?.mc ?? 0) || 0;
            if (cap <= 0) continue;

            const prev = best.get(k);
            const prevCap = Number(prev?.capNum ?? 0) || 0;

            if (!prev || cap > prevCap) {
              const priceNum = Number(it?.price ?? it?.last_price ?? it?.lastPrice ?? NaN);
              best.set(k, {
                id: it?.address || it?.mint || it?.token_address || k,
                name: (it?.name || "").toString(),
                symbol: (it?.symbol || "").toString(),
                logo: it?.logo_uri || it?.logo || it?.logoURL || "",
                capNum: cap,
                price: Number.isFinite(priceNum) ? `$${priceNum}` : "N/A",
                pct24: it?.price_change_24h ?? it?.priceChange24h ?? "N/A",
                pct7: it?.price_change_7d ?? it?.priceChange7d ?? "N/A",
                pct30: it?.price_change_30d ?? it?.priceChange30d ?? "N/A",
                pct1y: it?.price_change_1y ?? it?.priceChange1y ?? "N/A",
              });
            }
          }
        }

        const coins = Array.from(best.values()).sort(
          (a, b) => (Number(a.capNum) || 0) - (Number(b.capNum) || 0)
        );

        const payload = {
          source: `Birdeye STABLE ${CAP_BUCKETS.map((b) => b.label).join(" | ")} (${CHAIN})`,
          coins,
          meta: {
            returned: coins.length,
            perBucketLimit: LIMIT,
            okBuckets: oks.map((r) => r.bucket),
            failedBuckets: fails.map((f) => ({ bucket: f.bucket, status: f.status })),
            servedFrom: "live",
          },
          ...(fails.length
            ? { warnings: fails.map((f) => ({ bucket: f.bucket, status: f.status, error: f.error })) }
            : {}),
        };

        // ✅ mémorise "last good"
        lastGood.t = Date.now();
        lastGood.data = payload;

        return payload;
      },
      { ttlMs, staleMs, lockSec }
    );

    // Debug header (super utile)
    res.setHeader("X-WOC-Cache", cache);

    // Ajuste servedFrom selon le cache (inclut aussi le cas DEDUPED_LOCAL_STALE du KV helper)
    const servedFrom =
      cache === "HIT_KV"
        ? "kv-cache"
        : cache === "STALE_KV"
        ? "kv-stale"
        : cache === "DEDUPED_LOCAL"
        ? "kv-deduped-local"
        : cache === "DEDUPED_LOCAL_STALE"
        ? "kv-deduped-local-stale"
        : "kv-miss";

    return res.status(200).json({
      ...data,
      meta: { ...(data.meta || {}), servedFrom },
    });
  } catch (e) {
    // ✅ fallback last good si dispo
    if (lastGood.data) {
      return res.status(200).json({
        ...lastGood.data,
        meta: { ...(lastGood.data.meta || {}), servedFrom: "fallback-last-good" },
        warnings: [
          ...(lastGood.data.warnings || []),
          { bucket: "handler", status: 0, error: String(e?.message || e) },
        ],
      });
    }

    return res.status(200).json({
      source: `Birdeye (handler failed) (${CHAIN})`,
      coins: [],
      error: String(e?.message || e),
      meta: { servedFrom: "handler-failed" },
    });
  }
}

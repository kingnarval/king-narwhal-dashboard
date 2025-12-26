// pages/api/birdeye-window.js
// War of Coins – Birdeye Window API (Option A – FIX sort_by)
// Compatible plan, NO SCROLL
//
// Fix:
// - token/list DOES NOT accept sort_by=marketCap on some plans/endpoints
// - We remove sort_by/sort_type and sort locally instead
//
// Strategy:
// - 3 buckets (0.5–2M, 2–10M, 10–50M)
// - limit 100 each
// - merge + dedupe + LOCAL sort by cap
// - returns stable dataset for TTR window

export default async function handler(req, res) {
  const API_KEY =
    process.env.BIRDEYE_API_KEY ||
    process.env.NEXT_PUBLIC_BIRDEYE_API_KEY ||
    process.env.BIRDEYE_APIKEY ||
    "";

  const CHAIN = (req.query.chain || process.env.BIRDEYE_CHAIN || "solana").toString();

  if (!API_KEY) {
    return res.status(200).json({
      source: "Birdeye (missing API key)",
      coins: [],
      error: "Missing env: BIRDEYE_API_KEY (or NEXT_PUBLIC_BIRDEYE_API_KEY)",
    });
  }

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

  async function fetchBucket(b) {
    const url = urlForBucket(b);
    try {
      const r = await fetch(url, {
        headers: {
          accept: "application/json",
          "X-API-KEY": API_KEY,
          "x-chain": CHAIN,
        },
      });

      const text = await r.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!r.ok) {
        return { ok: false, bucket: b.label, status: r.status, error: json || text };
      }

      const items = json?.data?.items || json?.data?.tokens || [];
      return { ok: true, bucket: b.label, items };
    } catch (e) {
      return { ok: false, bucket: b.label, status: 0, error: String(e?.message || e) };
    }
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
    return normSym(it) || normName(it) || String(it?.address || it?.mint || it?.token_address || "").trim();
  }

  try {
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

    const coins = Array.from(best.values());
    coins.sort((a, b) => (Number(a.capNum) || 0) - (Number(b.capNum) || 0));

    return res.status(200).json({
      source: `Birdeye Option A (no-scroll) ${CAP_BUCKETS.map((b) => b.label).join(" | ")} (${CHAIN})`,
      coins,
      meta: {
        returned: coins.length,
        perBucketLimit: LIMIT,
        okBuckets: oks.map((r) => r.bucket),
        failedBuckets: fails.map((f) => ({ bucket: f.bucket, status: f.status })),
      },
      ...(fails.length
        ? { warnings: fails.map((f) => ({ bucket: f.bucket, status: f.status, error: f.error })) }
        : {}),
    });
  } catch (e) {
    console.error(e);
    return res.status(200).json({
      source: `Birdeye Option A (handler failed) (${CHAIN})`,
      coins: [],
      error: String(e?.message || e),
    });
  }
}

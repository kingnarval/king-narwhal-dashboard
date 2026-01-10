// pages/api/birdeye-stats.js
// War of Coins – Birdeye Stats (1H / 24H + High / Low)
// --------------------------------------------------
// Usage:
//   /api/birdeye-stats?address=<TOKEN_MINT>
//   (if address is missing, fallback to TTR_MINT env)
//
// Env (Vercel):
//   BIRDEYE_API_KEY (required)
//   TTR_MINT (optional default mint)

let __cache = new Map(); // key -> { ts, data }
const TTL_MS = 15_000;    // fresh cache
const STALE_MS = 45_000;  // stale serving window

function norm(x) {
  return String(x || "").toLowerCase().replace(/\s+/g, "");
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function fetchBirdeyeStats({ address, apiKey }) {
  const url =
  `https://public-api.birdeye.so/defi/v3/price/stats/single` +
  `?address=${encodeURIComponent(address)}` +
  `&list_timeframe=1h,24h`;

  const r = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-API-KEY": apiKey,
      // HARD FORCE (prevents Invalid chain input)
      "x-chain": "solana",
    },
  });

  // Read as text first (prevents JSON parse crash)
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep raw text
  }

  if (r.status === 429) {
    const err = new Error("RATE_LIMITED");
    err.status = 429;
    err.body = json || text || null;
    throw err;
  }

  if (!r.ok) {
    const err = new Error(`BIRDEYE_HTTP_${r.status}`);
    err.status = r.status;
    err.body = json || text || null;
    throw err;
  }

  // ✅ REAL Birdeye formats handled here
  // - data.data[]   (your case)
  // - data[]
  // - data.items[]
  const items =
  Array.isArray(json?.data?.[0]?.data)
    ? json.data[0].data
    : Array.isArray(json?.data?.data)
      ? json.data.data
      : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.data?.items)
          ? json.data.items
          : [];


  const pick = (wanted) => {
    const w = norm(wanted);
    return (
      items.find((it) => {
        const tf = norm(
          it?.time_frame ||
          it?.timeFrame ||
          it?.timeframe ||
          it?.frame ||
          it?.interval
        );
        return tf === w;
      }) || null
    );
  };

  const tf1h = pick("1h") || pick("60m");
  const tf24h = pick("24h") || pick("1d");

  return {
    ok: true,
    address,
    chain: "solana",

    // price comes from timeframe (Birdeye does NOT always send currentPrice)
    priceNum: num(tf1h?.price ?? tf24h?.price ?? null),

    h1: tf1h
      ? {
          changePct: num(tf1h?.price_change_percent),
          high: num(tf1h?.high),
          low: num(tf1h?.low),
        }
      : null,

    h24: tf24h
      ? {
          changePct: num(tf24h?.price_change_percent),
          high: num(tf24h?.high),
          low: num(tf24h?.low),
        }
      : null,

    // Debug only in dev (remove if you want)
    debug: process.env.NODE_ENV === "development" ? json : undefined,
  };
}

export default async function handler(req, res) {
  try {
    const addressQuery = (req.query.address || "").toString().trim();
    const addressEnv = (process.env.TTR_MINT || "").toString().trim();
    const address = addressQuery || addressEnv;

    if (!address) {
      return res.status(400).json({
        ok: false,
        error: "Missing address (query) and TTR_MINT (env)",
      });
    }

    const apiKey = process.env.BIRDEYE_API_KEY;


    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing BIRDEYE_API_KEY",
      });
    }

    const key = `vFINAL:solana:${address}`;
    const now = Date.now();
    const cached = __cache.get(key);

    // Fresh cache
    if (cached && (now - cached.ts) < TTL_MS) {
      res.setHeader("X-WOC-Cache", "HIT");
      res.setHeader(
        "Cache-Control",
        "public, max-age=0, s-maxage=10, stale-while-revalidate=45"
      );
      return res.status(200).json(cached.data);
    }

    try {
      const data = await fetchBirdeyeStats({ address, apiKey });
      __cache.set(key, { ts: Date.now(), data });

      res.setHeader("X-WOC-Cache", cached ? "REFRESH" : "MISS");
      res.setHeader(
        "Cache-Control",
        "public, max-age=0, s-maxage=10, stale-while-revalidate=45"
      );

      return res.status(200).json(data);
    } catch (e) {
      // Serve stale on error (including 429)
      if (cached && (now - cached.ts) < STALE_MS) {
        res.setHeader("X-WOC-Cache", "STALE");
        return res.status(200).json(cached.data);
      }

      const status = e?.status || 500;
      return res.status(status).json({
        ok: false,
        error: e?.message || "Birdeye error",
        status,
        body: e?.body || null,
      });
    }
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e?.message || "Unknown error",
    });
  }
}

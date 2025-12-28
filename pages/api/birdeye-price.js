// pages/api/birdeye-price.js
//
// Purpose:
// - Fetch SINGLE token data (market cap) for TTR using env TTR_MINT
// - Keeps in-memory cache (getOrFetch) like your current version
//
// Env needed in .env.local:
//   TTR_MINT=25hAyB...Q3mTDJ
//   BIRDEYE_API_KEY=xxxxx
//   BIRDEYE_CHAIN=solana   (optional)

import { getOrFetch } from "../../lib/birdeyeCache";

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    const API_KEY =
      process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }

    const CHAIN = (req.query.chain || process.env.BIRDEYE_CHAIN || "solana").toString();

    // ✅ "mint du TTR" => on le prend depuis .env.local
    const TTR_MINT = (process.env.TTR_MINT || "").toString().trim();
    if (!TTR_MINT) {
      return res.status(500).json({ error: "Missing env: TTR_MINT" });
    }

    // Optional: allow overriding in dev ONLY if you want later
    // const mint = (req.query.mint || TTR_MINT).toString().trim();
    const mint = TTR_MINT;

    // Birdeye single-token overview (market cap, price, etc.)
    const url =
      "https://public-api.birdeye.so/defi/token_overview" +
      `?address=${encodeURIComponent(mint)}`;

    // ✅ cacheKey unique (reflects EXACT request)
    const cacheKey = `birdeye:token_overview:v1:chain=${CHAIN}:mint=${mint}`;

    const { data, cache } = await getOrFetch(
      cacheKey,
      async () => {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            accept: "application/json",
            "X-API-KEY": API_KEY,
            "x-chain": CHAIN,
          },
        });

        const text = await response.text();

        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          // throw so getOrFetch does NOT cache broken response
          const err = new Error("Invalid JSON from Birdeye");
          err.raw = text;
          throw err;
        }

        // Birdeye HTTP error -> bubble up (no cache)
        if (!response.ok) {
          const err = new Error(`Birdeye HTTP ${response.status}`);
          err.status = response.status;
          err.body = json;
          throw err;
        }

        const d = json?.data || {};

        // Normalize fields safely (Birdeye can vary sometimes)
        const capNum = Number(
          d?.market_cap ??
            d?.marketCap ??
            d?.mc ??
            d?.liquidity_market_cap ??
            0
        );

        const priceNum = Number(d?.price ?? d?.last_price ?? d?.lastPrice ?? NaN);

        return {
          ok: true,
          mint,
          chain: CHAIN,
          capNum: Number.isFinite(capNum) ? capNum : 0,
          priceNum: Number.isFinite(priceNum) ? priceNum : null,
          raw: d,
        };
      },
      {
        ttlMs: 15_000,   // 15s fresh
        staleMs: 45_000, // 45s stale
      }
    );

    // Debug + cache headers
    res.setHeader("X-WOC-Cache", cache); // HIT / MISS / DEDUPED / STALE
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=10, stale-while-revalidate=45"
    );

    return res.status(200).json(data);
  } catch (e) {
    if (e && e.message === "Invalid JSON from Birdeye") {
      return res.status(500).json({
        error: e.message,
        raw: e.raw,
      });
    }

    if (e && typeof e.message === "string" && e.message.startsWith("Birdeye HTTP")) {
      return res.status(502).json({
        error: e.message,
        status: e.status,
        body: e.body,
      });
    }

    return res.status(500).json({ error: String(e?.message || e) });
  }
}

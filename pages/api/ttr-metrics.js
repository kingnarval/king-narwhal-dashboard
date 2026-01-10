// pages/api/ttr-metrics.js
// War of Coins — TTR metrics (Raydium v3 price + on-chain supply => market cap)

import { Connection, PublicKey } from "@solana/web3.js";

const RAYDIUM_V3 = "https://api-v3.raydium.io";
const DEFAULT_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// RPC fallback (sans clé)
const RPC_FALLBACKS = [
  "https://api.mainnet-beta.solana.com",
];

// Cache RAM (per mint/quote/poolType)
const CACHE_TTL_MS = 12_000;
globalThis.__ttrMetricsCacheMap = globalThis.__ttrMetricsCacheMap || new Map();

function lc(s) {
  return (s || "").toString().trim().toLowerCase();
}
function num(x) {
  const n = typeof x === "string" ? Number(x) : x;
  return Number.isFinite(n) ? n : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, { timeoutMs = 8000, tries = 3 } = {}) {
  let lastErr = null;

  for (let i = 0; i < tries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "user-agent": "woc-ttr-metrics/1.0",
        },
      });

      const txt = await res.text();
      let json;
      try {
        json = JSON.parse(txt);
      } catch {
        throw new Error(`Bad JSON (HTTP ${res.status}): ${txt.slice(0, 160)}`);
      }

      if (!res.ok) {
        throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      }

      return json;
    } catch (e) {
      lastErr = e;
      // petit backoff
      await sleep(150 + i * 250);
    } finally {
      clearTimeout(id);
    }
  }

  throw lastErr || new Error("fetch failed");
}
async function getSolUsdPrice() {
  const urlPools =
    `${RAYDIUM_V3}/pools/info/mint` +
    `?mint1=${encodeURIComponent("So11111111111111111111111111111111111111112")}` +
    `&mint2=${encodeURIComponent("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")}` +
    `&poolType=all&poolSortField=default&sortType=desc&pageSize=30&page=1`;

  const poolsJson = await fetchJson(urlPools, { timeoutMs: 9000, tries: 3 });
  const candidates = poolsJson?.data?.data || poolsJson?.data || [];
  const best = pickBestPool(candidates);
  const poolId = best?.id;
  if (!poolId) throw new Error("No WSOL/USDC pool found on Raydium");

  const urlPoolInfo = `${RAYDIUM_V3}/pools/info/ids?ids=${encodeURIComponent(poolId)}`;
  const poolInfoJson = await fetchJson(urlPoolInfo, { timeoutMs: 9000, tries: 3 });
  const poolInfo = poolInfoJson?.data?.data?.[0] || poolInfoJson?.data?.[0] || null;

  const rawPrice =
    num(poolInfo?.price) ??
    num(poolInfo?.poolPrice) ??
    num(best?.price) ??
    null;

  if (!rawPrice || rawPrice <= 0) throw new Error("SOL/USD price unavailable from Raydium");

  const { aMint, bMint } = extractMints(poolInfo || best || {});
  const A = lc(aMint);
  const B = lc(bMint);
  const M = lc("So11111111111111111111111111111111111111112");
  const Q = lc("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  let solUsd = rawPrice;
  if (A && B) {
    if (A === M && B === Q) {
      solUsd = rawPrice;
    } else if (A === Q && B === M) {
      solUsd = 1 / rawPrice;
    }
  }
  if (!Number.isFinite(solUsd) || solUsd <= 0) throw new Error("Invalid SOL/USD computed price");
  return solUsd;
}


// Try to detect which mint is base/quote in Raydium payload
function poolScore(p) {
  const candidates = [
    p?.tvl,
    p?.tvlUsd,
    p?.liquidity,
    p?.liquidityUsd,
    p?.reserveUsd,
    p?.volume24h,
    p?.volume24hQuote,
    p?.day?.volume,
    p?.day?.volumeQuote,
  ];
  for (const v of candidates) {
    const n = typeof v === "string" ? Number(v) : v;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickBestPool(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  let best = list[0];
  let bestScore = poolScore(best);
  for (let i = 1; i < list.length; i++) {
    const s = poolScore(list[i]);
    if (s > bestScore) {
      bestScore = s;
      best = list[i];
    }
  }
  return best;
}

function extractMints(obj) {
  const tries = [
    ["mintA", "mintB"],
    ["mint1", "mint2"],
    ["baseMint", "quoteMint"],
    ["tokenMintA", "tokenMintB"],
    ["tokenA", "tokenB"],
  ];

  for (const [aKey, bKey] of tries) {
    const a = obj?.[aKey];
    const b = obj?.[bKey];

    const aMint = typeof a === "string" ? a : a?.mint || a?.address || a?.id;
    const bMint = typeof b === "string" ? b : b?.mint || b?.address || b?.id;

    if (aMint && bMint) return { aMint, bMint };
  }

  const arr = obj?.mints || obj?.mint || obj?.tokens;
  if (Array.isArray(arr) && arr.length >= 2) {
    const aMint = arr[0]?.mint || arr[0]?.address || arr[0];
    const bMint = arr[1]?.mint || arr[1]?.address || arr[1];
    if (aMint && bMint) return { aMint, bMint };
  }

  return { aMint: null, bMint: null };
}

async function getSupplyWithRpcFallback(mintPk) {
  const envRpc = (process.env.SOLANA_RPC || "").trim();
  const rpcs = [envRpc, ...RPC_FALLBACKS].filter(Boolean);

  let lastErr = null;

  for (const rpc of rpcs) {
    try {
      const connection = new Connection(rpc, "confirmed");

      // getTokenSupply est le vrai test (certains RPC répondent ok à d’autres calls mais bloquent celui-là)
      const supplyResp = await connection.getTokenSupply(mintPk);

      const decimals = supplyResp?.value?.decimals ?? null;
      const supplyUiString = supplyResp?.value?.uiAmountString ?? null;

      if (decimals == null || !supplyUiString) {
        throw new Error("Supply unavailable");
      }

      const supply = Number(supplyUiString);
      if (!Number.isFinite(supply) || supply <= 0) {
        throw new Error("Supply conversion failed");
      }

      return { rpc, supply, decimals, supplyUiString };
    } catch (e) {
      lastErr = e;

      // Si c’est un 403 style Ankr “API key is not allowed”, on passe au suivant
      const msg = String(e?.message || e);
      if (msg.includes("403") || msg.toLowerCase().includes("forbidden")) {
        continue;
      }

      // “could not find account” peut venir d’un RPC qui bug — on essaye quand même les autres
      continue;
    }
  }

  throw new Error(
    `RPC supply failed (all rpcs). Last error: ${String(lastErr?.message || lastErr)}`
  );
}

export default async function handler(req, res) {
  try {
    const mintRaw = req.query.mint;
    const mint = (Array.isArray(mintRaw) ? mintRaw[0] : mintRaw || "").trim();

    const quoteRaw = req.query.quoteMint;
    const quoteMint = (Array.isArray(quoteRaw) ? quoteRaw[0] : quoteRaw || DEFAULT_USDC).trim();

    const poolTypeRaw = req.query.poolType;
    const poolType = (Array.isArray(poolTypeRaw) ? poolTypeRaw[0] : poolTypeRaw || "all").trim();

    if (!mint) return res.status(400).json({ ok: false, error: "Missing ?mint=" });

    // validate mint early
    let mintPk;
    try {
      mintPk = new PublicKey(mint);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid mint address", mint });
    }

    // cache
    const cacheKey = `${lc(mint)}|${lc(quoteMint)}|${lc(poolType)}`;
    const now = Date.now();
    const cached = globalThis.__ttrMetricsCacheMap.get(cacheKey);
    if (cached?.v && now - cached.t < CACHE_TTL_MS) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(cached.v);
    }

    // 1) supply via RPC fallback
    const { rpc, supply, decimals, supplyUiString } = await getSupplyWithRpcFallback(mintPk);

    // 2) find best Raydium pool
    // IMPORTANT: mint et quoteMint doivent être DIFFERENTS. Si tu passes USDC->USDC tu auras “no pool found”.
    if (lc(mint) === lc(quoteMint)) {
      return res.status(400).json({
        ok: false,
        error: "mint and quoteMint are the same (no pool possible)",
        mint,
        quoteMint,
      });
    }

    const urlPools =
      `${RAYDIUM_V3}/pools/info/mint` +
      `?mint1=${encodeURIComponent(mint)}` +
      `&mint2=${encodeURIComponent(quoteMint)}` +
      `&poolType=${encodeURIComponent(poolType)}` +
      `&poolSortField=default&sortType=desc&pageSize=30&page=1`;

    const poolsJson = await fetchJson(urlPools, { timeoutMs: 9000, tries: 3 });
    const candidates = poolsJson?.data?.data || poolsJson?.data || [];
    const best = pickBestPool(candidates);
    const poolId = best?.id;

    if (!poolId) {
      return res.status(404).json({
        ok: false,
        error: "No Raydium pool found for mint/quote",
        mint,
        quoteMint,
        poolType,
      });
    }

    // 3) pool info (price)
    const urlPoolInfo = `${RAYDIUM_V3}/pools/key/ids?ids=${encodeURIComponent(poolId)}`;
    const poolInfoJson = await fetchJson(urlPoolInfo, { timeoutMs: 9000, tries: 3 });
    const poolInfo = poolInfoJson?.data?.data?.[0] || poolInfoJson?.data?.[0] || null;

    const rawPrice =
      num(poolInfo?.price) ??
      num(poolInfo?.poolPrice) ??
      num(best?.price) ??
      null;

    if (!rawPrice || rawPrice <= 0) {
      return res.status(502).json({
        ok: false,
        error: "Price unavailable from Raydium pool",
        poolId,
      poolScore: best ? poolScore(best) : 0,
      candidatesCount: Array.isArray(candidates) ? candidates.length : 0,
      });
    }

    // 4) normalize price as (mint in quoteMint)
    const { aMint, bMint } = extractMints(poolInfo || best || {});
    const M = lc(mint);
    const Q = lc(quoteMint);
    const A = lc(aMint);
    const B = lc(bMint);

    let price = rawPrice;
    let inverted = false;

    // If Raydium says: A priced in B
    if (A && B) {
      if (A === M && B === Q) {
        price = rawPrice;
      } else if (A === Q && B === M) {
        price = 1 / rawPrice;
        inverted = true;
      }
    }

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(502).json({
        ok: false,
        error: "Normalized price invalid",
        poolId,
      });
    }

    // 5) market cap
    let priceUsd = price;
    let quoteType = "USD";
    if (lc(quoteMint) === lc("So11111111111111111111111111111111111111112")) {
      try {
        const solUsd = await getSolUsdPrice();
        priceUsd = price * solUsd;
        quoteType = "WSOL->USD";
      } catch (e) {
        quoteType = "WSOL (unconverted)";
      }
    }

    const marketCap = priceUsd * supply;

    const payload = {
      ok: true,
      source: "RAYDIUM_V3 + ONCHAIN_SUPPLY",
      mint,
      quoteMint,
      poolType,
      poolId,
      rawPrice,
      price,
      priceUsd,
      quoteType,
      inverted,
      supply,
      supplyUiString,
      decimals,
      marketCap,
      rpcUsed: rpc,
      ts: new Date().toISOString(),
    };

    globalThis.__ttrMetricsCacheMap.set(cacheKey, { t: now, v: payload });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(payload);
  } catch (e) {
    const isAbort = String(e?.name || "").toLowerCase().includes("abort");
    return res.status(isAbort ? 504 : 500).json({
      ok: false,
      error: e?.message || String(e),
    });
  }
}

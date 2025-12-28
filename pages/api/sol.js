import { TTR_CONFIG } from "../../lib/ttrconfig";

export default async function handler(req, res) {
  try {
    const poolId = TTR_CONFIG?.RAYDIUM_POOL;
    if (!poolId) {
      return res.status(500).json({ ok: false, error: "Missing RAYDIUM_POOL" });
    }

    // Raydium public API (JSON)
    // Returns pool info including price data for many pools.
    // We'll fetch and then pick our poolId.
    const url = "https://api.raydium.io/v2/main/pairs";

    const r = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "war-of-coins/1.0 (+vercel)",
      },
    });

    const text = await r.text();

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        where: "raydium",
        status: r.status,
        bodyPreview: text.slice(0, 200),
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        ok: false,
        where: "raydium",
        error: "Non-JSON response",
        bodyPreview: text.slice(0, 200),
      });
    }

    // data is usually an object keyed by pairAddress or an array depending on API version
    // We'll support both shapes.
    let pair = null;

    if (Array.isArray(data)) {
      pair = data.find((p) => p?.ammId === poolId || p?.id === poolId || p?.address === poolId);
    } else if (data && typeof data === "object") {
      // sometimes it's a map: { "<pairAddress>": {...} }
      pair =
        data[poolId] ||
        Object.values(data).find((p) => p?.ammId === poolId || p?.id === poolId || p?.address === poolId) ||
        null;
    }

    if (!pair) {
      return res.status(404).json({
        ok: false,
        error: "Pool not found in Raydium pairs list",
        poolId,
      });
    }

    // Try common fields
    const price =
      pair?.price ??
      pair?.priceUsd ??
      pair?.currentPrice ??
      pair?.lpPrice ??
      null;

    return res.status(200).json({
      ok: true,
      poolId,
      price,
      pair,
    });
  } catch (e) {
    console.error("API /sol error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

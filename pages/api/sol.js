import { TTR_CONFIG } from "../../lib/ttrconfig";

export default async function handler(req, res) {
  try {
    if (TTR_CONFIG?.SOURCE !== "COINGECKO") {
      return res.status(200).json({
        ok: false,
        error: "TTR_CONFIG.SOURCE is not COINGECKO",
        source: TTR_CONFIG?.SOURCE || null,
      });
    }

    const id = TTR_CONFIG?.CG_ID || "bonk";

    const url =
      "https://api.coingecko.com/api/v3/coins/markets" +
      `?vs_currency=usd&ids=${encodeURIComponent(id)}`;

    const r = await fetch(url, {
      headers: { accept: "application/json" },
    });

    const data = await r.json();
    const coin = Array.isArray(data) ? data[0] : null;

    return res.status(200).json({
      ok: true,
      source: "COINGECKO",
      id,
      priceUsd: coin?.current_price ?? null,
      marketCap: coin?.market_cap ?? null,
      supply: coin?.circulating_supply ?? null,
      raw: coin,
    });
  } catch (e) {
    console.error("API /sol error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

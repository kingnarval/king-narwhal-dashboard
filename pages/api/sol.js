import { TTR_CONFIG } from "../../lib/ttrconfig";

export default async function handler(req, res) {
  try {
    if (TTR_CONFIG?.SOURCE !== "COINGECKO") {
      return res.status(200).json({
        ok: false,
        error: "TTR_CONFIG.SOURCE is not COINGECKO (test mode)",
        source: TTR_CONFIG?.SOURCE || null,
      });
    }

    const id = TTR_CONFIG?.CG_ID || "solana";
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      id
    )}&vs_currencies=usd`;

    const r = await fetch(url, { headers: { accept: "application/json" } });
    const text = await r.text();

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        where: "coingecko",
        status: r.status,
        bodyPreview: text.slice(0, 200),
      });
    }

    const data = JSON.parse(text);
    const priceUsd = data?.[id]?.usd ?? null;

    return res.status(200).json({
      ok: true,
      source: "COINGECKO",
      id,
      priceUsd,
      raw: data,
    });
  } catch (e) {
    console.error("API /sol error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

export default async function handler(req, res) {
  try {
    const { mint, pool } = req.query;

    // Tu peux appeler /api/sol?mint=...&pool=...
    // mais pour l’instant on teste juste la réponse Dexscreener.
    const url = "https://api.dexscreener.com/latest/dex/pairs/solana";

    const r = await fetch(url, {
      headers: {
        "accept": "application/json",
        "user-agent": "war-of-coins/1.0 (+vercel)",
      },
    });

    const text = await r.text();

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        where: "dexscreener",
        status: r.status,
        bodyPreview: text.slice(0, 200),
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({
        ok: false,
        where: "dexscreener",
        error: "Non-JSON response",
        bodyPreview: text.slice(0, 200),
      });
    }

    return res.status(200).json({ ok: true, data });
  } catch (e) {
    console.error("API /sol error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

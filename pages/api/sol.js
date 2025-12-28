export default async function handler(req, res) {
  try {
    const mint =
      (req.query.mint && String(req.query.mint)) ||
      "25ha9xP8oDhFhx9ay6rarbgvLGwDdNqchSX3jQ3mTJD7"; // MANEKI

    const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;

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
        where: "dexscreener",
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
        where: "dexscreener",
        error: "Non-JSON response",
        bodyPreview: text.slice(0, 200),
      });
    }

    // Optionnel: renvoyer un format simple
    const best = data?.pairs?.[0] || null;

    return res.status(200).json({
      ok: true,
      mint,
      priceUsd: best?.priceUsd ? Number(best.priceUsd) : null,
      pairAddress: best?.pairAddress || null,
      dexId: best?.dexId || null,
      raw: data,
    });
  } catch (e) {
    console.error("API /sol error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

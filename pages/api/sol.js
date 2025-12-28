export default async function handler(req, res) {
  try {
    const mint =
      (req.query.mint && String(req.query.mint)) ||
      "25ha9xP8oDhFhx9ay6rarbgvLGwDdNqchSX3jQ3mTJD7"; // MANEKI

    const apiKey = process.env.BIRDEYE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: "Missing BIRDEYE_API_KEY" });
    }

    const url = `https://public-api.birdeye.so/defi/price?address=${mint}`;

    const r = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        accept: "application/json",
      },
    });

    const data = await r.json();

    return res.status(200).json({
      ok: true,
      mint,
      priceUsd: data?.data?.value ?? null,
      raw: data,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

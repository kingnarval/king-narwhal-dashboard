export default async function handler(req, res) {
  try {
    // Optionnel : si tu as un JWT pump.fun
    const jwt = process.env.PUMPFUN_JWT || "";

    const response = await fetch(
      "https://frontend-api-v3.pump.fun/coins/latest?limit=200",
      {
        headers: {
          Accept: "application/json",
          Origin: "https://pump.fun",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
      }
    );

    if (!response.ok) {
      console.error("Pump.fun API error:", response.status, await response.text());
      return res.status(500).json({ error: "Pump.fun API error" });
    }

    const json = await response.json();

    // Selon le format, ça peut être json.data ou directement un array
    const coins = Array.isArray(json) ? json : json.data || [];

    const mapped = coins.map((c) => ({
      // Ce mapping est pensé pour coller à normalizeCoinPump du WOC v6
      address: c.mint || c.address || null,
      symbol: c.symbol || c.ticker || "",
      name: c.name || c.symbol || "Pump Token",
      fdv:
        c.fdv ||
        c.fully_diluted_valuation ||
        c.fullyDilutedValuation ||
        0,
      img: c.image_uri || c.imageUrl || c.icon || null,
    }));

    res.status(200).json(mapped);
  } catch (err) {
    console.error("Pump.fun proxy failed:", err);
    res.status(500).json({ error: "Pump.fun proxy crashed" });
  }
}
export default async function handler(req, res) {
  try {
    const API_KEY =
      process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }

    const url =
      "https://public-api.birdeye.so/defi/tokenlist?sort_by=mc&sort_type=asc&offset=0&limit=50";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-KEY": API_KEY,
        "X-CHAIN": "solana",
      },
    });

    const text = await response.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "Invalid JSON",
        raw: text,
      });
    }

    return res.status(200).json({
      rawTokens: json.data?.tokens ?? [],
      count: json.data?.tokens?.length ?? 0,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

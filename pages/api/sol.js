return res.status(200).json({
  ok: true,
  source: "COINGECKO",
  id,
  priceUsd: coin?.current_price ?? null,

  // ✅ champs compatibles "map"
  capNum: coin?.market_cap ?? null,                // market cap brut
  cap: coin?.market_cap ? `$${coin.market_cap}` : null, // string

  // ✅ bonus utiles
  marketCap: coin?.market_cap ?? null,
  supply: coin?.circulating_supply ?? null,
  symbol: coin?.symbol ?? null,
  name: coin?.name ?? null,
  logo: coin?.image ?? null,

  raw: coin,
});

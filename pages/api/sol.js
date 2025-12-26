export default async function handler(req, res) {
  const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana");
  const data = await r.json();
  res.status(200).json(data);
}

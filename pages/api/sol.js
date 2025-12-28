import { Connection, PublicKey } from "@solana/web3.js";
import { TTR_CONFIG } from "../../lib/ttrconfig";

// Raydium AMM v4 layout minimal: on lit les vaults du pool + decimals
// Ici on fait simple: on lit les balances SPL des deux vaults et on calcule price = quote/base.
const RPC =
  process.env.SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

async function getTokenBalance(connection, tokenAccountPubkey) {
  const resp = await connection.getTokenAccountBalance(tokenAccountPubkey);
  // uiAmount already adjusted for decimals
  return resp?.value?.uiAmount ?? null;
}

export default async function handler(req, res) {
  try {
    const poolId = TTR_CONFIG?.RAYDIUM_POOL;
    if (!poolId) {
      return res.status(500).json({ ok: false, error: "Missing RAYDIUM_POOL in TTR_CONFIG" });
    }

    const connection = new Connection(RPC, "confirmed");
    const poolPubkey = new PublicKey(poolId);

    // On lit le compte pool (binary), puis on doit parser le layout Raydium pour retrouver les vaults.
    // Comme ton projet "marchait en local", tu as très probablement déjà un parser/layout ailleurs.
    // Donc ici: on appelle une fonction locale si elle existe, sinon on renvoie une erreur explicite.
    return res.status(500).json({
      ok: false,
      error:
        "Raydium pool parsing not wired here yet. Your /api/sol currently used Dexscreener; we need the Raydium AMM layout parser that you used locally.",
      poolId,
      hint:
        "Send me your old /api/sol (the version that worked locally) or where you parse Raydium pool accounts, and I’ll plug it in.",
    });
  } catch (e) {
    console.error("API /sol error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

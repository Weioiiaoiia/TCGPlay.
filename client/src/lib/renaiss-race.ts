/**
 * Renaiss on-chain card data fetching — via server proxy
 * All BSC RPC and renaiss.xyz metadata requests go through /api/renaiss proxy
 * Solves browser-side CORS restriction issues
 * 
 * v2: Added batch APIs for parallel loading (3s target)
 */

export interface RenaissCard {
  tokenId: string;
  tokenIdHex: string;
  name: string;
  image: string;
  grader: string;
  serial: string;
  grade: string;
  year: string;
  set: string;
  language: string;
  cardNumber: string;
  metadataUri: string;
  owner?: string;
}

export type ProgressCallback = (msg: string) => void;

/**
 * Pick a random card from wallet as racing representative
 * All on-chain interactions done via server proxy
 */
export async function pickRandomCardFromWallet(
  wallet: string,
  onProgress?: ProgressCallback
): Promise<RenaissCard | null> {
  onProgress?.(`Fetching card data for ${wallet.slice(0, 8)}...`);

  try {
    const res = await fetch(`/api/renaiss/pick/${encodeURIComponent(wallet)}`, {
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      console.error("[Renaiss] Server proxy error:", err);
      onProgress?.(`Load failed: ${(err as any).error || "Unknown error"}`);
      return null;
    }

    const data = await res.json();

    if (!data.card) {
      onProgress?.(data.message || `Wallet ${wallet.slice(0, 8)}... has no available cards`);
      return null;
    }

    onProgress?.(`Success: ${data.card.name} (holds ${data.balance} cards)`);
    return data.card as RenaissCard;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Renaiss] pickRandomCardFromWallet error:", msg);
    onProgress?.(`Network error: ${msg}`);
    return null;
  }
}

/**
 * Fetch a random card from on-chain (for random match mode)
 * Done via server proxy
 */
export async function fetchRandomCard(
  onProgress?: ProgressCallback
): Promise<RenaissCard | null> {
  onProgress?.("Fetching random card from chain...");

  try {
    const res = await fetch("/api/renaiss/random", {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      console.error("[Renaiss] Random card error:", err);
      return null;
    }

    const data = await res.json();
    if (!data.card) return null;

    onProgress?.(`Got: ${data.card.name}`);
    return data.card as RenaissCard;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Renaiss] fetchRandomCard error:", msg);
    return null;
  }
}

/**
 * Batch fetch random cards from chain (parallel on server)
 * Returns up to `count` cards in a single request
 */
export async function fetchBatchRandomCards(
  count: number,
  onProgress?: ProgressCallback
): Promise<RenaissCard[]> {
  onProgress?.(`Fetching ${count} random cards from chain...`);

  try {
    const res = await fetch(`/api/renaiss/batch-random?count=${count}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error("[Renaiss] Batch random error:", res.status);
      return [];
    }

    const data = await res.json();
    const cards = (data.cards || []) as RenaissCard[];
    onProgress?.(`Got ${cards.length} cards from chain`);
    return cards;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Renaiss] fetchBatchRandomCards error:", msg);
    return [];
  }
}

/**
 * Batch pick cards from multiple wallets (parallel on server)
 * Returns results for each wallet in a single request
 */
export async function batchPickFromWallets(
  wallets: string[],
  onProgress?: ProgressCallback
): Promise<{ wallet: string; card: RenaissCard | null; balance: number }[]> {
  onProgress?.(`Fetching cards for ${wallets.length} wallets...`);

  try {
    const res = await fetch("/api/renaiss/batch-pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallets }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      console.error("[Renaiss] Batch pick error:", res.status);
      return wallets.map(w => ({ wallet: w, card: null, balance: 0 }));
    }

    const data = await res.json();
    onProgress?.(`Got results for ${(data.results || []).length} wallets`);
    return (data.results || []) as { wallet: string; card: RenaissCard | null; balance: number }[];
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Renaiss] batchPickFromWallets error:", msg);
    return wallets.map(w => ({ wallet: w, card: null, balance: 0 }));
  }
}

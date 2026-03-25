/**
 * Server-side proxy for Renaiss metadata and BSC RPC calls.
 * Bypasses CORS restrictions that block browser-side requests to renaiss.xyz.
 * 
 * v4: Pre-warm card pool on startup for near-instant batch-random responses.
 *     Cards are continuously fetched in the background and served from cache.
 */
import { Router } from "express";
import express from "express";
import axios from "axios";

const router = Router();

const BSC_RPC_URLS = [
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
];

const RENAISS_NFT_CONTRACT = "0xF8646A3Ca093e97Bb404c3b25e675C0394DD5b30";

let rpcIndex = 0;
function getNextRpcUrl(): string {
  const url = BSC_RPC_URLS[rpcIndex % BSC_RPC_URLS.length];
  rpcIndex++;
  return url;
}

// ABI helpers
function padHex(val: string): string {
  return val.replace("0x", "").padStart(64, "0");
}
function encodeFn(selector: string, ...args: string[]): string {
  return selector + args.map(a => padHex(a)).join("");
}
function decodeUint256(hex: string): bigint {
  if (!hex || hex === "0x") return BigInt(0);
  return BigInt(hex);
}
function decodeAddress(hex: string): string {
  if (!hex || hex === "0x" || hex.length < 66) return "";
  return "0x" + hex.slice(26, 66);
}
function decodeString(hex: string): string {
  if (!hex || hex === "0x" || hex.length < 130) return "";
  try {
    const offset = Number(BigInt("0x" + hex.slice(2, 66)));
    const startByte = 2 + offset * 2;
    const length = Number(BigInt("0x" + hex.slice(startByte, startByte + 64)));
    const dataStart = startByte + 64;
    const dataHex = hex.slice(dataStart, dataStart + length * 2);
    const bytes: number[] = [];
    for (let i = 0; i < dataHex.length; i += 2) {
      bytes.push(parseInt(dataHex.slice(i, i + 2), 16));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return "";
  }
}

const SEL = {
  balanceOf: "0x70a08231",
  tokenOfOwnerByIndex: "0x2f745c59",
  tokenByIndex: "0x4f6ccce7",
  tokenURI: "0xc87b56dd",
  ownerOf: "0x6352211e",
  totalSupply: "0x18160ddd",
};

async function ethCall(to: string, data: string): Promise<string> {
  for (let attempt = 0; attempt < BSC_RPC_URLS.length; attempt++) {
    const url = getNextRpcUrl();
    try {
      const res = await axios.post(url, {
        jsonrpc: "2.0",
        id: Date.now() + Math.floor(Math.random() * 100000),
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }, { timeout: 8000 });

      if (res.data.error || !res.data.result || res.data.result === "0x") {
        continue;
      }
      return res.data.result;
    } catch {
      if (attempt === BSC_RPC_URLS.length - 1) throw new Error("All RPCs failed");
    }
  }
  throw new Error("All RPC attempts exhausted");
}

interface CardAttribute { trait_type: string; value: string; }
interface CardMetadata { name: string; description: string; image: string; attributes: CardAttribute[]; }

function getAttr(attrs: CardAttribute[], key: string): string {
  return attrs?.find(a => a.trait_type.toLowerCase() === key.toLowerCase())?.value ?? "";
}

// ── Metadata cache ──
const metadataCache = new Map<string, object | null>();
let totalSupplyCache: { value: number; ts: number } | null = null;

async function ensureTotalSupply(): Promise<number> {
  if (!totalSupplyCache || Date.now() - totalSupplyCache.ts > 600000) {
    const result = await ethCall(RENAISS_NFT_CONTRACT, SEL.totalSupply);
    totalSupplyCache = { value: Number(decodeUint256(result)), ts: Date.now() };
  }
  return totalSupplyCache.value;
}

async function fetchCardMetadata(tokenId: bigint) {
  const tokenIdStr = tokenId.toString();
  if (metadataCache.has(tokenIdStr)) return metadataCache.get(tokenIdStr);

  try {
    const tid = "0x" + tokenId.toString(16);
    const uriResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.tokenURI, tid));
    const uri = decodeString(uriResult);
    if (!uri) return null;

    const fixedUri = uri.replace("https://renaiss.xyz/", "https://www.renaiss.xyz/");
    const res = await axios.get(fixedUri, { timeout: 8000 });
    const metadata = res.data as CardMetadata;

    const card = {
      tokenId: tokenIdStr,
      tokenIdHex: "0x" + tokenId.toString(16),
      name: metadata.name || "Unknown Card",
      image: metadata.image || "",
      grader: getAttr(metadata.attributes, "Grader"),
      serial: getAttr(metadata.attributes, "Serial"),
      grade: getAttr(metadata.attributes, "Grade"),
      year: getAttr(metadata.attributes, "Year"),
      set: getAttr(metadata.attributes, "Set"),
      language: getAttr(metadata.attributes, "Language"),
      cardNumber: getAttr(metadata.attributes, "Card Number"),
      metadataUri: uri,
    };

    metadataCache.set(tokenIdStr, card);
    return card;
  } catch (e) {
    console.error(`[Renaiss] fetchCardMetadata error for ${tokenIdStr}:`, e instanceof Error ? e.message : e);
    metadataCache.set(tokenIdStr, null);
    return null;
  }
}

// ══════════════════════════════════════════════════
// PRE-WARM CARD POOL — background fetch on startup
// ══════════════════════════════════════════════════
const cardPool: any[] = [];          // Ready-to-serve cards
const POOL_TARGET = 30;              // Keep 30 cards warm
let poolWarming = false;
const usedTokenIds = new Set<string>(); // Track used cards to avoid duplicates in same session

async function fetchOneRandomCard(totalSupply: number): Promise<any> {
  try {
    const randomIndex = Math.floor(Math.random() * totalSupply);
    const idxHex = "0x" + randomIndex.toString(16);
    const tokenResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.tokenByIndex, idxHex));
    const tokenId = decodeUint256(tokenResult);
    const card = await fetchCardMetadata(tokenId);
    if (card && (card as any).image) {
      (card as any).owner = "Chain";
      return card;
    }
  } catch {}
  return null;
}

async function warmPool() {
  if (poolWarming) return;
  poolWarming = true;
  console.log("[Renaiss] Starting card pool warm-up...");

  try {
    const totalSupply = await ensureTotalSupply();
    if (totalSupply === 0) { poolWarming = false; return; }

    // Continuously fill pool until target reached
    while (cardPool.length < POOL_TARGET) {
      try {
        const card = await fetchOneRandomCard(totalSupply);
        if (card && !usedTokenIds.has((card as any).tokenId)) {
          cardPool.push(card);
          if (cardPool.length % 5 === 0) {
            console.log(`[Renaiss] Pool: ${cardPool.length}/${POOL_TARGET} cards ready`);
          }
        }
      } catch {}
      // Small delay between fetches to be nice to RPC
      await new Promise(r => setTimeout(r, 100));
    }
    console.log(`[Renaiss] Pool warm-up complete: ${cardPool.length} cards ready`);
  } catch (e) {
    console.error("[Renaiss] Pool warm-up error:", e instanceof Error ? e.message : e);
  }
  poolWarming = false;
}

// Refill pool in background when cards are consumed
function scheduleRefill() {
  if (cardPool.length < POOL_TARGET && !poolWarming) {
    setTimeout(() => warmPool(), 500);
  }
}

// Start warming immediately when module loads
setTimeout(() => warmPool(), 2000);

// ── Helper: run tasks with limited concurrency ──
async function pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// ── API: Get wallet balance ──
router.get("/balance/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const addr = "0x" + wallet.toLowerCase().replace("0x", "");
    const result = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.balanceOf, addr));
    res.json({ balance: Number(decodeUint256(result)) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// ── API: Pick random card from wallet ──
router.get("/pick/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const addr = "0x" + wallet.toLowerCase().replace("0x", "");
    const balResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.balanceOf, addr));
    const balance = Number(decodeUint256(balResult));

    if (balance === 0) {
      res.json({ card: null, balance: 0, message: "No Renaiss cards in this wallet" });
      return;
    }

    const tried = new Set<number>();
    for (let attempt = 0; attempt < Math.min(3, balance); attempt++) {
      let idx = Math.floor(Math.random() * balance);
      while (tried.has(idx) && tried.size < balance) idx = (idx + 1) % balance;
      tried.add(idx);
      try {
        const idxHex = "0x" + idx.toString(16);
        const tokenResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.tokenOfOwnerByIndex, addr, idxHex));
        const tokenId = decodeUint256(tokenResult);
        const card = await fetchCardMetadata(tokenId);
        if (card && (card as any).image) {
          (card as any).owner = wallet;
          res.json({ card, balance });
          return;
        }
      } catch (e) {
        console.warn(`[Renaiss] pick attempt ${attempt} failed:`, e instanceof Error ? e.message : e);
      }
    }

    try {
      const tokenResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.tokenOfOwnerByIndex, addr, "0x0"));
      const tokenId = decodeUint256(tokenResult);
      const card = await fetchCardMetadata(tokenId);
      if (card) { (card as any).owner = wallet; res.json({ card, balance }); return; }
    } catch {}

    res.json({ card: null, balance, message: "Could not load card metadata" });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// ── API: Random card from chain ──
router.get("/random", async (req, res) => {
  try {
    // Try pool first
    if (cardPool.length > 0) {
      const card = cardPool.shift()!;
      usedTokenIds.add((card as any).tokenId);
      scheduleRefill();
      res.json({ card });
      return;
    }

    // Fallback to live fetch
    const totalSupply = await ensureTotalSupply();
    if (totalSupply === 0) { res.json({ card: null }); return; }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const card = await fetchOneRandomCard(totalSupply);
        if (card) {
          try {
            const tid = (card as any).tokenIdHex;
            const ownerResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.ownerOf, tid));
            (card as any).owner = decodeAddress(ownerResult);
          } catch { (card as any).owner = "Unknown"; }
          res.json({ card });
          return;
        }
      } catch { continue; }
    }
    res.json({ card: null });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// ── API: Batch random cards (FAST — from pre-warmed pool) ──
router.get("/batch-random", async (req, res) => {
  try {
    const count = Math.min(20, Math.max(1, parseInt(req.query.count as string) || 5));

    // Take from pool first
    const cards: any[] = [];
    while (cards.length < count && cardPool.length > 0) {
      const card = cardPool.shift()!;
      usedTokenIds.add((card as any).tokenId);
      cards.push(card);
    }

    // If pool didn't have enough, fetch remaining live (with concurrency)
    if (cards.length < count) {
      const remaining = count - cards.length;
      console.log(`[Renaiss] Pool had ${cards.length}/${count}, fetching ${remaining} live...`);
      const totalSupply = await ensureTotalSupply();
      if (totalSupply > 0) {
        const indices: number[] = [];
        const tried = new Set<number>();
        while (indices.length < remaining + 3 && tried.size < totalSupply) {
          const idx = Math.floor(Math.random() * totalSupply);
          if (!tried.has(idx)) { tried.add(idx); indices.push(idx); }
        }
        const liveResults = await pMap(indices, (idx) => fetchOneRandomCard(totalSupply), 3);
        for (const card of liveResults) {
          if (card && cards.length < count && !usedTokenIds.has((card as any).tokenId)) {
            usedTokenIds.add((card as any).tokenId);
            cards.push(card);
          }
        }
      }
    }

    // Trigger background refill
    scheduleRefill();

    res.json({ cards });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// ── API: Batch pick cards from multiple wallets ──
router.post("/batch-pick", express.json(), async (req, res) => {
  try {
    const wallets: string[] = req.body?.wallets || [];
    if (!wallets.length) { res.json({ results: [] }); return; }

    const pickOne = async (wallet: string): Promise<{ wallet: string; card: any; balance: number }> => {
      try {
        const addr = "0x" + wallet.toLowerCase().replace("0x", "");
        const balResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.balanceOf, addr));
        const balance = Number(decodeUint256(balResult));
        if (balance === 0) return { wallet, card: null, balance: 0 };

        const tried = new Set<number>();
        for (let attempt = 0; attempt < Math.min(3, balance); attempt++) {
          let idx = Math.floor(Math.random() * balance);
          while (tried.has(idx) && tried.size < balance) idx = (idx + 1) % balance;
          tried.add(idx);
          try {
            const idxHex = "0x" + idx.toString(16);
            const tokenResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.tokenOfOwnerByIndex, addr, idxHex));
            const tokenId = decodeUint256(tokenResult);
            const card = await fetchCardMetadata(tokenId);
            if (card && (card as any).image) {
              (card as any).owner = wallet;
              return { wallet, card, balance };
            }
          } catch {}
        }
        try {
          const tokenResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.tokenOfOwnerByIndex, addr, "0x0"));
          const tokenId = decodeUint256(tokenResult);
          const card = await fetchCardMetadata(tokenId);
          if (card) { (card as any).owner = wallet; return { wallet, card, balance }; }
        } catch {}
        return { wallet, card: null, balance };
      } catch {
        return { wallet, card: null, balance: 0 };
      }
    };

    const data = await pMap(wallets, pickOne, 3);
    res.json({ results: data });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// ── API: Pool status (for debugging) ──
router.get("/pool-status", (_req, res) => {
  res.json({
    poolSize: cardPool.length,
    poolTarget: POOL_TARGET,
    warming: poolWarming,
    cacheSize: metadataCache.size,
    usedCount: usedTokenIds.size,
  });
});

export default router;

/**
 * Server-side proxy for Renaiss metadata and BSC RPC calls.
 * Bypasses CORS restrictions that block browser-side requests to renaiss.xyz.
 *
 * v6 Architecture (FAST — <3s for any wallet):
 *   - On startup: pre-warm FULL card cache from tRPC (metadata + FMV for ALL ~3200 cards)
 *   - wallet-cards: RPC gets tokenIds (~1.5s) + cache lookup (~0ms) = <2s total
 *   - No individual metadata HTTP requests needed at query time
 *   - tRPC tokenId is a BigInt string — must match BSC tokenId exactly
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
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed2.defibit.io",
  "https://bsc-dataseed3.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-dataseed2.ninicoin.io",
  "https://bsc-dataseed3.ninicoin.io",
];

const RENAISS_NFT_CONTRACT = "0xF8646A3Ca093e97Bb404c3b25e675C0394DD5b30";

let rpcIndex = 0;
function getNextRpcUrl(): string {
  const url = BSC_RPC_URLS[rpcIndex % BSC_RPC_URLS.length];
  rpcIndex++;
  return url;
}

// ── ABI helpers ──
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

// ── Single eth_call (with node rotation) ──
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
      if (res.data.error || !res.data.result || res.data.result === "0x") continue;
      return res.data.result;
    } catch {
      if (attempt === BSC_RPC_URLS.length - 1) throw new Error("All RPCs failed");
    }
  }
  throw new Error("All RPC attempts exhausted");
}

// ── Chunked batch eth_call (rate-limit safe) ──
const BATCH_CHUNK_SIZE = 8;
const BATCH_CHUNK_DELAY = 100; // ms

async function batchEthCall(calls: Array<{ to: string; data: string }>): Promise<string[]> {
  if (calls.length === 0) return [];

  const allResults: Array<{ id: number; result?: string; error?: any }> = [];

  for (let i = 0; i < calls.length; i += BATCH_CHUNK_SIZE) {
    const chunk = calls.slice(i, i + BATCH_CHUNK_SIZE);
    const body = chunk.map((c, j) => ({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to: c.to, data: c.data }, "latest"],
      id: i + j + 1,
    }));

    let chunkResults: any[] | null = null;
    for (let attempt = 0; attempt < BSC_RPC_URLS.length; attempt++) {
      const url = getNextRpcUrl();
      try {
        const res = await axios.post(url, body, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        });
        const results: any[] = Array.isArray(res.data) ? res.data : [res.data];
        const blocked = results.some((r: any) => r.error && (
          String(r.error.message || "").toLowerCase().includes("rate limit") ||
          String(r.error.message || "").toLowerCase().includes("too many") ||
          String(r.error.message || "").toLowerCase().includes("unauthorized") ||
          String(r.error.message || "").toLowerCase().includes("api key") ||
          r.error.code === -32005 || r.error.code === 401 || r.error.code === 429
        ));
        if (blocked) { await sleep(150); continue; }
        chunkResults = results;
        break;
      } catch { /* try next node */ }
    }

    if (chunkResults) {
      allResults.push(...chunkResults);
    } else {
      chunk.forEach((_, j) => allResults.push({ id: i + j + 1 }));
    }

    if (i + BATCH_CHUNK_SIZE < calls.length) {
      await sleep(BATCH_CHUNK_DELAY);
    }
  }

  allResults.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  return allResults.map(r => r.result || "0x");
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function getAttr(attrs: Array<{ trait: string; value: string }>, key: string): string {
  return attrs?.find(a => a.trait?.toLowerCase() === key.toLowerCase())?.value ?? "";
}

// ══════════════════════════════════════════════════════════════════
// GLOBAL CARD CACHE — pre-warmed from tRPC on startup
// Maps tokenId (decimal string) -> full card object (metadata + FMV)
// tRPC tokenId is a BigInt string (may differ from BSC hex tokenId)
// We store by BOTH the tRPC tokenId AND the BSC decimal tokenId
// ══════════════════════════════════════════════════════════════════
interface CachedCard {
  tokenId: string;         // BSC decimal tokenId
  renaisUrl: string;
  fmv: number | null;      // USD dollars (fmvPriceInUSD / 100)
  metadata: {
    name: string;
    image: string;
    animationUrl: string | null;
    attributes: Array<{ trait_type: string; value: string }>;
    grader: string;
    serial: string;
    grade: string;
    year: string;
    set: string;
    language: string;
    cardNumber: string;
    setName: string;
    pokemonName: string;
  };
}

const globalCardCache = new Map<string, CachedCard>(); // key: BSC decimal tokenId
let cardCacheReady = false;
let cardCacheWarming = false;
const CACHE_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

async function fetchTrpcPage(offset: number): Promise<CachedCard[]> {
  const input = encodeURIComponent(JSON.stringify({
    "0": {
      "json": {
        "limit": 100, "offset": offset, "search": null,
        "sortBy": "listDate", "sortOrder": "desc",
        "categoryFilter": null, "listedOnly": null,
        "characterFilter": "", "languageFilter": "",
        "gradingCompanyFilter": "", "gradeFilter": "",
        "yearRange": "", "priceRangeFilter": ""
      },
      "meta": { "values": { "search": ["undefined"], "categoryFilter": ["undefined"], "listedOnly": ["undefined"] } }
    }
  }));
  const url = `https://www.renaiss.xyz/api/trpc/collectible.list?batch=1&input=${input}`;
  const res = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.renaiss.xyz/marketplace',
    },
  });
  const collection = res.data?.[0]?.result?.data?.json?.collection ?? [];
  const cards: CachedCard[] = [];
  for (const item of collection) {
    // tRPC tokenId is a BigInt string (decimal)
    const tid = String(item.tokenId ?? "");
    if (!tid) continue;

    const fmvRaw = item.fmvPriceInUSD;
    const fmv = fmvRaw != null ? parseInt(String(fmvRaw), 10) / 100 : null;

    // tRPC attributes format: [{trait, value}]
    const rawAttrs: Array<{ trait: string; value: string }> = item.attributes ?? [];
    // Convert to standard format for frontend
    const attributes = rawAttrs.map(a => ({ trait_type: a.trait, value: a.value }));

    const card: CachedCard = {
      tokenId: tid,
      renaisUrl: `https://renaiss.xyz/card/${tid}`,
      fmv,
      metadata: {
        name: item.name || "Unknown Card",
        image: item.frontImageUrl || "",
        animationUrl: item.animationUrl || null,
        attributes,
        grader: getAttr(rawAttrs, "Grader"),
        serial: getAttr(rawAttrs, "Serial"),
        grade: getAttr(rawAttrs, "Grade"),
        year: getAttr(rawAttrs, "Year"),
        set: getAttr(rawAttrs, "Set"),
        language: getAttr(rawAttrs, "Language"),
        cardNumber: getAttr(rawAttrs, "Card Number"),
        setName: item.setName || "",
        pokemonName: item.pokemonName || "",
      },
    };
    cards.push(card);
  }
  return cards;
}

async function warmCardCache() {
  if (cardCacheWarming) return;
  cardCacheWarming = true;
  console.log("[Renaiss] Warming card cache from tRPC (metadata + FMV)...");

  try {
    // Get total count
    const firstPageCards = await fetchTrpcPage(0);
    for (const c of firstPageCards) globalCardCache.set(c.tokenId, c);

    const totalInput = encodeURIComponent(JSON.stringify({
      "0": {
        "json": { "limit": 1, "offset": 0, "search": null, "sortBy": "listDate", "sortOrder": "desc",
                  "categoryFilter": null, "listedOnly": null, "characterFilter": "", "languageFilter": "",
                  "gradingCompanyFilter": "", "gradeFilter": "", "yearRange": "", "priceRangeFilter": "" },
        "meta": { "values": { "search": ["undefined"], "categoryFilter": ["undefined"], "listedOnly": ["undefined"] } }
      }
    }));
    const totalRes = await axios.get(`https://www.renaiss.xyz/api/trpc/collectible.list?batch=1&input=${totalInput}`, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://www.renaiss.xyz/marketplace' },
    });
    const total = totalRes.data?.[0]?.result?.data?.json?.pagination?.total ?? 3500;
    const pages = Math.ceil(total / 100);
    console.log(`[Renaiss] Total cards: ${total}, fetching ${pages} pages...`);

    // Fetch all remaining pages in batches of 8 concurrent
    const offsets: number[] = [];
    for (let i = 1; i < pages; i++) offsets.push(i * 100);

    for (let i = 0; i < offsets.length; i += 8) {
      const batch = offsets.slice(i, i + 8);
      const results = await Promise.allSettled(batch.map(o => fetchTrpcPage(o)));
      for (const r of results) {
        if (r.status === "fulfilled") {
          for (const c of r.value) globalCardCache.set(c.tokenId, c);
        }
      }
      if (i % 40 === 0 && i > 0) {
        console.log(`[Renaiss] Cache progress: ${globalCardCache.size}/${total} cards`);
      }
      await sleep(150); // Be polite to tRPC
    }

    cardCacheReady = true;
    console.log(`[Renaiss] Card cache ready: ${globalCardCache.size} cards (metadata + FMV)`);
  } catch (e) {
    console.error("[Renaiss] Card cache warm error:", e instanceof Error ? e.message : e);
    cardCacheReady = true;
  }
  cardCacheWarming = false;
}

// Start warming immediately on startup
setTimeout(() => warmCardCache(), 500);
// Refresh every 10 minutes
setInterval(() => warmCardCache(), CACHE_REFRESH_INTERVAL);

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

// ── Metadata cache (for legacy endpoints) ──
const metadataCache = new Map<string, any>();
let totalSupplyCache: { value: number; ts: number } | null = null;

async function ensureTotalSupply(): Promise<number> {
  if (!totalSupplyCache || Date.now() - totalSupplyCache.ts > 600000) {
    const result = await ethCall(RENAISS_NFT_CONTRACT, SEL.totalSupply);
    totalSupplyCache = { value: Number(decodeUint256(result)), ts: Date.now() };
  }
  return totalSupplyCache.value;
}

async function fetchCardMetadata(tokenId: bigint): Promise<any | null> {
  const tokenIdStr = tokenId.toString();
  // Check global card cache first
  if (globalCardCache.has(tokenIdStr)) {
    const cached = globalCardCache.get(tokenIdStr)!;
    return {
      tokenId: tokenIdStr,
      tokenIdHex: "0x" + tokenId.toString(16),
      name: cached.metadata.name,
      image: cached.metadata.image,
      grader: cached.metadata.grader,
      serial: cached.metadata.serial,
      grade: cached.metadata.grade,
      year: cached.metadata.year,
      set: cached.metadata.set,
      language: cached.metadata.language,
      cardNumber: cached.metadata.cardNumber,
      attributes: cached.metadata.attributes,
    };
  }
  if (metadataCache.has(tokenIdStr)) return metadataCache.get(tokenIdStr);
  try {
    const tid = "0x" + tokenId.toString(16);
    const uriResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.tokenURI, tid));
    const uri = decodeString(uriResult);
    if (!uri) return null;
    const fixedUri = uri.replace("https://renaiss.xyz/", "https://www.renaiss.xyz/");
    const res = await axios.get(fixedUri, { timeout: 8000 });
    const metadata = res.data;
    const card = {
      tokenId: tokenIdStr,
      tokenIdHex: tid,
      name: metadata.name || "Unknown Card",
      image: metadata.image || "",
      grader: (metadata.attributes || []).find((a: any) => a.trait_type === "Grader")?.value ?? "",
      serial: (metadata.attributes || []).find((a: any) => a.trait_type === "Serial")?.value ?? "",
      grade: (metadata.attributes || []).find((a: any) => a.trait_type === "Grade")?.value ?? "",
      year: (metadata.attributes || []).find((a: any) => a.trait_type === "Year")?.value ?? "",
      set: (metadata.attributes || []).find((a: any) => a.trait_type === "Set")?.value ?? "",
      language: (metadata.attributes || []).find((a: any) => a.trait_type === "Language")?.value ?? "",
      cardNumber: (metadata.attributes || []).find((a: any) => a.trait_type === "Card Number")?.value ?? "",
      metadataUri: uri,
      attributes: metadata.attributes || [],
    };
    metadataCache.set(tokenIdStr, card);
    return card;
  } catch (e) {
    metadataCache.set(tokenIdStr, null);
    return null;
  }
}

// ══════════════════════════════════════════════════
// PRE-WARM CARD POOL — background fetch on startup
// ══════════════════════════════════════════════════
const cardPool: any[] = [];
const POOL_TARGET = 30;
let poolWarming = false;
const usedTokenIds = new Set<string>();

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
    while (cardPool.length < POOL_TARGET) {
      try {
        const card = await fetchOneRandomCard(totalSupply);
        if (card && !usedTokenIds.has((card as any).tokenId)) {
          cardPool.push(card);
          if (cardPool.length % 5 === 0) console.log(`[Renaiss] Pool: ${cardPool.length}/${POOL_TARGET} cards ready`);
        }
      } catch {}
      await sleep(100);
    }
    console.log(`[Renaiss] Pool warm-up complete: ${cardPool.length} cards ready`);
  } catch (e) {
    console.error("[Renaiss] Pool warm-up error:", e instanceof Error ? e.message : e);
  }
  poolWarming = false;
}

function scheduleRefill() {
  if (cardPool.length < POOL_TARGET && !poolWarming) setTimeout(() => warmPool(), 500);
}

setTimeout(() => warmPool(), 5000);

// ══════════════════════════════════════════════════════════
// API: /wallet-cards — FAST wallet card loader (<3s target)
// Dual-path: tRPC cache (instant) + tokenURI RPC fallback (ensures ALL cards shown)
// ══════════════════════════════════════════════════════════

// Background metadata fetch cache (for tokens not in tRPC)
const tokenUriMetaCache = new Map<string, any>();

async function fetchMissingCardByTokenURI(decimal: string): Promise<any | null> {
  if (tokenUriMetaCache.has(decimal)) return tokenUriMetaCache.get(decimal);
  try {
    const tid = "0x" + BigInt(decimal).toString(16);
    const uriResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.tokenURI, tid));
    const uri = decodeString(uriResult);
    if (!uri) return null;
    const fixedUri = uri.replace("https://renaiss.xyz/", "https://www.renaiss.xyz/");
    const res = await axios.get(fixedUri, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    });
    const meta = res.data;
    const rawAttrs: Array<{ trait_type: string; value: string }> = meta.attributes || [];
    const getA = (key: string) => rawAttrs.find(a => a.trait_type?.toLowerCase() === key.toLowerCase())?.value ?? "";
    const card = {
      tokenId: decimal,
      tokenIdHex: tid,
      renaisUrl: `https://renaiss.xyz/card/${decimal}`,
      fmv: null,
      loading: false,
      metadata: {
        name: meta.name || "Unknown Card",
        image: meta.image || "",
        animation_url: meta.animation_url || null,
        attributes: rawAttrs,
        grader: getA("Grader"),
        serial: getA("Serial"),
        grade: getA("Grade"),
        year: getA("Year"),
        set: getA("Set"),
        language: getA("Language"),
        cardNumber: getA("Card Number"),
        setName: "",
        pokemonName: "",
        token_info: {
          token_id: decimal,
          contract_address: RENAISS_NFT_CONTRACT,
          chain: "BSC Mainnet",
        },
      },
    };
    tokenUriMetaCache.set(decimal, card);
    return card;
  } catch (e) {
    console.error(`[Renaiss] tokenURI fallback error for ${decimal.slice(0,10)}:`, e instanceof Error ? e.message : e);
    tokenUriMetaCache.set(decimal, null);
    return null;
  }
}

router.get("/wallet-cards/:wallet", async (req, res) => {
  const startTime = Date.now();
  try {
    const { wallet } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }
    const addr = wallet.toLowerCase();

    // Step 1: Get balance
    const balResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.balanceOf, addr));
    const balance = Number(decodeUint256(balResult));

    if (balance === 0) {
      res.json({ cards: [], balance: 0, totalFMV: 0, elapsed: Date.now() - startTime });
      return;
    }

    // Step 2: Batch get ALL tokenIds (chunked, rate-limit safe)
    const tokenIdCalls = Array.from({ length: balance }, (_, i) => ({
      to: RENAISS_NFT_CONTRACT,
      data: encodeFn(SEL.tokenOfOwnerByIndex, addr, "0x" + i.toString(16)),
    }));
    const tokenIdResults = await batchEthCall(tokenIdCalls);

    // Parse token IDs
    const tokenDecimals: string[] = [];
    for (const hex of tokenIdResults) {
      if (hex && hex !== "0x") {
        try { tokenDecimals.push(BigInt(hex).toString()); } catch {}
      }
    }

    // Step 3: Look up from tRPC global cache (instant, O(1))
    const cards: any[] = [];
    const missingDecimals: string[] = [];

    for (const decimal of tokenDecimals) {
      const cached = globalCardCache.get(decimal);
      if (cached) {
        cards.push({
          tokenId: cached.tokenId,
          tokenIdHex: "0x" + BigInt(decimal).toString(16),
          renaisUrl: cached.renaisUrl,
          fmv: cached.fmv,
          loading: false,
          metadata: {
            name: cached.metadata.name,
            image: cached.metadata.image,
            animation_url: cached.metadata.animationUrl,
            attributes: cached.metadata.attributes,
            grader: cached.metadata.grader,
            serial: cached.metadata.serial,
            grade: cached.metadata.grade,
            year: cached.metadata.year,
            set: cached.metadata.set,
            language: cached.metadata.language,
            cardNumber: cached.metadata.cardNumber,
            setName: cached.metadata.setName,
            pokemonName: cached.metadata.pokemonName,
            token_info: {
              token_id: decimal,
              contract_address: RENAISS_NFT_CONTRACT,
              chain: "BSC Mainnet",
            },
          },
        });
      } else {
        // Check tokenURI cache first
        const uriCached = tokenUriMetaCache.get(decimal);
        if (uriCached) {
          cards.push(uriCached);
        } else {
          // Add placeholder — will be fetched via tokenURI fallback
          missingDecimals.push(decimal);
          cards.push({
            tokenId: decimal,
            tokenIdHex: "0x" + BigInt(decimal).toString(16),
            renaisUrl: `https://renaiss.xyz/card/${decimal}`,
            fmv: null,
            loading: true, // Frontend shows skeleton
            metadata: {
              name: "",
              image: "",
              animation_url: null,
              attributes: [],
              grader: "", serial: "", grade: "", year: "",
              set: "", language: "", cardNumber: "",
              setName: "", pokemonName: "",
              token_info: {
                token_id: decimal,
                contract_address: RENAISS_NFT_CONTRACT,
                chain: "BSC Mainnet",
              },
            },
          });
        }
      }
    }

    // Step 4: Calculate total FMV (from cached cards)
    let totalFMV = 0;
    for (const card of cards) {
      if (card.fmv != null) totalFMV += card.fmv;
    }

    const elapsed = Date.now() - startTime;
    const cacheHit = cards.length - missingDecimals.length;
    console.log(`[Renaiss] wallet-cards ${addr.slice(0,10)}...: ${cards.length}/${balance} cards (${cacheHit} cached, ${missingDecimals.length} loading), totalFMV=$${totalFMV.toFixed(0)}, ${elapsed}ms`);

    // Return immediately with cached + placeholder cards
    res.json({ cards, balance, totalFMV, elapsed, pendingTokenIds: missingDecimals });

    // Background: fetch missing cards via tokenURI (updates tokenUriMetaCache for next request)
    if (missingDecimals.length > 0) {
      console.log(`[Renaiss] Background fetching ${missingDecimals.length} missing cards via tokenURI...`);
      pMap(missingDecimals, (decimal) => fetchMissingCardByTokenURI(decimal), 8).catch(() => {});
    }
  } catch (e) {
    console.error("[Renaiss] wallet-cards error:", e instanceof Error ? e.message : e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// ── API: /wallet-cards-pending — fetch metadata for pending (loading) cards ──
// Frontend polls this for cards that were 'loading: true'
router.post("/wallet-cards-pending", express.json(), async (req, res) => {
  try {
    const { tokenIds } = req.body as { tokenIds: string[] };
    if (!tokenIds?.length) { res.json({ cards: [] }); return; }
    const results: any[] = [];
    const stillPending: string[] = [];
    for (const decimal of tokenIds) {
      const cached = tokenUriMetaCache.get(decimal);
      if (cached) {
        results.push(cached);
      } else {
        stillPending.push(decimal);
      }
    }
    // For any still not ready, fetch now with concurrency 8
    if (stillPending.length > 0) {
      const fetched = await pMap(stillPending, (d) => fetchMissingCardByTokenURI(d), 8);
      for (const card of fetched) {
        if (card) results.push(card);
      }
    }
    res.json({ cards: results });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

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
    if (balance === 0) { res.json({ card: null, balance: 0, message: "No Renaiss cards in this wallet" }); return; }
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
        if (card && (card as any).image) { (card as any).owner = wallet; res.json({ card, balance }); return; }
      } catch {}
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
    if (cardPool.length > 0) {
      const card = cardPool.shift()!;
      usedTokenIds.add((card as any).tokenId);
      scheduleRefill();
      res.json({ card });
      return;
    }
    const totalSupply = await ensureTotalSupply();
    if (totalSupply === 0) { res.json({ card: null }); return; }
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const card = await fetchOneRandomCard(totalSupply);
        if (card) { res.json({ card }); return; }
      } catch {}
    }
    res.json({ card: null });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// ── API: Batch random cards ──
router.get("/batch-random", async (req, res) => {
  try {
    const count = Math.min(parseInt(String(req.query.count ?? "5")), 20);
    const cards: any[] = [];
    while (cardPool.length > 0 && cards.length < count) {
      const card = cardPool.shift()!;
      usedTokenIds.add((card as any).tokenId);
      cards.push(card);
    }
    if (cards.length < count) {
      const totalSupply = await ensureTotalSupply();
      if (totalSupply > 0) {
        await pMap(Array.from({ length: count - cards.length }), async () => {
          const card = await fetchOneRandomCard(totalSupply);
          if (card) cards.push(card);
        }, 5);
      }
    }
    scheduleRefill();
    res.json({ cards });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// ── API: Batch pick cards from multiple wallets ──
router.post("/batch-pick", express.json(), async (req, res) => {
  try {
    const { wallets } = req.body as { wallets: string[] };
    if (!wallets?.length) { res.json({ results: [] }); return; }
    const data = await pMap(wallets.slice(0, 20), async (wallet) => {
      try {
        const addr = "0x" + wallet.toLowerCase().replace("0x", "");
        const balResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.balanceOf, addr));
        const balance = Number(decodeUint256(balResult));
        if (balance === 0) return { wallet, card: null, balance: 0 };
        const idx = Math.floor(Math.random() * balance);
        const tokenResult = await ethCall(RENAISS_NFT_CONTRACT, encodeFn(SEL.tokenOfOwnerByIndex, addr, "0x" + idx.toString(16)));
        const tokenId = decodeUint256(tokenResult);
        const card = await fetchCardMetadata(tokenId);
        return { wallet, card, balance };
      } catch {
        return { wallet, card: null, balance: 0 };
      }
    }, 5);
    res.json({ results: data });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

export default router;

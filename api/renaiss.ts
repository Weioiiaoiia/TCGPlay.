import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── BSC RPC Config ──
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

// ── ABI helpers ──
function padHex(val: string): string {
  return val.replace("0x", "").padStart(64, "0");
}
function encodeFn(selector: string, ...args: string[]): string {
  return selector + args.map((a) => padHex(a)).join("");
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
    const length = Number(
      BigInt("0x" + hex.slice(startByte, startByte + 64))
    );
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
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now() + Math.floor(Math.random() * 100000),
          method: "eth_call",
          params: [{ to, data }, "latest"],
        }),
      });
      const json = await res.json();
      if (json.error || !json.result || json.result === "0x") {
        continue;
      }
      return json.result;
    } catch {
      if (attempt === BSC_RPC_URLS.length - 1)
        throw new Error("All RPCs failed");
    }
  }
  throw new Error("All RPC attempts exhausted");
}

interface CardAttribute {
  trait_type: string;
  value: string;
}
interface CardMetadata {
  name: string;
  description: string;
  image: string;
  attributes: CardAttribute[];
}

function getAttr(attrs: CardAttribute[], key: string): string {
  return (
    attrs?.find((a) => a.trait_type.toLowerCase() === key.toLowerCase())
      ?.value ?? ""
  );
}

async function fetchCardMetadata(tokenId: bigint) {
  try {
    const tid = "0x" + tokenId.toString(16);
    const uriResult = await ethCall(
      RENAISS_NFT_CONTRACT,
      encodeFn(SEL.tokenURI, tid)
    );
    const uri = decodeString(uriResult);
    if (!uri) return null;

    const fixedUri = uri.replace(
      "https://renaiss.xyz/",
      "https://www.renaiss.xyz/"
    );
    const res = await fetch(fixedUri, {
      headers: { "User-Agent": "TCGPlay/1.0" },
    });
    const metadata = (await res.json()) as CardMetadata;

    const card = {
      tokenId: tokenId.toString(),
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

    return card;
  } catch (e) {
    console.error(
      `[Renaiss] fetchCardMetadata error for ${tokenId.toString()}:`,
      e instanceof Error ? e.message : e
    );
    return null;
  }
}

async function ensureTotalSupply(): Promise<number> {
  const result = await ethCall(RENAISS_NFT_CONTRACT, SEL.totalSupply);
  return Number(decodeUint256(result));
}

async function fetchOneRandomCard(totalSupply: number): Promise<any> {
  try {
    const randomIndex = Math.floor(Math.random() * totalSupply);
    const idxHex = "0x" + randomIndex.toString(16);
    const tokenResult = await ethCall(
      RENAISS_NFT_CONTRACT,
      encodeFn(SEL.tokenByIndex, idxHex)
    );
    const tokenId = decodeUint256(tokenResult);
    const card = await fetchCardMetadata(tokenId);
    if (card && (card as any).image) {
      (card as any).owner = "Chain";
      return card;
    }
  } catch {}
  return null;
}

async function pMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

// ── FMV fetcher ──
async function fetchFMVFromRenaiss(tokenIdDecimal: string): Promise<number | null> {
  try {
    const url = `https://www.renaiss.xyz/card/${tokenIdDecimal}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const text = await res.text();
    // fmvPriceInUSD is in escaped JSON within the page HTML (value in cents)
    const match = text.match(/fmvPriceInUSD.{1,10}?(\d{3,})/);
    if (match) {
      const fmvCents = parseInt(match[1], 10);
      return fmvCents / 100;
    }
    return null;
  } catch (e) {
    console.error(`[Renaiss] FMV fetch error for ${tokenIdDecimal}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

// ── Route handler ──
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Parse the sub-path from the URL: /api/renaiss/xxx
  const url = req.url || "";
  const subPath = url.replace(/^\/api\/renaiss/, "").split("?")[0];

  try {
    // GET /api/renaiss/balance/:wallet
    const balanceMatch = subPath.match(/^\/balance\/(.+)$/);
    if (balanceMatch && req.method === "GET") {
      const wallet = balanceMatch[1];
      const addr = "0x" + wallet.toLowerCase().replace("0x", "");
      const result = await ethCall(
        RENAISS_NFT_CONTRACT,
        encodeFn(SEL.balanceOf, addr)
      );
      return res.status(200).json({ balance: Number(decodeUint256(result)) });
    }

    // GET /api/renaiss/pick/:wallet
    const pickMatch = subPath.match(/^\/pick\/(.+)$/);
    if (pickMatch && req.method === "GET") {
      const wallet = pickMatch[1];
      const addr = "0x" + wallet.toLowerCase().replace("0x", "");
      const balResult = await ethCall(
        RENAISS_NFT_CONTRACT,
        encodeFn(SEL.balanceOf, addr)
      );
      const balance = Number(decodeUint256(balResult));

      if (balance === 0) {
        return res.status(200).json({
          card: null,
          balance: 0,
          message: "No Renaiss cards in this wallet",
        });
      }

      const tried = new Set<number>();
      for (let attempt = 0; attempt < Math.min(3, balance); attempt++) {
        let idx = Math.floor(Math.random() * balance);
        while (tried.has(idx) && tried.size < balance)
          idx = (idx + 1) % balance;
        tried.add(idx);
        try {
          const idxHex = "0x" + idx.toString(16);
          const tokenResult = await ethCall(
            RENAISS_NFT_CONTRACT,
            encodeFn(SEL.tokenOfOwnerByIndex, addr, idxHex)
          );
          const tokenId = decodeUint256(tokenResult);
          const card = await fetchCardMetadata(tokenId);
          if (card && (card as any).image) {
            (card as any).owner = wallet;
            return res.status(200).json({ card, balance });
          }
        } catch {}
      }

      try {
        const tokenResult = await ethCall(
          RENAISS_NFT_CONTRACT,
          encodeFn(SEL.tokenOfOwnerByIndex, addr, "0x0")
        );
        const tokenId = decodeUint256(tokenResult);
        const card = await fetchCardMetadata(tokenId);
        if (card) {
          (card as any).owner = wallet;
          return res.status(200).json({ card, balance });
        }
      } catch {}

      return res
        .status(200)
        .json({ card: null, balance, message: "Could not load card metadata" });
    }

    // GET /api/renaiss/random
    if (subPath === "/random" && req.method === "GET") {
      const totalSupply = await ensureTotalSupply();
      if (totalSupply === 0) {
        return res.status(200).json({ card: null });
      }

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const card = await fetchOneRandomCard(totalSupply);
          if (card) {
            try {
              const tid = (card as any).tokenIdHex;
              const ownerResult = await ethCall(
                RENAISS_NFT_CONTRACT,
                encodeFn(SEL.ownerOf, tid)
              );
              (card as any).owner = decodeAddress(ownerResult);
            } catch {
              (card as any).owner = "Unknown";
            }
            return res.status(200).json({ card });
          }
        } catch {
          continue;
        }
      }
      return res.status(200).json({ card: null });
    }

    // GET /api/renaiss/batch-random?count=N
    if (subPath === "/batch-random" && req.method === "GET") {
      const count = Math.min(
        20,
        Math.max(1, parseInt(req.query.count as string) || 5)
      );
      const totalSupply = await ensureTotalSupply();
      const cards: any[] = [];

      if (totalSupply > 0) {
        const indices: number[] = [];
        const tried = new Set<number>();
        while (indices.length < count + 5 && tried.size < totalSupply) {
          const idx = Math.floor(Math.random() * totalSupply);
          if (!tried.has(idx)) {
            tried.add(idx);
            indices.push(idx);
          }
        }
        const liveResults = await pMap(
          indices,
          () => fetchOneRandomCard(totalSupply),
          3
        );
        const usedIds = new Set<string>();
        for (const card of liveResults) {
          if (
            card &&
            cards.length < count &&
            !usedIds.has((card as any).tokenId)
          ) {
            usedIds.add((card as any).tokenId);
            cards.push(card);
          }
        }
      }

      return res.status(200).json({ cards });
    }

    // POST /api/renaiss/batch-pick
    if (subPath === "/batch-pick" && req.method === "POST") {
      const wallets: string[] = req.body?.wallets || [];
      if (!wallets.length) {
        return res.status(200).json({ results: [] });
      }

      const pickOne = async (
        wallet: string
      ): Promise<{ wallet: string; card: any; balance: number }> => {
        try {
          const addr = "0x" + wallet.toLowerCase().replace("0x", "");
          const balResult = await ethCall(
            RENAISS_NFT_CONTRACT,
            encodeFn(SEL.balanceOf, addr)
          );
          const balance = Number(decodeUint256(balResult));
          if (balance === 0) return { wallet, card: null, balance: 0 };

          const tried = new Set<number>();
          for (let attempt = 0; attempt < Math.min(3, balance); attempt++) {
            let idx = Math.floor(Math.random() * balance);
            while (tried.has(idx) && tried.size < balance)
              idx = (idx + 1) % balance;
            tried.add(idx);
            try {
              const idxHex = "0x" + idx.toString(16);
              const tokenResult = await ethCall(
                RENAISS_NFT_CONTRACT,
                encodeFn(SEL.tokenOfOwnerByIndex, addr, idxHex)
              );
              const tokenId = decodeUint256(tokenResult);
              const card = await fetchCardMetadata(tokenId);
              if (card && (card as any).image) {
                (card as any).owner = wallet;
                return { wallet, card, balance };
              }
            } catch {}
          }
          try {
            const tokenResult = await ethCall(
              RENAISS_NFT_CONTRACT,
              encodeFn(SEL.tokenOfOwnerByIndex, addr, "0x0")
            );
            const tokenId = decodeUint256(tokenResult);
            const card = await fetchCardMetadata(tokenId);
            if (card) {
              (card as any).owner = wallet;
              return { wallet, card, balance };
            }
          } catch {}
          return { wallet, card: null, balance };
        } catch {
          return { wallet, card: null, balance: 0 };
        }
      };

      const data = await pMap(wallets, pickOne, 3);
      return res.status(200).json({ results: data });
    }

    // GET /api/renaiss/fmv/:tokenId
    const fmvMatch = subPath.match(/^\/fmv\/(.+)$/);
    if (fmvMatch && req.method === "GET") {
      const tokenId = fmvMatch[1];
      const fmv = await fetchFMVFromRenaiss(tokenId);
      return res.status(200).json({ tokenId, fmv });
    }

    // POST /api/renaiss/batch-fmv
    if (subPath === "/batch-fmv" && req.method === "POST") {
      const tokenIds: string[] = req.body?.tokenIds || [];
      if (!tokenIds.length) {
        return res.status(200).json({ results: {} });
      }
      const limited = tokenIds.slice(0, 20);
      const results: Record<string, number | null> = {};
      await pMap(
        limited,
        async (tokenId) => {
          const fmv = await fetchFMVFromRenaiss(tokenId);
          results[tokenId] = fmv;
        },
        3
      );
      return res.status(200).json({ results });
    }

    // GET /api/renaiss/pool-status
    if (subPath === "/pool-status" && req.method === "GET") {
      return res.status(200).json({
        poolSize: 0,
        poolTarget: 0,
        warming: false,
        cacheSize: 0,
        usedCount: 0,
        note: "Serverless mode - no persistent pool",
      });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (e) {
    return res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

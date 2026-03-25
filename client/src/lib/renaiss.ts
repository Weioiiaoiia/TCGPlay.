/**
 * Renaiss Protocol - On-chain NFT Data Fetcher (Optimized v2)
 * Uses batch JSON-RPC, parallel fetching, aggressive timeouts, and local cache
 * Target: all cards loaded within 4 seconds
 */

const BSC_RPC_URL = "/api/bsc-rpc";
const METADATA_BASE = "/api/renaiss-metadata";
const RENAISS_CONTRACT = "0xF8646A3Ca093e97Bb404c3b25e675C0394DD5b30";

const SELECTORS = {
  balanceOf: "0x70a08231",
  tokenOfOwnerByIndex: "0x2f745c59",
  tokenURI: "0xc87b56dd",
};

export interface RenaisCardAttribute {
  trait_type: string;
  value: string;
}

export interface RenaisCardMetadata {
  collection_name: string;
  name: string;
  description: string;
  external_url: string;
  image: string;
  animation_url: string | null;
  video: string | null;
  token_info: {
    token_id: string;
    contract_address: string;
    chain: string;
    proof_of_integrity: {
      fingerprint: string;
      salt: string;
      hex_proof: string;
    };
  };
  item_info: {
    original_owner: {
      username: string;
      address: string;
    };
    asset_pictures: string[];
  };
  attributes: RenaisCardAttribute[];
  product_type: string;
}

export interface RenaisCard {
  tokenId: string;
  tokenIdHex: string;
  metadata: RenaisCardMetadata;
  renaisUrl: string;
}

/* ===== Encoding helpers ===== */

function padAddress(address: string): string {
  return address.toLowerCase().replace("0x", "").padStart(64, "0");
}

function padUint256(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function hexToDecimal(hex: string): string {
  const cleanHex = hex.replace("0x", "");
  let result = "0";
  for (let i = 0; i < cleanHex.length; i++) {
    const digit = parseInt(cleanHex[i], 16);
    result = addStrings(multiplyString(result, 16), digit.toString());
  }
  return result;
}

function multiplyString(num: string, multiplier: number): string {
  let carry = 0;
  let result = "";
  for (let i = num.length - 1; i >= 0; i--) {
    const product = parseInt(num[i]) * multiplier + carry;
    result = (product % 10) + result;
    carry = Math.floor(product / 10);
  }
  while (carry > 0) {
    result = (carry % 10) + result;
    carry = Math.floor(carry / 10);
  }
  return result || "0";
}

function addStrings(a: string, b: string): string {
  let carry = 0;
  let result = "";
  let i = a.length - 1;
  let j = b.length - 1;
  while (i >= 0 || j >= 0 || carry > 0) {
    const digitA = i >= 0 ? parseInt(a[i]) : 0;
    const digitB = j >= 0 ? parseInt(b[j]) : 0;
    const sum = digitA + digitB + carry;
    result = (sum % 10) + result;
    carry = Math.floor(sum / 10);
    i--;
    j--;
  }
  return result || "0";
}

function decodeString(hexResult: string): string {
  const hex = hexResult.replace("0x", "");
  const offset = parseInt(hex.substring(0, 64), 16) * 2;
  const length = parseInt(hex.substring(offset, offset + 64), 16);
  const strData = hex.substring(offset + 64, offset + 64 + length * 2);
  let result = "";
  for (let i = 0; i < strData.length; i += 2) {
    result += String.fromCharCode(parseInt(strData.substring(i, i + 2), 16));
  }
  return result;
}

/* ===== Fetch with timeout helper ===== */

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 3500): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
    ),
  ]);
}

/* ===== Batch JSON-RPC: send multiple eth_call in ONE HTTP request ===== */

interface BatchCall {
  to: string;
  data: string;
}

async function batchEthCall(calls: BatchCall[]): Promise<string[]> {
  if (calls.length === 0) return [];

  const body = calls.map((c, i) => ({
    jsonrpc: "2.0",
    method: "eth_call",
    params: [{ to: c.to, data: c.data }, "latest"],
    id: i + 1,
  }));

  const response = await fetchWithTimeout(BSC_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, 3500);

  const results = await response.json();

  // Sort by id to maintain order
  const sorted = Array.isArray(results)
    ? results.sort((a: any, b: any) => a.id - b.id)
    : [results];

  return sorted.map((r: any) => {
    if (r.error) throw new Error(`RPC Error: ${r.error.message || JSON.stringify(r.error)}`);
    return r.result;
  });
}

async function singleEthCall(to: string, data: string): Promise<string> {
  const response = await fetchWithTimeout(BSC_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
      id: 1,
    }),
  }, 3000);
  const json = await response.json();
  if (json.error) throw new Error(`RPC Error: ${json.error.message || JSON.stringify(json.error)}`);
  return json.result;
}

/* ===== Public API ===== */

export function getRenaisCardUrl(tokenIdDecimal: string): string {
  return `https://renaiss.xyz/card/${tokenIdDecimal}`;
}

export function getCardAttribute(
  metadata: RenaisCardMetadata,
  traitType: string
): string | undefined {
  return metadata.attributes.find(
    (a) => a.trait_type.toLowerCase() === traitType.toLowerCase()
  )?.value;
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Fetch all Renaiss cards for a wallet - OPTIMIZED v2 for speed
 *
 * Strategy:
 * 1. Single RPC call: balanceOf (with timeout)
 * 2. ONE batch RPC call: all tokenOfOwnerByIndex calls at once
 * 3. ONE batch RPC call: all tokenURI calls at once
 * 4. Promise.allSettled: fetch all metadata JSON in parallel (with individual timeouts)
 *
 * Total: ~3 HTTP requests to RPC + N parallel metadata fetches
 * Target: < 4 seconds for any reasonable collection size
 */
export async function fetchWalletCards(
  walletAddress: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<RenaisCard[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error("Invalid wallet address format");
  }

  // Step 1: Get balance (single call with tight timeout)
  const balData = SELECTORS.balanceOf + padAddress(walletAddress);
  const balResult = await singleEthCall(RENAISS_CONTRACT, balData);
  const balance = parseInt(balResult, 16);

  if (balance === 0) return [];

  onProgress?.(0, balance);

  // Step 2: Batch get ALL token IDs in one request
  const tokenIdCalls: BatchCall[] = [];
  for (let i = 0; i < balance; i++) {
    tokenIdCalls.push({
      to: RENAISS_CONTRACT,
      data: SELECTORS.tokenOfOwnerByIndex + padAddress(walletAddress) + padUint256(i),
    });
  }
  const tokenIdResults = await batchEthCall(tokenIdCalls);

  const tokenIds = tokenIdResults.map((hex) => ({
    hex,
    decimal: hexToDecimal(hex),
  }));

  // Step 3: Batch get ALL tokenURIs in one request
  const uriCalls: BatchCall[] = tokenIds.map((t) => ({
    to: RENAISS_CONTRACT,
    data: SELECTORS.tokenURI + t.hex.replace("0x", ""),
  }));
  const uriResults = await batchEthCall(uriCalls);

  const uris = uriResults.map((r) => {
    const originalUri = decodeString(r);
    return originalUri
      .replace("https://renaiss.xyz/index/token", METADATA_BASE)
      .replace("https://www.renaiss.xyz/index/token", METADATA_BASE);
  });

  // Step 4: Fetch ALL metadata in parallel with individual timeouts
  // Use Promise.allSettled so one failure doesn't block others
  const cards: RenaisCard[] = [];
  let loadedCount = 0;

  const metadataPromises = uris.map(async (uri, i) => {
    try {
      const response = await fetchWithTimeout(uri, {}, 3500);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const metadata: RenaisCardMetadata = await response.json();

      cards.push({
        tokenId: tokenIds[i].decimal,
        tokenIdHex: tokenIds[i].hex,
        metadata,
        renaisUrl: getRenaisCardUrl(tokenIds[i].decimal),
      });
    } catch (error) {
      console.error(`Failed to fetch card ${i}:`, error);
    }
    loadedCount++;
    onProgress?.(loadedCount, balance);
  });

  await Promise.allSettled(metadataPromises);

  return cards;
}

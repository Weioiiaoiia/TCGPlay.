/**
 * Renaiss Protocol - On-chain NFT Data Fetcher
 * Fetches ERC-721 NFT data from the Renaiss contract on BNB Smart Chain
 * Uses proxy endpoints to avoid CORS issues with Renaiss metadata API
 */

// Use proxy in dev, direct in production (server handles proxy)
const BSC_RPC_URL = "/api/bsc-rpc";
const METADATA_BASE = "/api/renaiss-metadata";

const RENAISS_CONTRACT = "0xF8646A3Ca093e97Bb404c3b25e675C0394DD5b30";

// Function selectors
const SELECTORS = {
  balanceOf: "0x70a08231",           // balanceOf(address)
  tokenOfOwnerByIndex: "0x2f745c59", // tokenOfOwnerByIndex(address,uint256)
  tokenURI: "0xc87b56dd",           // tokenURI(uint256)
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
  tokenId: string;        // decimal string
  tokenIdHex: string;     // hex string with 0x prefix
  metadata: RenaisCardMetadata;
  renaisUrl: string;      // direct link to renaiss.xyz card page
}

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

function decodeUint256AsNumber(hexResult: string): number {
  return parseInt(hexResult, 16);
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

async function ethCall(to: string, data: string): Promise<string> {
  const response = await fetch(BSC_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
      id: 1,
    }),
  });

  const json = await response.json();
  
  if (json.error) {
    throw new Error(`RPC Error: ${json.error.message || JSON.stringify(json.error)}`);
  }
  
  return json.result;
}

/**
 * Get the number of Renaiss NFTs owned by an address
 */
export async function getBalance(walletAddress: string): Promise<number> {
  const data = SELECTORS.balanceOf + padAddress(walletAddress);
  const result = await ethCall(RENAISS_CONTRACT, data);
  return decodeUint256AsNumber(result);
}

/**
 * Get the token ID at a specific index for an owner
 */
export async function getTokenOfOwnerByIndex(
  walletAddress: string,
  index: number
): Promise<{ hex: string; decimal: string }> {
  const data =
    SELECTORS.tokenOfOwnerByIndex +
    padAddress(walletAddress) +
    padUint256(index);
  const result = await ethCall(RENAISS_CONTRACT, data);
  return {
    hex: result,
    decimal: hexToDecimal(result),
  };
}

/**
 * Get the metadata URI for a token, rewritten to use local proxy
 */
export async function getTokenURI(tokenIdHex: string): Promise<string> {
  const cleanHex = tokenIdHex.replace("0x", "");
  const data = SELECTORS.tokenURI + cleanHex;
  const result = await ethCall(RENAISS_CONTRACT, data);
  const originalUri = decodeString(result);
  
  // Rewrite the URI to use our proxy
  // Original: https://renaiss.xyz/index/token/bsc/CONTRACT/TOKEN_ID/metadata.json
  // Proxy:    /api/renaiss-metadata/bsc/CONTRACT/TOKEN_ID/metadata.json
  const proxyUri = originalUri
    .replace("https://renaiss.xyz/index/token", METADATA_BASE)
    .replace("https://www.renaiss.xyz/index/token", METADATA_BASE);
  
  return proxyUri;
}

/**
 * Fetch metadata JSON from a URI (using proxied URL)
 */
export async function fetchMetadata(uri: string): Promise<RenaisCardMetadata> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.status}`);
  }
  return response.json();
}

/**
 * Get the Renaiss card detail page URL (always points to real renaiss.xyz)
 */
export function getRenaisCardUrl(tokenIdDecimal: string): string {
  return `https://renaiss.xyz/card/${tokenIdDecimal}`;
}

/**
 * Fetch all Renaiss cards for a wallet address
 */
export async function fetchWalletCards(
  walletAddress: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<RenaisCard[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error("Invalid wallet address format");
  }

  // Step 1: Get balance
  const balance = await getBalance(walletAddress);
  
  if (balance === 0) {
    return [];
  }

  onProgress?.(0, balance);

  // Step 2: Get all token IDs
  const tokenIds: { hex: string; decimal: string }[] = [];
  for (let i = 0; i < balance; i++) {
    const tokenId = await getTokenOfOwnerByIndex(walletAddress, i);
    tokenIds.push(tokenId);
  }

  // Step 3: Fetch metadata for each token
  const cards: RenaisCard[] = [];
  for (let i = 0; i < tokenIds.length; i++) {
    try {
      const uri = await getTokenURI(tokenIds[i].hex);
      const metadata = await fetchMetadata(uri);
      
      cards.push({
        tokenId: tokenIds[i].decimal,
        tokenIdHex: tokenIds[i].hex,
        metadata,
        renaisUrl: getRenaisCardUrl(tokenIds[i].decimal),
      });
    } catch (error) {
      console.error(`Failed to fetch card ${i}:`, error);
    }
    
    onProgress?.(i + 1, balance);
  }

  return cards;
}

/**
 * Get a specific attribute value from card metadata
 */
export function getCardAttribute(
  metadata: RenaisCardMetadata,
  traitType: string
): string | undefined {
  return metadata.attributes.find(
    (a) => a.trait_type.toLowerCase() === traitType.toLowerCase()
  )?.value;
}

/**
 * Validate if a string is a valid Ethereum/BSC address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

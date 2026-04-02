/**
 * Renaiss Protocol - Types & Utilities
 *
 * Card data is now fetched server-side via /api/renaiss/wallet-cards/{wallet}
 * which uses tRPC cache (3270+ cards pre-loaded) + tokenURI fallback for full coverage.
 *
 * Client only needs: type definitions, address validation, attribute helpers.
 */

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
  fmv?: number | null;
  loading?: boolean;
}

/* ===== Utility Functions ===== */

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

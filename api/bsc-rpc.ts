import type { VercelRequest, VercelResponse } from "@vercel/node";

const BSC_RPC_URLS = [
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
];

let rpcIndex = 0;
function getNextRpcUrl(): string {
  const url = BSC_RPC_URLS[rpcIndex % BSC_RPC_URLS.length];
  rpcIndex++;
  return url;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  for (let attempt = 0; attempt < BSC_RPC_URLS.length; attempt++) {
    const url = getNextRpcUrl();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch {
      if (attempt === BSC_RPC_URLS.length - 1) {
        return res.status(502).json({ error: "All BSC RPCs failed" });
      }
    }
  }
}

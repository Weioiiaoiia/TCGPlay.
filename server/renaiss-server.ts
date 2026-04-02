/**
 * Standalone Renaiss proxy server for development mode.
 * Runs on port 3001 and handles:
 *   /api/renaiss/* - Renaiss metadata proxy
 *   /api/bsc-rpc   - BSC RPC proxy with chunking + rate limit handling
 * In production, these routes are served by Vercel Serverless Functions.
 */
import express from "express";
import axios from "axios";
import renaisProxy from "./renaiss-proxy";

const app = express();
app.use(express.json({ limit: "10mb" }));

// ── BSC RPC nodes (all free, no API key required) ──
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

// Max calls per chunk to avoid rate limits
const CHUNK_SIZE = 8;
const CHUNK_DELAY_MS = 120;

let rpcIndex = 0;
function getNextRpcUrl(): string {
  const url = BSC_RPC_URLS[rpcIndex % BSC_RPC_URLS.length];
  rpcIndex++;
  return url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendChunk(chunk: any[]): Promise<any[]> {
  const errors: string[] = [];
  for (let attempt = 0; attempt < BSC_RPC_URLS.length; attempt++) {
    const url = getNextRpcUrl();
    try {
      const res = await axios.post(url, chunk, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });
      const results: any[] = Array.isArray(res.data) ? res.data : [res.data];

      // Detect rate limit or auth errors - skip this node
      const hasBlockingError = results.some(
        (r: any) =>
          r.error &&
          (String(r.error.message || "").toLowerCase().includes("rate limit") ||
            String(r.error.message || "").toLowerCase().includes("too many") ||
            String(r.error.message || "").toLowerCase().includes("unauthorized") ||
            String(r.error.message || "").toLowerCase().includes("authenticate") ||
            String(r.error.message || "").toLowerCase().includes("api key") ||
            r.error.code === -32005 ||
            r.error.code === 401 ||
            r.error.code === 429)
      );
      if (hasBlockingError) {
        errors.push(`${url}: blocked (rate limit or auth)`);
        await sleep(200);
        continue;
      }
      return results;
    } catch (e: any) {
      errors.push(`${url}: ${e.message}`);
    }
  }
  throw new Error(`All BSC RPCs failed: ${errors.slice(0, 3).join("; ")}`);
}

// ── /api/bsc-rpc handler ──
app.post("/api/bsc-rpc", async (req, res) => {
  const body = req.body;

  // Single request
  if (!Array.isArray(body)) {
    try {
      const results = await sendChunk([body]);
      res.json(results[0]);
    } catch (e: any) {
      res.status(502).json({ error: e.message });
    }
    return;
  }

  // Empty batch
  if (body.length === 0) {
    res.json([]);
    return;
  }

  // Chunked batch
  try {
    const allResults: any[] = [];
    for (let i = 0; i < body.length; i += CHUNK_SIZE) {
      const chunk = body.slice(i, i + CHUNK_SIZE);
      const chunkResults = await sendChunk(chunk);
      allResults.push(...chunkResults);
      if (i + CHUNK_SIZE < body.length) {
        await sleep(CHUNK_DELAY_MS);
      }
    }
    // Restore original order by id
    allResults.sort((a: any, b: any) => (a.id ?? 0) - (b.id ?? 0));
    res.json(allResults);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// ── /api/renaiss/* handler ──
app.use("/api/renaiss", renaisProxy);

const port = 3001;
app.listen(port, () => {
  console.log(`[Renaiss Proxy] Running on http://localhost:${port}`);
  console.log(`  /api/bsc-rpc  - BSC RPC proxy (chunked, rate-limit safe)`);
  console.log(`  /api/renaiss  - Renaiss metadata proxy`);
});

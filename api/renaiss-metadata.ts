import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Rewrite: /api/renaiss-metadata/... -> https://www.renaiss.xyz/index/token/...
    const url = req.url || "";
    const pathAfterPrefix = url.replace(/^\/api\/renaiss-metadata/, "");
    const targetUrl = `https://www.renaiss.xyz/index/token${pathAfterPrefix}`;

    const response = await fetch(targetUrl, {
      method: req.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TCGPlay/1.0",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
    }
    const text = await response.text();
    if (!text || text.trim() === "") {
      return res.status(502).json({ error: "Empty response from upstream" });
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Invalid JSON from upstream" });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e instanceof Error ? e.message : "Proxy error" });
  }
}

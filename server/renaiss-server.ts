/**
 * Standalone Renaiss proxy server for development mode.
 * Runs on port 3001 and handles /api/renaiss/* routes.
 * In production, these routes are served by the main server/index.ts.
 */
import express from "express";
import renaisProxy from "./renaiss-proxy";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use("/api/renaiss", renaisProxy);

const port = 3001;
app.listen(port, () => {
  console.log(`[Renaiss Proxy] Running on http://localhost:${port}/api/renaiss`);
});

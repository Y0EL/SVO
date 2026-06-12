import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express, Request, Response } from "express";
import { createSvoMcpServer } from "./mcp.js";
import { createSeedStore } from "./seed.js";
import type { SvoStore } from "./types.js";

export function createApp(store: SvoStore = createSeedStore()): Express {
  const flyHost = process.env.FLY_APP_NAME ? `${process.env.FLY_APP_NAME}.fly.dev` : "svo-mcp.fly.dev";
  const allowedHosts = (process.env.ALLOWED_HOSTS ?? `127.0.0.1,localhost,${flyHost}`)
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: "svo-mcp",
      mode: "synthetic",
      timestamp: new Date().toISOString()
    });
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createSvoMcpServer(store);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      console.error("Error handling MCP request", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });

  app.get("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null
    });
  });

  app.delete("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null
    });
  });

  return app;
}

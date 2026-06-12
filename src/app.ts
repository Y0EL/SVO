import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express, Request, Response } from "express";
import { createSvoMcpServer } from "./mcp.js";
import { createSeedStore } from "./seed.js";
import type { SvoStore } from "./types.js";

export function createApp(store: SvoStore = createSeedStore()): Express {
  const app = createMcpExpressApp({ host: "0.0.0.0" });

  app.get("/", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: "svo-mcp",
      message: "SVO-MCP is running. Use /health for health checks and /mcp for MCP.",
      endpoints: {
        health: "/health",
        mcp: "/mcp"
      }
    });
  });

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

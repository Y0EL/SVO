import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import {
  adsGetPerformanceSummary,
  analyticsCompareProducts,
  analyticsCompareScripts,
  analyticsExplainCampaignPerformance,
  analyticsFindHiddenGems,
  catalogLookupProduct,
  ordersCreateDraftOrder,
  ordersGetSalesLog,
  patternsGetNetworkInsights,
  whatsappDraftReply,
  whatsappGetRecentMessages,
  whatsappSendMessage
} from "./handlers.js";
import type { SvoStore } from "./types.js";

const jsonOutput = {
  result: z.any().optional()
};

function asToolResult(structuredContent: Record<string, unknown>) {
  return {
    structuredContent,
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }]
  };
}

export function createSvoMcpServer(store: SvoStore) {
  const server = new McpServer(
    {
      name: "svo-mcp",
      version: "0.1.0"
    },
    {
      instructions:
        "SVO-MCP exposes synthetic SVO business systems for PRD validation. Scope raw chats, orders, and ads by distributor_id. Return only anonymized aggregate network insights across distributors. Do not claim real external sends; write tools mutate dummy state only."
    }
  );

  server.registerTool(
    "catalog_lookup_product",
    {
      title: "Look up product catalog",
      description:
        "Find SVO product information, price, stock, approved claims, forbidden claims, and positioning guidance.",
      inputSchema: {
        query: z.string().min(1).describe("Product id, SKU, name, or category search text."),
        distributor_id: z.string().optional().describe("Optional distributor id for access validation.")
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: catalogLookupProduct(store, input) })
  );

  server.registerTool(
    "whatsapp_get_recent_messages",
    {
      title: "Get recent WhatsApp messages",
      description: "Read recent synthetic WhatsApp messages for one distributor and optional customer.",
      inputSchema: {
        distributor_id: z.string().min(1),
        customer_id: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional()
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: whatsappGetRecentMessages(store, input) })
  );

  server.registerTool(
    "whatsapp_draft_reply",
    {
      title: "Draft WhatsApp reply",
      description:
        "Draft a Bahasa Indonesia reply using catalog-approved claims and return risk flags for unsafe claims.",
      inputSchema: {
        distributor_id: z.string().min(1),
        customer_id: z.string().min(1),
        product_id: z.string().optional(),
        message_context: z.string().optional(),
        tone: z.enum(["friendly", "concise", "consultative"]).optional(),
        language: z.enum(["id", "en"]).optional()
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: whatsappDraftReply(store, input) })
  );

  server.registerTool(
    "whatsapp_send_message",
    {
      title: "Send WhatsApp message to dummy store",
      description:
        "Simulate sending a WhatsApp message by appending it to the synthetic conversation store. No real WhatsApp API is called.",
      inputSchema: {
        distributor_id: z.string().min(1),
        customer_id: z.string().min(1),
        message: z.string().min(1),
        idempotency_key: z.string().min(8)
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false }
    },
    async (input) => asToolResult({ result: whatsappSendMessage(store, input) })
  );

  server.registerTool(
    "orders_create_draft_order",
    {
      title: "Create draft order in dummy store",
      description:
        "Create a synthetic draft order for a distributor's customer. This mutates only the dummy store.",
      inputSchema: {
        distributor_id: z.string().min(1),
        customer_id: z.string().min(1),
        items: z
          .array(
            z.object({
              product_id: z.string().min(1),
              quantity: z.number().int().min(1)
            })
          )
          .min(1),
        shipping_city: z.string().optional(),
        notes: z.string().optional(),
        idempotency_key: z.string().min(8)
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false }
    },
    async (input) => asToolResult({ result: ordersCreateDraftOrder(store, input) })
  );

  server.registerTool(
    "orders_get_sales_log",
    {
      title: "Get distributor sales log",
      description: "Read synthetic order/sales log summaries scoped to one distributor.",
      inputSchema: {
        distributor_id: z.string().min(1),
        product_id: z.string().optional(),
        date_from: z.string().optional(),
        date_to: z.string().optional()
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: ordersGetSalesLog(store, input) })
  );

  server.registerTool(
    "ads_get_performance_summary",
    {
      title: "Get Meta Ads performance summary",
      description: "Read synthetic Meta Ads performance scoped to one distributor.",
      inputSchema: {
        distributor_id: z.string().min(1),
        campaign_id: z.string().optional(),
        date_from: z.string().optional(),
        date_to: z.string().optional()
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: adsGetPerformanceSummary(store, input) })
  );

  server.registerTool(
    "patterns_get_network_insights",
    {
      title: "Get anonymized network insights",
      description:
        "Return aggregate winning hooks, objections, and CTAs without exposing raw distributor creative, chats, or customer data.",
      inputSchema: {
        product_id: z.string().optional(),
        category: z.string().optional(),
        min_confidence: z.enum(["low", "medium", "high"]).optional()
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: patternsGetNetworkInsights(store, input) })
  );

  server.registerTool(
    "analytics_compare_products",
    {
      title: "Compare product performance",
      description:
        "Explain why one product is preferred over another using synthetic demand, conversion, revenue, ROAS, repeat orders, and objections.",
      inputSchema: {
        product_ids: z.array(z.string().min(1)).min(2),
        distributor_id: z.string().optional(),
        segment: z.string().optional(),
        date_from: z.string().optional(),
        date_to: z.string().optional()
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: analyticsCompareProducts(store, input) })
  );

  server.registerTool(
    "analytics_compare_scripts",
    {
      title: "Compare creative or WhatsApp scripts",
      description:
        "Explain why one script gets different engagement or conversion than another by hook, CTA, tone, stage, segment, and claim risk.",
      inputSchema: {
        script_ids: z.array(z.string().min(1)).min(2),
        product_id: z.string().optional(),
        channel: z.enum(["meta_ads", "whatsapp"]).optional(),
        lead_stage: z.string().optional(),
        segment: z.string().optional()
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: analyticsCompareScripts(store, input) })
  );

  server.registerTool(
    "analytics_explain_campaign_performance",
    {
      title: "Explain campaign performance",
      description:
        "Diagnose synthetic Meta Ads performance across creative angle, audience, product fit, WhatsApp follow-up, and order conversion.",
      inputSchema: {
        campaign_id: z.string().optional(),
        distributor_id: z.string().optional(),
        product_id: z.string().optional()
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: analyticsExplainCampaignPerformance(store, input) })
  );

  server.registerTool(
    "analytics_find_hidden_gems",
    {
      title: "Find hidden growth opportunities",
      description:
        "Find surprising privacy-safe opportunities such as low-spend/high-ROAS campaigns, low-CTR/high-conversion hooks, and risky high-engagement scripts.",
      inputSchema: {
        product_id: z.string().optional(),
        category: z.string().optional(),
        min_confidence: z.enum(["low", "medium", "high"]).optional()
      },
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true }
    },
    async (input) => asToolResult({ result: analyticsFindHiddenGems(store, input) })
  );

  return server;
}

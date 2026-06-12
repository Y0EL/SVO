import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "./app.js";
import { createSeedStore } from "./seed.js";

async function withMcpClient<T>(fn: (client: Client, baseUrl: string) => Promise<T>) {
  const app = createApp(createSeedStore());
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));
  const { port } = httpServer.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const client = new Client({ name: "svo-mcp-test-client", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));

  try {
    await client.connect(transport);
    return await fn(client, baseUrl);
  } finally {
    await client.close();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("health endpoint returns service status", async () => {
  const app = createApp(createSeedStore());
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));
  const { port } = httpServer.address() as AddressInfo;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = (await response.json()) as { ok: boolean; service: string };

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, "svo-mcp");
  } finally {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("MCP client can list and call tools", async () => {
  await withMcpClient(async (client) => {
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);

    assert.ok(names.includes("catalog_lookup_product"));
    assert.ok(names.includes("whatsapp_send_message"));

    const lookup = await client.callTool({
      name: "catalog_lookup_product",
      arguments: { query: "Glow" }
    });
    assert.equal(lookup.isError, undefined);
    assert.equal((lookup.structuredContent as { result: { count: number } }).result.count, 1);
  });
});

test("MCP lead response flow works end-to-end", async () => {
  await withMcpClient(async (client) => {
    const messages = await client.callTool({
      name: "whatsapp_get_recent_messages",
      arguments: { distributor_id: "dist-ayu", customer_id: "cust-rina", limit: 5 }
    });
    assert.equal((messages.structuredContent as { result: { messages: unknown[] } }).result.messages.length, 2);

    const draft = await client.callTool({
      name: "whatsapp_draft_reply",
      arguments: {
        distributor_id: "dist-ayu",
        customer_id: "cust-rina",
        product_id: "prod-glow-serum",
        message_context: "Bisa menghilangkan flek dalam 3 hari?"
      }
    });
    const reply = (draft.structuredContent as { result: { reply: string } }).result.reply;
    assert.match(reply, /Halo kak Rina/);

    const send = await client.callTool({
      name: "whatsapp_send_message",
      arguments: {
        distributor_id: "dist-ayu",
        customer_id: "cust-rina",
        message: reply,
        idempotency_key: "mcp-send-001"
      }
    });
    assert.equal(
      (send.structuredContent as { result: { status: string } }).result.status,
      "sent_to_dummy_store"
    );
  });
});

test("MCP rejects malformed input", async () => {
  await withMcpClient(async (client) => {
    const result = await client.callTool({
      name: "whatsapp_send_message",
      arguments: {
        distributor_id: "dist-ayu",
        customer_id: "cust-rina",
        message: "missing idempotency key"
      }
    });

    assert.equal(result.isError, true);
  });
});

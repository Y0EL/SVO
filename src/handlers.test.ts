import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsCompareProducts,
  analyticsCompareScripts,
  analyticsFindHiddenGems,
  catalogLookupProduct,
  ordersCreateDraftOrder,
  patternsGetNetworkInsights,
  whatsappDraftReply,
  whatsappGetRecentMessages,
  whatsappSendMessage
} from "./handlers.js";
import { createSeedStore } from "./seed.js";

test("catalog lookup returns approved and forbidden claims", () => {
  const store = createSeedStore();
  const result = catalogLookupProduct(store, { query: "Glow" });

  const serum = result.products.find((product) => product.id === "prod-glow-serum");
  assert.ok(result.count >= 1);
  assert.ok(serum);
  assert.ok(serum.approved_claims.length > 0);
  assert.ok(serum.forbidden_claims.includes("memutihkan permanen"));
});

test("draft reply flags forbidden claims and suggests safer wording", () => {
  const store = createSeedStore();
  const result = whatsappDraftReply(store, {
    distributor_id: "dist-ayu",
    customer_id: "cust-rina",
    product_id: "prod-glow-serum",
    message_context: "Bisa menghilangkan flek dalam 3 hari?"
  });

  assert.equal(result.risk_flags.length, 1);
  assert.equal(result.risk_flags[0].type, "forbidden_claim");
  assert.match(result.reply, /hasil tiap orang bisa beda/i);
});

test("raw WhatsApp data is scoped by distributor", () => {
  const store = createSeedStore();

  assert.throws(
    () =>
      whatsappGetRecentMessages(store, {
        distributor_id: "dist-bima",
        customer_id: "cust-rina"
      }),
    /Customer not found/
  );
});

test("fake WhatsApp send is idempotent", () => {
  const store = createSeedStore();
  const before = store.messages.length;
  const input = {
    distributor_id: "dist-ayu",
    customer_id: "cust-rina",
    message: "Siap kak, aku bantu cek stok dulu ya.",
    idempotency_key: "idem-send-001"
  };

  const first = whatsappSendMessage(store, input);
  const second = whatsappSendMessage(store, input);

  assert.deepEqual(second, first);
  assert.equal(store.messages.length, before + 1);
});

test("draft order computes totals and is idempotent", () => {
  const store = createSeedStore();
  const before = store.orders.length;
  const input = {
    distributor_id: "dist-ayu",
    customer_id: "cust-dewi",
    items: [{ product_id: "prod-glow-serum", quantity: 2 }],
    shipping_city: "Bekasi",
    idempotency_key: "idem-order-001"
  };

  const first = ordersCreateDraftOrder(store, input);
  const second = ordersCreateDraftOrder(store, input);

  assert.deepEqual(second, first);
  assert.equal((first as { total_idr: number }).total_idr, 298000);
  assert.equal(store.orders.length, before + 1);
});

test("network insights expose aggregate patterns only", () => {
  const store = createSeedStore();
  const result = patternsGetNetworkInsights(store, {
    product_id: "prod-glow-serum",
    min_confidence: "medium"
  });

  assert.ok(result.count >= 1);
  assert.match(result.privacy_boundary, /anonymized aggregate/i);
  assert.equal(Object.hasOwn(result.insights[0], "distributor_id"), false);
});

test("large JSON fixtures contain realistic stress-test scale", () => {
  const store = createSeedStore();

  assert.equal(store.products.length, 12);
  assert.equal(store.distributors.length, 20);
  assert.equal(store.customers.length, 300);
  assert.equal(store.messages.length, 2000);
  assert.equal(store.orders.length, 700);
  assert.equal(store.campaigns.length, 150);
  assert.equal(store.scripts.length, 60);
  assert.equal(store.scriptPerformance.length, 400);
  assert.equal(store.patterns.length, 80);
});

test("fixtures keep referential integrity for analytics", () => {
  const store = createSeedStore();
  const distributorIds = new Set(store.distributors.map((item) => item.id));
  const customerIds = new Set(store.customers.map((item) => item.id));
  const productIds = new Set(store.products.map((item) => item.id));
  const scriptIds = new Set(store.scripts.map((item) => item.id));
  const campaignIds = new Set(store.campaigns.map((item) => item.id));

  assert.equal(new Set(store.products.map((item) => item.id)).size, store.products.length);
  assert.ok(store.customers.every((item) => distributorIds.has(item.distributorId)));
  assert.ok(store.messages.every((item) => distributorIds.has(item.distributorId) && customerIds.has(item.customerId)));
  assert.ok(
    store.orders.every(
      (item) =>
        distributorIds.has(item.distributorId) &&
        customerIds.has(item.customerId) &&
        item.items.every((orderItem) => productIds.has(orderItem.productId))
    )
  );
  assert.ok(
    store.campaigns.every(
      (item) =>
        distributorIds.has(item.distributorId) &&
        productIds.has(item.productId) &&
        (!item.scriptId || scriptIds.has(item.scriptId))
    )
  );
  assert.ok(
    store.scriptPerformance.every(
      (item) =>
        scriptIds.has(item.scriptId) &&
        productIds.has(item.productId) &&
        distributorIds.has(item.distributorId) &&
        (!item.campaignId || campaignIds.has(item.campaignId))
    )
  );
});

test("product analytics explains why one product is preferred", () => {
  const store = createSeedStore();
  const result = analyticsCompareProducts(store, {
    product_ids: ["prod-glow-serum", "prod-fit-coffee"]
  });

  assert.equal(result.summaries.length, 2);
  assert.match(result.why_preferred, /lebih disukai|Tidak ada data cukup/i);
});

test("script analytics explains engagement differences", () => {
  const store = createSeedStore();
  const result = analyticsCompareScripts(store, {
    script_ids: ["script-001", "script-002", "script-003"]
  });

  assert.ok(result.summaries.length >= 2);
  assert.match(result.why_engagement_differs, /hook|Tidak ada data cukup/i);
});

test("hidden gems surface non-obvious privacy-safe opportunities", () => {
  const store = createSeedStore();
  const result = analyticsFindHiddenGems(store, { min_confidence: "medium" });

  assert.ok(result.count >= 1);
  assert.match(result.hidden_gems[0].privacy_safe_explanation, /tidak membuka|synthetic/i);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
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

  assert.equal(result.count, 1);
  assert.equal(result.products[0].id, "prod-glow-serum");
  assert.ok(result.products[0].approved_claims.length > 0);
  assert.ok(result.products[0].forbidden_claims.includes("memutihkan permanen"));
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

  assert.equal(result.count, 1);
  assert.match(result.privacy_boundary, /anonymized aggregate/i);
  assert.equal(Object.hasOwn(result.insights[0], "distributor_id"), false);
});

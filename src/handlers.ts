import type { Order, SvoStore, WhatsAppMessage } from "./types.js";

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

function assertDistributor(store: SvoStore, distributorId: string) {
  const distributor = store.distributors.find((item) => item.id === distributorId);
  if (!distributor) {
    throw new ToolError(`Unknown distributor_id: ${distributorId}`);
  }
  return distributor;
}

function getCustomerForDistributor(store: SvoStore, distributorId: string, customerId: string) {
  assertDistributor(store, distributorId);
  const customer = store.customers.find(
    (item) => item.id === customerId && item.distributorId === distributorId
  );
  if (!customer) {
    throw new ToolError("Customer not found for this distributor.");
  }
  return customer;
}

function nowIso() {
  return new Date().toISOString();
}

function containsForbiddenClaim(text: string, forbiddenClaims: string[]) {
  const normalized = text.toLowerCase();
  return forbiddenClaims.filter((claim) => normalized.includes(claim.toLowerCase()));
}

export function catalogLookupProduct(
  store: SvoStore,
  input: { query: string; distributor_id?: string }
) {
  if (input.distributor_id) {
    assertDistributor(store, input.distributor_id);
  }
  const query = input.query.toLowerCase();
  const products = store.products.filter(
    (product) =>
      product.id.toLowerCase() === query ||
      product.sku.toLowerCase() === query ||
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
  );

  return {
    query: input.query,
    count: products.length,
    products: products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      price_idr: product.priceIdr,
      stock: product.stock,
      approved_claims: product.approvedClaims,
      forbidden_claims: product.forbiddenClaims,
      positioning: product.positioning
    }))
  };
}

export function whatsappGetRecentMessages(
  store: SvoStore,
  input: { distributor_id: string; customer_id?: string; limit?: number }
) {
  assertDistributor(store, input.distributor_id);
  if (input.customer_id) {
    getCustomerForDistributor(store, input.distributor_id, input.customer_id);
  }

  const messages = store.messages
    .filter(
      (message) =>
        message.distributorId === input.distributor_id &&
        (!input.customer_id || message.customerId === input.customer_id)
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-(input.limit ?? 10));

  return {
    distributor_id: input.distributor_id,
    customer_id: input.customer_id ?? null,
    messages: messages.map((message) => ({
      id: message.id,
      customer_id: message.customerId,
      direction: message.direction,
      text: message.text,
      created_at: message.createdAt
    }))
  };
}

export function whatsappDraftReply(
  store: SvoStore,
  input: {
    distributor_id: string;
    customer_id: string;
    product_id?: string;
    message_context?: string;
    tone?: "friendly" | "concise" | "consultative";
    language?: "id" | "en";
  }
) {
  const customer = getCustomerForDistributor(store, input.distributor_id, input.customer_id);
  const product =
    store.products.find((item) => item.id === input.product_id) ??
    store.products.find((item) =>
      (input.message_context ?? "").toLowerCase().includes(item.name.toLowerCase())
    ) ??
    store.products[0];

  const context =
    input.message_context ??
    store.messages
      .filter((message) => message.customerId === customer.id)
      .slice(-2)
      .map((message) => message.text)
      .join(" ");
  const matchedForbiddenClaims = containsForbiddenClaim(context, product.forbiddenClaims);
  const riskFlags = matchedForbiddenClaims.map((claim) => ({
    type: "forbidden_claim",
    claim,
    safer_wording: `Hindari klaim "${claim}". Pakai benefit resmi: ${product.approvedClaims[0]}.`
  }));

  const opener = input.tone === "concise" ? `Halo ${customer.name},` : `Halo kak ${customer.name},`;
  const caution =
    riskFlags.length > 0
      ? "Aku belum bisa janji hasil instan ya kak, karena hasil tiap orang bisa beda."
      : "Untuk pemakaian rutin, kakak bisa mulai pelan dulu dan lihat cocoknya.";
  const reply = [
    opener,
    `${product.name} harganya Rp${product.priceIdr.toLocaleString("id-ID")} dan stok saat ini ${product.stock > 0 ? "ready" : "kosong"}.`,
    `${caution} Benefit resminya: ${product.approvedClaims[0]}.`,
    product.stock > 0
      ? "Kalau cocok, aku bisa bantu buatkan draft order dulu. Mau ambil 1 pcs atau bundling?"
      : "Kalau kakak mau, aku catat dulu untuk follow-up saat stok tersedia."
  ].join(" ");

  return {
    distributor_id: input.distributor_id,
    customer_id: customer.id,
    product_id: product.id,
    language: input.language ?? "id",
    reply,
    risk_flags: riskFlags,
    suggested_next_action: product.stock > 0 ? "offer_draft_order" : "waitlist"
  };
}

export function whatsappSendMessage(
  store: SvoStore,
  input: { distributor_id: string; customer_id: string; message: string; idempotency_key: string }
) {
  getCustomerForDistributor(store, input.distributor_id, input.customer_id);
  const key = `whatsapp_send:${input.distributor_id}:${input.idempotency_key}`;
  const existing = store.idempotency.get(key);
  if (existing) {
    return existing;
  }

  const message: WhatsAppMessage = {
    id: `msg-${String(store.messages.length + 1).padStart(3, "0")}`,
    distributorId: input.distributor_id,
    customerId: input.customer_id,
    direction: "outbound",
    text: input.message,
    createdAt: nowIso()
  };
  store.messages.push(message);
  const result = {
    simulated: true,
    message_id: message.id,
    status: "sent_to_dummy_store",
    created_at: message.createdAt
  };
  store.idempotency.set(key, result);
  return result;
}

export function ordersCreateDraftOrder(
  store: SvoStore,
  input: {
    distributor_id: string;
    customer_id: string;
    items: Array<{ product_id: string; quantity: number }>;
    shipping_city?: string;
    notes?: string;
    idempotency_key: string;
  }
) {
  getCustomerForDistributor(store, input.distributor_id, input.customer_id);
  const key = `order_draft:${input.distributor_id}:${input.idempotency_key}`;
  const existing = store.idempotency.get(key);
  if (existing) {
    return existing;
  }

  const items = input.items.map((item) => {
    const product = store.products.find((candidate) => candidate.id === item.product_id);
    if (!product) {
      throw new ToolError(`Unknown product_id: ${item.product_id}`);
    }
    if (item.quantity > product.stock) {
      throw new ToolError(`Insufficient stock for ${product.name}.`);
    }
    return {
      productId: product.id,
      quantity: item.quantity,
      unitPriceIdr: product.priceIdr
    };
  });
  const totalIdr = items.reduce((total, item) => total + item.quantity * item.unitPriceIdr, 0);
  const order: Order = {
    id: `ord-${String(store.orders.length + 1).padStart(3, "0")}`,
    distributorId: input.distributor_id,
    customerId: input.customer_id,
    items,
    totalIdr,
    status: "draft",
    createdAt: nowIso(),
    notes: input.notes
  };
  store.orders.push(order);
  const result = {
    simulated: true,
    order_id: order.id,
    status: order.status,
    total_idr: totalIdr,
    shipping_city: input.shipping_city ?? null,
    next_confirmation_prompt: `Konfirmasi order ${order.id} total Rp${totalIdr.toLocaleString("id-ID")}?`
  };
  store.idempotency.set(key, result);
  return result;
}

export function ordersGetSalesLog(
  store: SvoStore,
  input: { distributor_id: string; product_id?: string; date_from?: string; date_to?: string }
) {
  assertDistributor(store, input.distributor_id);
  const orders = store.orders.filter((order) => {
    const inDistributor = order.distributorId === input.distributor_id;
    const hasProduct = !input.product_id || order.items.some((item) => item.productId === input.product_id);
    const afterFrom = !input.date_from || order.createdAt.slice(0, 10) >= input.date_from;
    const beforeTo = !input.date_to || order.createdAt.slice(0, 10) <= input.date_to;
    return inDistributor && hasProduct && afterFrom && beforeTo;
  });
  return {
    distributor_id: input.distributor_id,
    order_count: orders.length,
    revenue_idr: orders.reduce((total, order) => total + order.totalIdr, 0),
    orders: orders.map((order) => ({
      id: order.id,
      customer_id: order.customerId,
      status: order.status,
      total_idr: order.totalIdr,
      created_at: order.createdAt
    }))
  };
}

export function adsGetPerformanceSummary(
  store: SvoStore,
  input: { distributor_id: string; campaign_id?: string; date_from?: string; date_to?: string }
) {
  assertDistributor(store, input.distributor_id);
  const campaigns = store.campaigns.filter((campaign) => {
    const inDistributor = campaign.distributorId === input.distributor_id;
    const matchesCampaign = !input.campaign_id || campaign.id === input.campaign_id;
    const afterFrom = !input.date_from || campaign.date >= input.date_from;
    const beforeTo = !input.date_to || campaign.date <= input.date_to;
    return inDistributor && matchesCampaign && afterFrom && beforeTo;
  });
  const spend = campaigns.reduce((total, campaign) => total + campaign.spendIdr, 0);
  const leads = campaigns.reduce((total, campaign) => total + campaign.leads, 0);
  const sales = campaigns.reduce((total, campaign) => total + campaign.sales, 0);
  const revenue = campaigns.reduce((total, campaign) => total + campaign.revenueIdr, 0);
  return {
    distributor_id: input.distributor_id,
    spend_idr: spend,
    leads,
    sales,
    revenue_idr: revenue,
    cpl_idr: leads === 0 ? null : Math.round(spend / leads),
    roas: spend === 0 ? null : Number((revenue / spend).toFixed(2)),
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      product_id: campaign.productId,
      creative_angle: campaign.creativeAngle
    }))
  };
}

export function patternsGetNetworkInsights(
  store: SvoStore,
  input: { product_id?: string; category?: string; min_confidence?: "low" | "medium" | "high" }
) {
  const rank = { low: 0, medium: 1, high: 2 };
  const minConfidence = input.min_confidence ?? "low";
  const patterns = store.patterns.filter((pattern) => {
    const matchesProduct = !input.product_id || pattern.productId === input.product_id;
    const matchesCategory = !input.category || pattern.category === input.category;
    const matchesConfidence = rank[pattern.confidence] >= rank[minConfidence];
    return matchesProduct && matchesCategory && matchesConfidence;
  });
  return {
    privacy_boundary: "Only anonymized aggregate patterns are returned. No raw distributor creative, chat, or customer data is exposed.",
    count: patterns.length,
    insights: patterns.map((pattern) => ({
      id: pattern.id,
      product_id: pattern.productId,
      category: pattern.category,
      hook: pattern.hook,
      objection: pattern.objection,
      cta: pattern.cta,
      confidence: pattern.confidence,
      sample_size: pattern.sampleSize
    }))
  };
}

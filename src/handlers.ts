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

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function avg(items: number[]) {
  return items.length === 0 ? 0 : items.reduce((total, item) => total + item, 0) / items.length;
}

function productName(store: SvoStore, productId: string) {
  return store.products.find((product) => product.id === productId)?.name ?? productId;
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
  const policy = store.claimPolicies.find((item) => item.productId === product.id);
  const matchedForbiddenClaims = unique([
    ...containsForbiddenClaim(context, product.forbiddenClaims),
    ...containsForbiddenClaim(context, policy?.riskyPatterns ?? [])
  ]);
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

export function analyticsCompareProducts(
  store: SvoStore,
  input: {
    product_ids: string[];
    distributor_id?: string;
    segment?: string;
    date_from?: string;
    date_to?: string;
  }
) {
  if (input.distributor_id) {
    assertDistributor(store, input.distributor_id);
  }
  const summaries = input.product_ids.map((productId) => {
    const product = store.products.find((item) => item.id === productId);
    if (!product) {
      throw new ToolError(`Unknown product_id: ${productId}`);
    }
    const campaigns = store.campaigns.filter((campaign) => {
      const dateOk = (!input.date_from || campaign.date >= input.date_from) && (!input.date_to || campaign.date <= input.date_to);
      const distributorOk = !input.distributor_id || campaign.distributorId === input.distributor_id;
      const segmentOk = !input.segment || campaign.audience?.toLowerCase().includes(input.segment.toLowerCase());
      return campaign.productId === productId && dateOk && distributorOk && segmentOk;
    });
    const orders = store.orders.filter((order) => {
      const dateOk = (!input.date_from || order.createdAt.slice(0, 10) >= input.date_from) && (!input.date_to || order.createdAt.slice(0, 10) <= input.date_to);
      const distributorOk = !input.distributor_id || order.distributorId === input.distributor_id;
      return dateOk && distributorOk && order.items.some((item) => item.productId === productId);
    });
    const spend = campaigns.reduce((total, campaign) => total + campaign.spendIdr, 0);
    const leads = campaigns.reduce((total, campaign) => total + campaign.leads, 0);
    const sales = campaigns.reduce((total, campaign) => total + campaign.sales, 0);
    const revenue = campaigns.reduce((total, campaign) => total + campaign.revenueIdr, 0);
    const objections = store.customers
      .filter((customer) => customer.concerns?.some((concern) => product.targetPersonas?.includes(concern)))
      .flatMap((customer) => customer.objectionTags ?? []);
    return {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price_idr: product.priceIdr,
      margin_pct: product.marginPct ?? null,
      campaign_count: campaigns.length,
      spend_idr: spend,
      leads,
      sales,
      revenue_idr: revenue,
      roas: spend === 0 ? null : Number((revenue / spend).toFixed(2)),
      conversion_rate: leads === 0 ? null : Number((sales / leads).toFixed(3)),
      paid_order_count: orders.filter((order) => order.status === "paid" || order.status === "fulfilled").length,
      repeat_order_count: orders.filter((order) => order.channel === "repeat").length,
      top_objections: unique(objections).slice(0, 5)
    };
  });
  const winner = [...summaries].sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0];
  return {
    compared_product_ids: input.product_ids,
    summaries,
    why_preferred: winner
      ? `${winner.product_name} terlihat lebih disukai dalam filter ini karena kombinasi ROAS ${winner.roas}, conversion rate ${winner.conversion_rate}, dan paid orders ${winner.paid_order_count}.`
      : "Tidak ada data cukup untuk menentukan preferensi.",
    caveat: "Synthetic analytics for stress testing; use as directional evidence, not production truth."
  };
}

export function analyticsCompareScripts(
  store: SvoStore,
  input: {
    script_ids: string[];
    product_id?: string;
    channel?: "meta_ads" | "whatsapp";
    lead_stage?: string;
    segment?: string;
  }
) {
  const summaries = input.script_ids.map((scriptId) => {
    const script = store.scripts.find((item) => item.id === scriptId);
    if (!script) {
      throw new ToolError(`Unknown script_id: ${scriptId}`);
    }
    const rows = store.scriptPerformance.filter((row) => {
      const productOk = !input.product_id || row.productId === input.product_id;
      const segmentOk = !input.segment || row.segment.toLowerCase().includes(input.segment.toLowerCase());
      return row.scriptId === scriptId && productOk && segmentOk;
    });
    const impressions = rows.reduce((total, row) => total + row.impressions, 0);
    const engagements = rows.reduce((total, row) => total + row.engagements, 0);
    const replies = rows.reduce((total, row) => total + row.replies, 0);
    const leads = rows.reduce((total, row) => total + row.leads, 0);
    const sales = rows.reduce((total, row) => total + row.sales, 0);
    const revenue = rows.reduce((total, row) => total + row.revenueIdr, 0);
    return {
      script_id: script.id,
      name: script.name,
      channel: script.channel,
      product_id: script.productId,
      product_name: productName(store, script.productId),
      hook_style: script.hookStyle,
      cta_style: script.ctaStyle,
      tone: script.tone,
      lead_stage: script.leadStage,
      claim_risk: script.claimRisk,
      observations: rows.length,
      engagement_rate: impressions === 0 ? null : Number((engagements / impressions).toFixed(3)),
      reply_rate: engagements === 0 ? null : Number((replies / engagements).toFixed(3)),
      conversion_rate: leads === 0 ? null : Number((sales / leads).toFixed(3)),
      revenue_idr: revenue
    };
  }).filter((summary) => (!input.channel || summary.channel === input.channel) && (!input.lead_stage || summary.lead_stage === input.lead_stage));
  const winner = [...summaries].sort((a, b) => (b.conversion_rate ?? 0) - (a.conversion_rate ?? 0))[0];
  return {
    compared_script_ids: input.script_ids,
    summaries,
    why_engagement_differs: winner
      ? `${winner.name} unggul karena hook ${winner.hook_style}, CTA ${winner.cta_style}, tone ${winner.tone}, dan conversion rate ${winner.conversion_rate}. Perhatikan claim risk: ${winner.claim_risk}.`
      : "Tidak ada data cukup untuk menjelaskan perbedaan script.",
    recommendation: winner?.claim_risk === "high" ? "Jangan scale script pemenang tanpa rewrite compliance-safe." : "Scale dengan A/B test pada segment yang sama."
  };
}

export function analyticsExplainCampaignPerformance(
  store: SvoStore,
  input: { campaign_id?: string; distributor_id?: string; product_id?: string }
) {
  if (input.distributor_id) {
    assertDistributor(store, input.distributor_id);
  }
  const campaigns = store.campaigns.filter((campaign) => {
    const campaignOk = !input.campaign_id || campaign.id === input.campaign_id;
    const distributorOk = !input.distributor_id || campaign.distributorId === input.distributor_id;
    const productOk = !input.product_id || campaign.productId === input.product_id;
    return campaignOk && distributorOk && productOk;
  });
  const explanations = campaigns.slice(0, 10).map((campaign) => {
    const script = store.scripts.find((item) => item.id === campaign.scriptId);
    const cpl = campaign.leads === 0 ? null : Math.round(campaign.spendIdr / campaign.leads);
    const roas = campaign.spendIdr === 0 ? null : Number((campaign.revenueIdr / campaign.spendIdr).toFixed(2));
    const diagnosis = [
      campaign.ctr && campaign.ctr < 0.018 ? "CTR rendah: hook mungkin terlalu narrow atau visual kurang kuat." : "CTR cukup sehat untuk synthetic benchmark.",
      campaign.conversionRate && campaign.conversionRate > 0.13 ? "Conversion kuat: lead quality dan product fit baik." : "Conversion perlu dibantu follow-up WhatsApp.",
      script?.claimRisk === "high" ? "Script punya compliance risk; rewrite sebelum scale." : "Script relatif aman dari sisi claim risk."
    ];
    return {
      campaign_id: campaign.id,
      name: campaign.name,
      product_id: campaign.productId,
      product_name: productName(store, campaign.productId),
      script_id: campaign.scriptId ?? null,
      creative_angle: campaign.creativeAngle,
      audience: campaign.audience ?? null,
      cpl_idr: cpl,
      roas,
      ctr: campaign.ctr ?? null,
      conversion_rate: campaign.conversionRate ?? null,
      diagnosis,
      next_experiment: roas && roas > 2 ? "Scale budget 20% dan test CTA baru." : "Pertahankan budget, test hook baru dan WhatsApp follow-up lebih cepat."
    };
  });
  return { count: explanations.length, explanations };
}

export function analyticsFindHiddenGems(
  store: SvoStore,
  input: { product_id?: string; category?: string; min_confidence?: "low" | "medium" | "high" }
) {
  const rank = { low: 0, medium: 1, high: 2 };
  const minConfidence = input.min_confidence ?? "medium";
  const campaigns = store.campaigns.filter((campaign) => {
    const product = store.products.find((item) => item.id === campaign.productId);
    const productOk = !input.product_id || campaign.productId === input.product_id;
    const categoryOk = !input.category || product?.category === input.category;
    return productOk && categoryOk;
  });
  const gems = campaigns
    .map((campaign) => {
      const roas = campaign.spendIdr === 0 ? 0 : campaign.revenueIdr / campaign.spendIdr;
      const ctr = campaign.ctr ?? 0;
      const confidence: "low" | "medium" | "high" = roas > 2.5 && ctr < 0.02 ? "high" : roas > 1.6 ? "medium" : "low";
      return {
        insight_title:
          roas > 2.5 && ctr < 0.02
            ? "Low CTR, high ROAS: creative filters low-quality leads"
            : "Narrow segment showing above-average revenue quality",
        product_id: campaign.productId,
        product_name: productName(store, campaign.productId),
        campaign_id: campaign.id,
        metric_anomaly: `CTR ${ctr}, ROAS ${Number(roas.toFixed(2))}, leads ${campaign.leads}, sales ${campaign.sales}`,
        supporting_evidence: `Audience ${campaign.audience}; creative angle ${campaign.creativeAngle}; revenue Rp${campaign.revenueIdr.toLocaleString("id-ID")}`,
        privacy_safe_explanation:
          "Insight memakai aggregate campaign metrics dan tidak membuka raw creative atau customer chat distributor lain.",
        recommended_next_experiment:
          roas > 2.5 ? "Scale audience narrow 15-20% dan pertahankan hook." : "Uji CTA lebih consultative pada segment yang sama.",
        confidence
      };
    })
    .filter((gem) => rank[gem.confidence] >= rank[minConfidence])
    .sort((a, b) => rank[b.confidence] - rank[a.confidence])
    .slice(0, 8);

  const scriptGem = store.scripts.find((script) => script.claimRisk === "high");
  if (scriptGem && rank.high >= rank[minConfidence]) {
    gems.push({
      insight_title: "High engagement script with compliance risk",
      product_id: scriptGem.productId,
      product_name: productName(store, scriptGem.productId),
      campaign_id: "script-only",
      metric_anomaly: "Script style attracts attention but contains high claim risk.",
      supporting_evidence: `Script ${scriptGem.id}; hook ${scriptGem.hookStyle}; CTA ${scriptGem.ctaStyle}; tone ${scriptGem.tone}`,
      privacy_safe_explanation: "Uses synthetic script metadata only.",
      recommended_next_experiment: "Rewrite with approved claims before scaling.",
      confidence: "high"
    });
  }

  return { count: gems.length, hidden_gems: gems.slice(0, 8) };
}

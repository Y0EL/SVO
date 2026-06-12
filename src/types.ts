export type Distributor = {
  id: string;
  name: string;
  region: string;
  tier?: "starter" | "growth" | "leader";
  salesStyle?: "consultative" | "fast_closer" | "educational" | "promo_driven";
  channelMaturity?: "low" | "medium" | "high";
  preferredCategory?: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceIdr: number;
  stock: number;
  approvedClaims: string[];
  forbiddenClaims: string[];
  positioning: string[];
  marginPct?: number;
  targetPersonas?: string[];
  bundleOptions?: Array<{ bundleId: string; name: string; productIds: string[]; priceIdr: number }>;
  objectionFaq?: Array<{ objection: string; response: string }>;
};

export type Customer = {
  id: string;
  distributorId: string;
  name: string;
  phone: string;
  city: string;
  leadStage: "new" | "considering" | "objection" | "ready_to_order" | "customer";
  ageBand?: "18-24" | "25-34" | "35-44" | "45+";
  concerns?: string[];
  budgetSensitivity?: "low" | "medium" | "high";
  trustLevel?: "low" | "medium" | "high";
  sourceCampaignId?: string;
  objectionTags?: string[];
  preferredTone?: string;
};

export type WhatsAppMessage = {
  id: string;
  distributorId: string;
  customerId: string;
  direction: "inbound" | "outbound";
  text: string;
  createdAt: string;
  sentiment?: "positive" | "neutral" | "negative";
  intent?: "ask_price" | "ask_claim" | "ask_shipping" | "trust_check" | "order" | "follow_up" | "objection";
  objectionTags?: string[];
  responseLatencyMinutes?: number;
  resolved?: boolean;
};

export type Order = {
  id: string;
  distributorId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; unitPriceIdr: number }>;
  totalIdr: number;
  status: "draft" | "paid" | "fulfilled" | "cancelled";
  createdAt: string;
  notes?: string;
  sourceCampaignId?: string;
  channel?: "whatsapp" | "manual" | "repeat";
};

export type AdCampaign = {
  id: string;
  distributorId: string;
  name: string;
  productId: string;
  spendIdr: number;
  leads: number;
  sales: number;
  revenueIdr: number;
  creativeAngle: string;
  date: string;
  scriptId?: string;
  audience?: string;
  format?: "image" | "video" | "carousel" | "reels";
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpcIdr?: number;
  conversionRate?: number;
};

export type NetworkPattern = {
  id: string;
  productId: string;
  category: string;
  hook: string;
  objection: string;
  cta: string;
  confidence: "low" | "medium" | "high";
  sampleSize: number;
  supportingMetric?: string;
  recommendation?: string;
};

export type CreativeScript = {
  id: string;
  name: string;
  channel: "meta_ads" | "whatsapp";
  productId: string;
  scriptType: "hook" | "reply" | "follow_up" | "closing";
  hookStyle: "problem" | "aspiration" | "social_proof" | "education" | "offer" | "myth_busting";
  ctaStyle: "soft_question" | "direct_order" | "trial_offer" | "bundle_offer" | "consultation";
  tone: "friendly" | "concise" | "consultative" | "urgent";
  leadStage: Customer["leadStage"];
  claimRisk: "low" | "medium" | "high";
  text: string;
};

export type ScriptPerformance = {
  id: string;
  scriptId: string;
  campaignId?: string;
  distributorId: string;
  productId: string;
  segment: string;
  impressions: number;
  engagements: number;
  replies: number;
  leads: number;
  sales: number;
  revenueIdr: number;
  date: string;
};

export type ClaimPolicy = {
  productId: string;
  riskyPatterns: string[];
  saferWording: string[];
};

export type ObjectionPlaybook = {
  tag: string;
  label: string;
  recommendedResponse: string;
  escalationRule?: string;
};

export type SvoStore = {
  distributors: Distributor[];
  products: Product[];
  customers: Customer[];
  messages: WhatsAppMessage[];
  orders: Order[];
  campaigns: AdCampaign[];
  patterns: NetworkPattern[];
  scripts: CreativeScript[];
  scriptPerformance: ScriptPerformance[];
  claimPolicies: ClaimPolicy[];
  objectionPlaybooks: ObjectionPlaybook[];
  idempotency: Map<string, unknown>;
};

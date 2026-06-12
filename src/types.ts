export type Distributor = {
  id: string;
  name: string;
  region: string;
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
};

export type Customer = {
  id: string;
  distributorId: string;
  name: string;
  phone: string;
  city: string;
  leadStage: "new" | "considering" | "objection" | "ready_to_order" | "customer";
};

export type WhatsAppMessage = {
  id: string;
  distributorId: string;
  customerId: string;
  direction: "inbound" | "outbound";
  text: string;
  createdAt: string;
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
};

export type SvoStore = {
  distributors: Distributor[];
  products: Product[];
  customers: Customer[];
  messages: WhatsAppMessage[];
  orders: Order[];
  campaigns: AdCampaign[];
  patterns: NetworkPattern[];
  idempotency: Map<string, unknown>;
};

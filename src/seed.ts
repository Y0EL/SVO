import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AdCampaign,
  ClaimPolicy,
  CreativeScript,
  Customer,
  Distributor,
  NetworkPattern,
  ObjectionPlaybook,
  Order,
  Product,
  ScriptPerformance,
  SvoStore,
  WhatsAppMessage
} from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");

function readFixture<T>(file: string): T[] {
  const raw = readFileSync(join(dataDir, file), "utf8");
  return JSON.parse(raw) as T[];
}

export function createSeedStore(): SvoStore {
  return {
    distributors: readFixture<Distributor>("distributors.json"),
    products: readFixture<Product>("products.json"),
    customers: readFixture<Customer>("customers.json"),
    messages: readFixture<WhatsAppMessage>("whatsapp_messages.json"),
    orders: readFixture<Order>("orders.json"),
    campaigns: readFixture<AdCampaign>("ad_campaigns.json"),
    patterns: readFixture<NetworkPattern>("network_patterns.json"),
    scripts: readFixture<CreativeScript>("creative_scripts.json"),
    scriptPerformance: readFixture<ScriptPerformance>("script_performance.json"),
    claimPolicies: readFixture<ClaimPolicy>("claim_policies.json"),
    objectionPlaybooks: readFixture<ObjectionPlaybook>("objection_playbooks.json"),
    idempotency: new Map<string, unknown>()
  };
}

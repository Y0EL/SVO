import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(root, "src", "data");
mkdirSync(dataDir, { recursive: true });

const cities = ["Jakarta", "Bandung", "Surabaya", "Medan", "Makassar", "Bali", "Semarang"];
const concerns = ["flek", "kusam", "jerawat", "berat badan", "energi pagi", "bau badan", "rambut rontok", "kulit kering"];
const objections = ["price", "trust", "claim_risk", "shipping", "cod", "bpom", "side_effect", "spouse_approval"];
const tones = ["friendly", "concise", "consultative", "urgent"];
const hookStyles = ["problem", "aspiration", "social_proof", "education", "offer", "myth_busting"];
const ctaStyles = ["soft_question", "direct_order", "trial_offer", "bundle_offer", "consultation"];
const leadStages = ["new", "considering", "objection", "ready_to_order", "customer"];

const products = [
  ["prod-glow-serum", "SVO-SKIN-001", "SVO Glow Serum", "skincare", 149000, 84, ["flek", "kusam"], ["membantu kulit terasa lebih lembap", "membantu tampilan kulit terlihat lebih cerah", "ringan untuk rutinitas pagi dan malam"], ["menyembuhkan jerawat", "memutihkan permanen", "menghilangkan flek dalam 3 hari"]],
  ["prod-fit-coffee", "SVO-WELL-014", "SVO Fit Coffee", "wellness", 99000, 120, ["berat badan", "energi pagi"], ["kopi praktis untuk menemani rutinitas pagi", "rasa ringan dan mudah diseduh", "cocok diposisikan sebagai habit replacement"], ["menurunkan berat badan tanpa diet", "membakar lemak pasti", "mengobati diabetes"]],
  ["prod-clear-wash", "SVO-SKIN-002", "SVO Clear Facial Wash", "skincare", 79000, 150, ["jerawat", "minyak"], ["membantu membersihkan wajah dari minyak berlebih", "lembut untuk pemakaian harian"], ["menyembuhkan jerawat parah", "menghilangkan komedo permanen"]],
  ["prod-body-bright", "SVO-CARE-005", "SVO Body Bright Lotion", "personal_care", 129000, 96, ["kulit kering", "warna tidak merata"], ["membantu kulit terasa lembut", "membantu tampilan kulit tampak lebih terawat"], ["memutihkan permanen", "hasil putih dalam seminggu"]],
  ["prod-hair-vital", "SVO-HAIR-003", "SVO Hair Vital Tonic", "haircare", 139000, 72, ["rambut rontok"], ["membantu rambut terasa lebih kuat", "mendukung rutinitas perawatan kulit kepala"], ["menumbuhkan rambut botak", "mengobati alopecia"]],
  ["prod-deo-fresh", "SVO-CARE-007", "SVO Deo Fresh", "personal_care", 69000, 200, ["bau badan"], ["membantu menjaga rasa segar lebih lama", "praktis untuk aktivitas harian"], ["menghilangkan bau badan permanen"]],
  ["prod-calm-toner", "SVO-SKIN-006", "SVO Calm Toner", "skincare", 119000, 88, ["kulit kering", "kemerahan"], ["membantu kulit terasa segar", "cocok untuk layering skincare ringan"], ["menyembuhkan iritasi", "mengobati alergi kulit"]],
  ["prod-slim-tea", "SVO-WELL-018", "SVO Slim Tea", "wellness", 89000, 132, ["berat badan"], ["minuman herbal praktis untuk rutinitas malam", "rasa ringan dan nyaman"], ["turun 5kg seminggu", "melunturkan lemak"]],
  ["prod-sun-guard", "SVO-SKIN-011", "SVO Sun Guard SPF", "skincare", 99000, 110, ["flek", "outdoor"], ["membantu melindungi kulit dari paparan sinar matahari", "ringan untuk dipakai ulang"], ["menghilangkan melasma", "perlindungan 100 persen"]],
  ["prod-lip-care", "SVO-CARE-012", "SVO Lip Care", "personal_care", 59000, 210, ["bibir kering"], ["membantu bibir terasa lembap", "praktis dibawa harian"], ["memerahkan bibir permanen"]],
  ["prod-night-repair", "SVO-SKIN-015", "SVO Night Repair Cream", "skincare", 179000, 64, ["kusam", "kulit kering"], ["membantu kulit terasa lembap saat malam", "mendukung rutinitas perawatan malam"], ["anti aging permanen", "menghapus keriput"]],
  ["prod-starter-bundle", "SVO-BND-001", "SVO Starter Glow Bundle", "bundle", 299000, 44, ["flek", "kusam", "kulit kering"], ["paket praktis untuk mulai rutinitas skincare", "menggabungkan pembersih dan serum"], ["hasil instan", "memutihkan permanen"]]
].map(([id, sku, name, category, priceIdr, stock, targetPersonas, approvedClaims, forbiddenClaims], index) => ({
  id, sku, name, category, priceIdr, stock, targetPersonas, approvedClaims, forbiddenClaims,
  marginPct: 28 + (index % 5) * 4,
  positioning: [`angle utama: ${targetPersonas[0]}`, index % 2 === 0 ? "cocok untuk lead yang butuh edukasi" : "cocok untuk trial offer"],
  bundleOptions: index < 10 ? [{ bundleId: `bundle-${index + 1}`, name: `${name} Starter Pair`, productIds: [id, "prod-lip-care"], priceIdr: priceIdr + 49000 }] : [],
  objectionFaq: [
    { objection: "price", response: "Bandingkan biaya per pemakaian harian dan tawarkan mulai 1 pcs dulu." },
    { objection: "claim_risk", response: "Gunakan klaim resmi dan hindari janji hasil instan." }
  ]
}));

const distributors = Array.from({ length: 20 }, (_, i) => {
  const base = [
    { id: "dist-ayu", name: "Ayu Sari", region: "Jakarta" },
    { id: "dist-bima", name: "Bima Pratama", region: "Bandung" }
  ][i];
  return {
    id: base?.id ?? `dist-${String(i + 1).padStart(2, "0")}`,
    name: base?.name ?? ["Nadia", "Putri", "Raka", "Sinta", "Dimas", "Maya", "Tari", "Fajar", "Lina", "Reno"][i % 10] + ` ${i + 1}`,
    region: base?.region ?? cities[i % cities.length],
    tier: i % 5 === 0 ? "leader" : i % 2 === 0 ? "growth" : "starter",
    salesStyle: ["consultative", "fast_closer", "educational", "promo_driven"][i % 4],
    channelMaturity: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
    preferredCategory: products[i % products.length].category
  };
});

const campaigns = [];
const scripts = [];
const scriptPerformance = [];
const customers = [];
const messages = [];
const orders = [];

for (let i = 0; i < 60; i++) {
  const product = products[i % products.length];
  const hookStyle = hookStyles[i % hookStyles.length];
  const ctaStyle = ctaStyles[(i + 2) % ctaStyles.length];
  const claimRisk = i % 13 === 0 ? "high" : i % 4 === 0 ? "medium" : "low";
  scripts.push({
    id: `script-${String(i + 1).padStart(3, "0")}`,
    name: `${product.name} - ${hookStyle} - ${ctaStyle}`,
    channel: i % 3 === 0 ? "whatsapp" : "meta_ads",
    productId: product.id,
    scriptType: ["hook", "reply", "follow_up", "closing"][i % 4],
    hookStyle,
    ctaStyle,
    tone: tones[i % tones.length],
    leadStage: leadStages[i % leadStages.length],
    claimRisk,
    text: `${hookStyle === "problem" ? "Sering bingung mulai dari mana?" : "Kak, ini opsi yang paling sering dipilih."} ${product.name} cocok untuk concern ${product.targetPersonas[0]}. ${ctaStyle === "soft_question" ? "Mau aku bantu cek cocoknya?" : "Mau mulai dari 1 pcs dulu?"}`
  });
}

for (let i = 0; i < 150; i++) {
  const distributor = distributors[i % distributors.length];
  const product = products[(i * 3) % products.length];
  const script = scripts[(i * 7) % scripts.length];
  const impressions = 1800 + (i % 40) * 130;
  const ctr = Number((0.012 + ((i * 5) % 21) / 1000).toFixed(3));
  const clicks = Math.round(impressions * ctr);
  const leads = Math.max(6, Math.round(clicks * (0.18 + (i % 5) * 0.025)));
  const sales = Math.max(1, Math.round(leads * (0.06 + (i % 7) * 0.012)));
  const spendIdr = 180000 + (i % 17) * 35000;
  const revenueIdr = sales * product.priceIdr;
  campaigns.push({
    id: `camp-${String(i + 1).padStart(3, "0")}`,
    distributorId: distributor.id,
    name: `${product.name} - ${script.hookStyle} - ${cities[i % cities.length]}`,
    productId: product.id,
    spendIdr,
    leads,
    sales,
    revenueIdr,
    creativeAngle: script.hookStyle,
    date: `2026-06-${String((i % 12) + 1).padStart(2, "0")}`,
    scriptId: script.id,
    audience: `${cities[i % cities.length]} ${concerns[i % concerns.length]}`,
    format: ["image", "video", "carousel", "reels"][i % 4],
    impressions,
    clicks,
    ctr,
    cpcIdr: clicks === 0 ? spendIdr : Math.round(spendIdr / clicks),
    conversionRate: Number((sales / leads).toFixed(3))
  });
}

const specialCustomers = [
  ["cust-rina", "dist-ayu", "Rina", "Depok", "objection", ["flek", "kusam"], ["claim_risk"]],
  ["cust-dewi", "dist-ayu", "Dewi", "Bekasi", "ready_to_order", ["flek"], ["shipping"]],
  ["cust-eka", "dist-bima", "Eka", "Cimahi", "considering", ["berat badan"], ["claim_risk"]]
];

for (let i = 0; i < 300; i++) {
  const special = specialCustomers[i];
  const distributor = distributors[i % distributors.length];
  const campaign = campaigns[i % campaigns.length];
  const concernSet = special?.[5] ?? [concerns[i % concerns.length], concerns[(i + 3) % concerns.length]];
  customers.push({
    id: special?.[0] ?? `cust-${String(i + 1).padStart(3, "0")}`,
    distributorId: special?.[1] ?? distributor.id,
    name: special?.[2] ?? ["Rani", "Dewi", "Mira", "Lala", "Tika", "Ari", "Nina", "Doni", "Sari", "Wulan"][i % 10] + ` ${i + 1}`,
    phone: `+628${String(1100000000 + i).padStart(10, "0")}`,
    city: special?.[3] ?? cities[i % cities.length],
    leadStage: special?.[4] ?? leadStages[i % leadStages.length],
    ageBand: ["18-24", "25-34", "35-44", "45+"][i % 4],
    concerns: concernSet,
    budgetSensitivity: i % 4 === 0 ? "high" : i % 4 === 1 ? "medium" : "low",
    trustLevel: i % 5 === 0 ? "low" : i % 5 === 1 ? "medium" : "high",
    sourceCampaignId: campaign.id,
    objectionTags: special?.[6] ?? [objections[i % objections.length]],
    preferredTone: tones[i % tones.length]
  });
}

const inboundTemplates = [
  "Kak ini aman ga? Aku takut ga cocok.",
  "Harga berapa ya? Bisa COD?",
  "BPOM aman kan kak? Soalnya takut palsu.",
  "Kalau buat {concern} bisa cepet keliatan ga?",
  "Aku masih mikir, ada testimoni real?",
  "Ongkir ke {city} berapa kak?",
  "Bedanya sama produk lain apa ya?",
  "Kalau ambil 2 ada diskon?"
];
const outboundTemplates = [
  "Aman kak untuk rutinitas harian, tapi hasil tiap orang bisa beda ya.",
  "Harga ready kak, aku bisa bantu cek paket paling hemat.",
  "Untuk klaim hasil instan aku ga bisa janji ya kak, kita pakai benefit resmi.",
  "Bisa mulai 1 pcs dulu kak supaya lihat cocoknya.",
  "Kalau concern kakak {concern}, biasanya aku sarankan mulai dari pemakaian rutin.",
  "Aku bantu hitungkan total dan opsi bundling ya kak."
];

for (let i = 0; i < 2000; i++) {
  const customer = customers[i % customers.length];
  const direction = i % 3 === 1 ? "outbound" : "inbound";
  const template = direction === "inbound" ? inboundTemplates[i % inboundTemplates.length] : outboundTemplates[i % outboundTemplates.length];
  messages.push({
    id: `msg-${String(i + 1).padStart(4, "0")}`,
    distributorId: customer.distributorId,
    customerId: customer.id,
    direction,
    text: template.replace("{concern}", customer.concerns[0]).replace("{city}", customer.city),
    createdAt: `2026-06-${String((i % 12) + 1).padStart(2, "0")}T${String(8 + (i % 12)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00.000Z`,
    sentiment: i % 7 === 0 ? "negative" : i % 5 === 0 ? "positive" : "neutral",
    intent: ["ask_price", "ask_claim", "ask_shipping", "trust_check", "order", "follow_up", "objection"][i % 7],
    objectionTags: customer.objectionTags,
    responseLatencyMinutes: direction === "outbound" ? 3 + (i % 55) : undefined,
    resolved: i % 6 !== 0
  });
}

for (let i = 0; i < 700; i++) {
  const customer = customers[i % customers.length];
  const product = products[(i * 5) % products.length];
  const quantity = 1 + (i % 3);
  orders.push({
    id: `ord-${String(i + 1).padStart(4, "0")}`,
    distributorId: customer.distributorId,
    customerId: customer.id,
    items: [{ productId: product.id, quantity, unitPriceIdr: product.priceIdr }],
    totalIdr: product.priceIdr * quantity,
    status: ["draft", "paid", "fulfilled", "cancelled"][i % 4],
    createdAt: `2026-06-${String((i % 12) + 1).padStart(2, "0")}T${String(9 + (i % 10)).padStart(2, "0")}:10:00.000Z`,
    notes: i % 9 === 0 ? "customer minta follow-up COD" : undefined,
    sourceCampaignId: customers[i % customers.length].sourceCampaignId,
    channel: i % 5 === 0 ? "repeat" : "whatsapp"
  });
}

for (let i = 0; i < 400; i++) {
  const script = scripts[i % scripts.length];
  const campaign = campaigns[i % campaigns.length];
  const engagements = 30 + ((i * 13) % 220);
  const replies = Math.round(engagements * (0.18 + (i % 6) * 0.025));
  const leads = Math.round(replies * (0.35 + (i % 4) * 0.05));
  const sales = Math.max(0, Math.round(leads * (0.05 + (i % 8) * 0.015)));
  scriptPerformance.push({
    id: `perf-${String(i + 1).padStart(4, "0")}`,
    scriptId: script.id,
    campaignId: campaign.id,
    distributorId: campaign.distributorId,
    productId: script.productId,
    segment: `${campaign.audience} / ${script.leadStage}`,
    impressions: 900 + (i % 60) * 80,
    engagements,
    replies,
    leads,
    sales,
    revenueIdr: sales * products.find((p) => p.id === script.productId).priceIdr,
    date: campaign.date
  });
}

const patterns = Array.from({ length: 80 }, (_, i) => {
  const product = products[i % products.length];
  return {
    id: `pat-${String(i + 1).padStart(3, "0")}`,
    productId: product.id,
    category: product.category,
    hook: `${hookStyles[i % hookStyles.length]} untuk concern ${product.targetPersonas[0]}`,
    objection: objections[i % objections.length],
    cta: ctaStyles[i % ctaStyles.length],
    confidence: i % 5 === 0 ? "high" : i % 3 === 0 ? "medium" : "low",
    sampleSize: 20 + (i % 40),
    supportingMetric: i % 4 === 0 ? "ROAS tinggi meski CTR rendah" : "reply rate di atas median jaringan",
    recommendation: i % 4 === 0 ? "scale narrow audience, jangan ubah hook dulu" : "uji variasi CTA dengan tone lebih consultative"
  };
});

const claimPolicies = products.map((product) => ({
  productId: product.id,
  riskyPatterns: [...product.forbiddenClaims, "cepat hilang", "pasti berhasil", "permanen", "sembuh total", "tanpa efek samping"],
  saferWording: product.approvedClaims
}));

const objectionPlaybooks = objections.map((tag) => ({
  tag,
  label: tag.replace("_", " "),
  recommendedResponse: {
    price: "Validasi concern harga, jelaskan value per pemakaian, tawarkan trial atau bundle hemat.",
    trust: "Bangun trust dengan info resmi, cara order aman, dan hindari klaim berlebihan.",
    claim_risk: "Redirect ke approved claims dan tekankan hasil tiap orang bisa berbeda.",
    shipping: "Berikan estimasi ongkir dan opsi follow-up resi.",
    cod: "Jelaskan ketersediaan COD sesuai area dan opsi pembayaran lain.",
    bpom: "Arahkan ke informasi legal/resmi yang tersedia dan jangan mengarang nomor izin.",
    side_effect: "Sarankan patch test dan handoff ke manusia untuk kondisi sensitif.",
    spouse_approval: "Beri ringkasan manfaat dan harga supaya mudah didiskusikan."
  }[tag],
  escalationRule: tag === "side_effect" ? "handoff_to_human" : undefined
}));

const files = {
  "distributors.json": distributors,
  "products.json": products,
  "customers.json": customers,
  "whatsapp_messages.json": messages,
  "orders.json": orders,
  "ad_campaigns.json": campaigns,
  "creative_scripts.json": scripts,
  "script_performance.json": scriptPerformance,
  "network_patterns.json": patterns,
  "claim_policies.json": claimPolicies,
  "objection_playbooks.json": objectionPlaybooks
};

for (const [file, data] of Object.entries(files)) {
  writeFileSync(join(dataDir, file), `${JSON.stringify(data, null, 2)}\n`);
}

console.log(`Generated SVO fixture dataset in ${dataDir}`);

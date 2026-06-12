import type { SvoStore } from "./types.js";

export function createSeedStore(): SvoStore {
  return {
    distributors: [
      { id: "dist-ayu", name: "Ayu Sari", region: "Jakarta" },
      { id: "dist-bima", name: "Bima Pratama", region: "Bandung" }
    ],
    products: [
      {
        id: "prod-glow-serum",
        sku: "SVO-SKIN-001",
        name: "SVO Glow Serum",
        category: "skincare",
        priceIdr: 149000,
        stock: 84,
        approvedClaims: [
          "membantu kulit terasa lebih lembap",
          "membantu tampilan kulit terlihat lebih cerah",
          "ringan untuk rutinitas pagi dan malam"
        ],
        forbiddenClaims: [
          "menyembuhkan jerawat",
          "memutihkan permanen",
          "menghilangkan flek dalam 3 hari"
        ],
        positioning: [
          "daily serum untuk first-time buyer",
          "paket bundling dengan facial wash untuk AOV lebih tinggi"
        ]
      },
      {
        id: "prod-fit-coffee",
        sku: "SVO-WELL-014",
        name: "SVO Fit Coffee",
        category: "wellness",
        priceIdr: 99000,
        stock: 120,
        approvedClaims: [
          "kopi praktis untuk menemani rutinitas pagi",
          "rasa ringan dan mudah diseduh",
          "cocok diposisikan sebagai habit replacement"
        ],
        forbiddenClaims: [
          "menurunkan berat badan tanpa diet",
          "membakar lemak pasti",
          "mengobati diabetes"
        ],
        positioning: [
          "entry product untuk audience wellness",
          "offer trial pack untuk lead dingin"
        ]
      }
    ],
    customers: [
      {
        id: "cust-rina",
        distributorId: "dist-ayu",
        name: "Rina",
        phone: "+628111111111",
        city: "Depok",
        leadStage: "objection"
      },
      {
        id: "cust-dewi",
        distributorId: "dist-ayu",
        name: "Dewi",
        phone: "+628122222222",
        city: "Bekasi",
        leadStage: "ready_to_order"
      },
      {
        id: "cust-eka",
        distributorId: "dist-bima",
        name: "Eka",
        phone: "+628133333333",
        city: "Cimahi",
        leadStage: "considering"
      }
    ],
    messages: [
      {
        id: "msg-001",
        distributorId: "dist-ayu",
        customerId: "cust-rina",
        direction: "inbound",
        text: "Kak serum ini aman ga? Bisa ngilangin flek cepat?",
        createdAt: "2026-06-10T09:00:00.000Z"
      },
      {
        id: "msg-002",
        distributorId: "dist-ayu",
        customerId: "cust-rina",
        direction: "outbound",
        text: "Aman kak untuk rutinitas harian, tapi hasil tiap orang beda ya.",
        createdAt: "2026-06-10T09:02:00.000Z"
      },
      {
        id: "msg-003",
        distributorId: "dist-ayu",
        customerId: "cust-dewi",
        direction: "inbound",
        text: "Aku mau order Glow Serum 2 pcs, total berapa ke Bekasi?",
        createdAt: "2026-06-11T13:15:00.000Z"
      },
      {
        id: "msg-004",
        distributorId: "dist-bima",
        customerId: "cust-eka",
        direction: "inbound",
        text: "Fit Coffee ini bisa nurunin BB pasti ga?",
        createdAt: "2026-06-11T15:30:00.000Z"
      }
    ],
    orders: [
      {
        id: "ord-001",
        distributorId: "dist-ayu",
        customerId: "cust-rina",
        items: [{ productId: "prod-glow-serum", quantity: 1, unitPriceIdr: 149000 }],
        totalIdr: 149000,
        status: "paid",
        createdAt: "2026-06-02T10:00:00.000Z"
      }
    ],
    campaigns: [
      {
        id: "camp-001",
        distributorId: "dist-ayu",
        name: "Glow Serum - Flek Concern",
        productId: "prod-glow-serum",
        spendIdr: 450000,
        leads: 38,
        sales: 7,
        revenueIdr: 1043000,
        creativeAngle: "before-after soft claim",
        date: "2026-06-10"
      },
      {
        id: "camp-002",
        distributorId: "dist-bima",
        name: "Fit Coffee - Morning Habit",
        productId: "prod-fit-coffee",
        spendIdr: 320000,
        leads: 44,
        sales: 5,
        revenueIdr: 495000,
        creativeAngle: "habit replacement",
        date: "2026-06-10"
      }
    ],
    patterns: [
      {
        id: "pat-001",
        productId: "prod-glow-serum",
        category: "skincare",
        hook: "kulit kusam setelah sering outdoor",
        objection: "takut klaim terlalu instan",
        cta: "ajak mulai dari 1 botol dan pantau 14 hari",
        confidence: "high",
        sampleSize: 41
      },
      {
        id: "pat-002",
        productId: "prod-fit-coffee",
        category: "wellness",
        hook: "ganti kopi manis pagi dengan opsi lebih ringan",
        objection: "takut dijanjikan turun berat badan",
        cta: "tawarkan trial pack tanpa janji hasil medis",
        confidence: "medium",
        sampleSize: 23
      }
    ],
    idempotency: new Map<string, unknown>()
  };
}

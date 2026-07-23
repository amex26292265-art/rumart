import "dotenv/config";
import { hashPassword } from "../src/lib/password";
import { makePrisma } from "../scripts/_db";

// Engine-less client over the Neon driver adapter (direct connection).
const prisma = makePrisma();

/**
 * Seeds ONLY structural data — admin user, supplier, categories, a default
 * pricing rule, and disabled sample sync rules. No fake products, reviews, or
 * stats: the catalog stays empty until a real sync imports real listings.
 */
async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@rumart.xyz").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "rumart-admin-2026";
  await prisma.user.upsert({
    where: { email },
    update: { role: "admin" },
    create: { email, passwordHash: await hashPassword(password), name: "Admin", role: "admin" },
  });

  await prisma.supplier.upsert({
    where: { slug: "lzt" },
    update: {},
    create: { slug: "lzt", name: "LZT Market" },
  });

  await prisma.supplier.upsert({
    where: { slug: "manual" },
    update: {},
    create: { slug: "manual", name: "Manual / Custom" },
  });

  const categories = [
    { slug: "steam", name: "Steam", icon: "Gamepad2", accent: "#1b2838", supplierCategory: "steam", featured: true, order: 0, description: "Steam accounts with games (CS2, Rust, GTA V, PUBG), wallet balance and inventory." },
    { slug: "fortnite", name: "Fortnite", icon: "Swords", accent: "#7c3aed", supplierCategory: "fortnite", featured: true, order: 1, description: "Fortnite accounts with rare skins, V-Bucks and battle pass progress." },
    { slug: "valorant", name: "Valorant", icon: "Crosshair", accent: "#ff4655", supplierCategory: "riot", featured: true, order: 2, description: "Riot / Valorant accounts with agents, skins and ranked history." },
    { slug: "ea", name: "EA / FIFA", icon: "Trophy", accent: "#0a1f3c", supplierCategory: "ea", featured: true, order: 3, description: "EA App accounts — EA FC / FIFA, Apex Legends, Battlefield and more." },
    { slug: "gta", name: "GTA V", icon: "Car", accent: "#43a047", supplierCategory: "socialclub", featured: true, order: 4, description: "Rockstar / Social Club accounts with GTA Online cash and unlocks." },
    { slug: "discord", name: "Discord", icon: "MessageCircle", accent: "#5865f2", supplierCategory: "discord", featured: true, order: 5, description: "Discord accounts, aged and verified." },
    { slug: "telegram", name: "Telegram", icon: "Send", accent: "#229ed9", supplierCategory: "telegram", featured: false, order: 6, description: "Telegram accounts across regions." },
    { slug: "genshin", name: "Genshin Impact", icon: "Sparkles", accent: "#5b8cff", supplierCategory: "mihoyo", featured: false, order: 7, description: "miHoYo accounts — Genshin Impact & Honkai with characters and wishes." },
    { slug: "epicgames", name: "Epic Games", icon: "Gamepad", accent: "#2f2f2f", supplierCategory: "epicgames", featured: false, order: 8, description: "Epic Games accounts with full game libraries." },
    { slug: "roblox", name: "Roblox", icon: "Blocks", accent: "#e2231a", supplierCategory: "roblox", featured: false, order: 9, description: "Roblox accounts with Robux and limiteds." },
    { slug: "minecraft", name: "Minecraft", icon: "Box", accent: "#3ab54a", supplierCategory: "minecraft", featured: false, order: 10, description: "Minecraft Java & Bedrock accounts." },
    { slug: "supercell", name: "Supercell", icon: "Castle", accent: "#f9a825", supplierCategory: "supercell", featured: false, order: 11, description: "Clash of Clans, Brawl Stars and Clash Royale accounts." },
    { slug: "warface", name: "Warface", icon: "Crosshair", accent: "#e65100", supplierCategory: "warface", featured: false, order: 12, description: "Warface accounts with rank, weapons and inventory." },
    { slug: "battlenet", name: "Battle.net", icon: "Gamepad", accent: "#00aeff", supplierCategory: "battlenet", featured: false, order: 13, description: "Blizzard Battle.net accounts — Overwatch, Diablo, CoD." },
    { slug: "uplay", name: "Ubisoft", icon: "Gamepad", accent: "#0070ff", supplierCategory: "uplay", featured: false, order: 14, description: "Ubisoft Connect accounts with game libraries." },
    { slug: "vpn", name: "VPN", icon: "Shield", accent: "#334155", supplierCategory: "vpn", featured: false, order: 15, description: "Premium VPN subscriptions." },
    { slug: "instagram", name: "Instagram", icon: "AtSign", accent: "#e1306c", supplierCategory: "instagram", featured: false, order: 16, description: "Instagram accounts, aged and with followers." },
    { slug: "tiktok", name: "TikTok", icon: "Music", accent: "#111827", supplierCategory: "tiktok", featured: false, order: 17, description: "TikTok accounts across regions." },
    { slug: "giftcards", name: "Gift Cards", icon: "Gift", accent: "#16a34a", supplierCategory: "gifts", featured: false, order: 18, description: "Digital gift cards and top-ups." },
    // AI & digital (manual catalog)
    { slug: "ai", name: "AI Subscriptions", icon: "Sparkles", accent: "#8b5cf6", supplierCategory: null, featured: true, order: 19, description: "ChatGPT, Claude, Gemini, Cursor, Midjourney and more." },
    { slug: "chatgpt", name: "ChatGPT", icon: "Bot", accent: "#10a37f", supplierCategory: null, featured: false, order: 20, description: "ChatGPT Plus / Team access." },
    { slug: "claude", name: "Claude", icon: "Bot", accent: "#d97706", supplierCategory: null, featured: false, order: 21, description: "Claude Pro subscriptions." },
    { slug: "gemini", name: "Gemini", icon: "Sparkles", accent: "#4285f4", supplierCategory: null, featured: false, order: 22, description: "Gemini Advanced." },
    { slug: "perplexity", name: "Perplexity", icon: "Search", accent: "#22d3ee", supplierCategory: null, featured: false, order: 23, description: "Perplexity Pro." },
    { slug: "midjourney", name: "Midjourney", icon: "Image", accent: "#a855f7", supplierCategory: null, featured: false, order: 24, description: "Midjourney image generation." },
    { slug: "copilot", name: "GitHub Copilot", icon: "Code", accent: "#24292f", supplierCategory: null, featured: false, order: 25, description: "GitHub Copilot subscriptions." },
    { slug: "cursor", name: "Cursor Pro", icon: "Code", accent: "#8b5cf6", supplierCategory: null, featured: false, order: 26, description: "Cursor Pro IDE access." },
    { slug: "notion-ai", name: "Notion AI", icon: "FileText", accent: "#111827", supplierCategory: null, featured: false, order: 27, description: "Notion AI workspace tools." },
    { slug: "grammarly", name: "Grammarly", icon: "PenLine", accent: "#15c39a", supplierCategory: null, featured: false, order: 28, description: "Grammarly Premium." },
    { slug: "canva", name: "Canva Pro", icon: "Palette", accent: "#00c4cc", supplierCategory: null, featured: false, order: 29, description: "Canva Pro design suite." },
    { slug: "capcut", name: "CapCut Pro", icon: "Clapperboard", accent: "#000000", supplierCategory: null, featured: false, order: 30, description: "CapCut Pro editing." },
    { slug: "adobe", name: "Adobe", icon: "Aperture", accent: "#eb1000", supplierCategory: null, featured: false, order: 31, description: "Adobe Creative Cloud." },
    { slug: "jetbrains", name: "JetBrains", icon: "Code2", accent: "#000000", supplierCategory: null, featured: false, order: 32, description: "JetBrains IDE licenses." },
    { slug: "m365", name: "Microsoft 365", icon: "AppWindow", accent: "#d83b01", supplierCategory: null, featured: false, order: 33, description: "Microsoft 365 subscriptions." },
    { slug: "netflix", name: "Netflix", icon: "Tv", accent: "#e50914", supplierCategory: null, featured: false, order: 34, description: "Netflix streaming." },
    { slug: "spotify", name: "Spotify", icon: "Music2", accent: "#1db954", supplierCategory: null, featured: false, order: 35, description: "Spotify Premium." },
    { slug: "disney", name: "Disney+", icon: "Tv", accent: "#113ccf", supplierCategory: null, featured: false, order: 36, description: "Disney+ streaming." },
    { slug: "software", name: "Software", icon: "Package", accent: "#6366f1", supplierCategory: null, featured: false, order: 37, description: "Licenses, templates, and digital downloads." },
    { slug: "hosting", name: "Hosting", icon: "Server", accent: "#0ea5e9", supplierCategory: null, featured: false, order: 38, description: "Hosting plans and VPS." },
    { slug: "domains", name: "Domains", icon: "Globe", accent: "#14b8a6", supplierCategory: null, featured: false, order: 39, description: "Domain names and transfers." },
    { slug: "devtools", name: "Dev Tools", icon: "Terminal", accent: "#a78bfa", supplierCategory: null, featured: false, order: 40, description: "Developer tools and SaaS." },
  ];

  const idBySlug: Record<string, string> = {};
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        icon: c.icon,
        accent: c.accent,
        supplierCategory: c.supplierCategory,
        featured: c.featured,
        order: c.order,
        description: c.description,
      },
      create: {
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        accent: c.accent,
        supplierCategory: c.supplierCategory,
        featured: c.featured,
        order: c.order,
        description: c.description,
      },
    });
    idBySlug[c.slug] = row.id;
  }

  // Default global pricing rule: +25%, minimum $1 margin, rounded up to .99.
  const existingGlobal = await prisma.pricingRule.findFirst({ where: { categoryId: null } });
  if (!existingGlobal) {
    await prisma.pricingRule.create({
      data: { name: "Global markup", type: "percent", value: 25, minMargin: 1, rounding: "up_99", priority: 0 },
    });
  }

  // Sample sync rules (disabled) so the admin has editable examples ready.
  for (const slug of ["steam", "fortnite", "discord"]) {
    const name = `${slug} — auto delivery`;
    const exists = await prisma.syncRule.findFirst({ where: { name } });
    if (!exists) {
      await prisma.syncRule.create({
        data: {
          name,
          enabled: false,
          categoryId: idBySlug[slug],
          supplierCategory: slug === "fortnite" ? "fortnite" : slug === "discord" ? "discord" : "steam",
          autoDeliveryOnly: true,
          maxSupplierPrice: 50,
          minSellerRating: 0,
          maxImport: 30,
        },
      });
    }
  }

  await prisma.setting.upsert({
    where: { key: "currency" },
    update: {},
    create: { key: "currency", value: process.env.SITE_CURRENCY ?? "USD" },
  });

  console.log("Seed complete ✔ (structure only — catalog is intentionally empty)");
  console.log(`Admin: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

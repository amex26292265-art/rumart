import { Container } from "@/components/ui/container";
import { CategoryBanners } from "@/components/store/CategoryGrid";
import { SectionHeader } from "@/components/store/SectionHeader";
import { getAllCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

const AI_LIKE = new Set([
  "ai",
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
  "midjourney",
  "copilot",
  "cursor",
  "notion-ai",
  "grammarly",
  "canva",
  "capcut",
  "adobe",
  "jetbrains",
  "m365",
  "software",
  "hosting",
  "domains",
  "devtools",
]);

export default async function CategoriesPage() {
  const categories = await getAllCategories();
  const mapped = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    accent: c.accent,
    count: c._count.products,
    description: c.description,
  }));
  const games = mapped.filter((c) => !AI_LIKE.has(c.slug) && !["netflix", "spotify", "disney", "vpn", "streaming"].includes(c.slug));
  const ai = mapped.filter((c) => AI_LIKE.has(c.slug));
  const other = mapped.filter((c) => ["netflix", "spotify", "disney", "vpn", "streaming"].includes(c.slug));

  return (
    <Container className="py-12">
      <SectionHeader title="All categories" subtitle="Cinematic banners across every product line" />
      <CategoryBanners categories={games.length ? games : mapped} />

      {(ai.length > 0 || other.length > 0) && (
        <div id="ai" className="mt-14 scroll-mt-24">
          <SectionHeader title="AI, software & streaming" subtitle="Subscriptions and creative tools" />
          <CategoryBanners categories={[...ai, ...other]} />
        </div>
      )}
    </Container>
  );
}

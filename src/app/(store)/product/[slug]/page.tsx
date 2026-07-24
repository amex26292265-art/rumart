import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail, Zap, Gamepad2, BadgeCheck, Star } from "lucide-react";
import { auth } from "@/auth";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { Reveal } from "@/components/ui/motion";
import { ProductCard } from "@/components/store/ProductCard";
import { getProductBySlug, getMarketplace } from "@/lib/queries";
import { countryLabel } from "@/lib/countries";
import { BuyPanel } from "./BuyPanel";

export const dynamic = "force-dynamic";

interface Row {
  label: string;
  value: string;
}
interface Section {
  title: string;
  rows: Row[];
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, session] = await Promise.all([getProductBySlug(slug), auth()]);
  if (!product || product.status !== "active") notFound();

  const attrs = (product.attributes as Record<string, unknown> | null) ?? {};
  const sections = (Array.isArray(attrs.sections) ? attrs.sections : []) as Section[];
  const games = (Array.isArray(attrs.games) ? attrs.games : []) as string[];
  const warranty = typeof attrs.warranty === "string" ? attrs.warranty : null;
  const emailNative = attrs.emailNative === true;
  const origin = typeof attrs.origin === "string" ? attrs.origin : null;
  const country = typeof attrs.country === "string" ? countryLabel(attrs.country) : null;
  const images = (Array.isArray(product.images) ? product.images : []) as string[];
  const gameImages = images.filter((u) => u.startsWith("https://")).slice(0, 6);
  const previewImages = images.filter((u) => u.startsWith("/api/supplier-image/")).slice(0, 2);

  const overview: Row[] = [
    { label: "Platform", value: product.category.name },
    { label: "Delivery", value: product.deliveryType === "auto" ? "Instant · automated" : "Manual fulfillment" },
    ...(country ? [{ label: "Region", value: country }] : []),
    ...(origin ? [{ label: "Account type", value: origin }] : []),
    ...(warranty ? [{ label: "Warranty", value: warranty }] : []),
    { label: "Email access", value: emailNative ? "Native (full access)" : "See details" },
    { label: "Wallet checkout", value: "Compatible" },
  ];

  const reviews = product.reviews ?? [];
  const avgRating =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  const related = (
    await getMarketplace({ category: product.category.slug, pageSize: 4, page: 1 })
  ).products.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <Container className="py-12">
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Reveal>
            <div className="flex items-start gap-4">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-white shadow-[0_0_28px_rgba(139,92,246,0.25)]"
                style={{ background: `linear-gradient(135deg, ${product.category.accent}, #07070b 150%)` }}
              >
                <BrandIcon slug={product.category.slug} className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{product.category.name}</Badge>
                  {product.deliveryType === "auto" && <Badge tone="success">Instant delivery</Badge>}
                  {avgRating != null && (
                    <Badge tone="neutral">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {avgRating.toFixed(1)}
                    </Badge>
                  )}
                </div>
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
                  {product.title}
                </h1>
                {product.description && <p className="mt-2 text-sm leading-relaxed text-ink-500">{product.description}</p>}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Highlight icon={Zap} tone="emerald" text="Credentials unlocked immediately after purchase" />
              {emailNative && <Highlight icon={Mail} tone="emerald" text="Access to account email (native)" />}
              {warranty && <Highlight icon={ShieldCheck} tone="ink" text={`${warranty} warranty`} />}
              <Highlight icon={BadgeCheck} tone="ink" text="Verified live inventory" />
            </div>
          </Reveal>

          {gameImages.length > 0 && (
            <Reveal delay={0.08}>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {gameImages.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="aspect-[460/215] w-full rounded-xl border border-mist-300 object-cover"
                  />
                ))}
              </div>
            </Reveal>
          )}

          <Reveal delay={0.1}>
            <SectionCard title="Product overview">
              <RowGrid rows={overview} />
            </SectionCard>
          </Reveal>

          {previewImages.length > 0 && (
            <Reveal delay={0.15}>
              <SectionCard title="Account preview">
                <div className="flex flex-col gap-3">
                  {previewImages.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt="Account contents preview"
                      loading="lazy"
                      className="w-full rounded-xl border border-mist-300"
                    />
                  ))}
                </div>
              </SectionCard>
            </Reveal>
          )}

          {sections.map((sec, i) => (
            <Reveal key={sec.title} delay={0.12 + i * 0.03}>
              <SectionCard title={sec.title}>
                <RowGrid rows={sec.rows} />
              </SectionCard>
            </Reveal>
          ))}

          {games.length > 0 && (
            <Reveal delay={0.2}>
              <SectionCard title={`Included games (${games.length})`} icon={<Gamepad2 className="h-5 w-5 text-ink-500" />}>
                <div className="flex flex-wrap gap-2">
                  {games.map((g, i) => (
                    <span key={i} className="rounded-lg bg-mist-200 px-2.5 py-1 text-xs font-medium text-ink-800">
                      {g}
                    </span>
                  ))}
                </div>
              </SectionCard>
            </Reveal>
          )}

          <Reveal delay={0.22}>
            <SectionCard title="Reviews">
              {reviews.length === 0 ? (
                <p className="text-sm text-ink-500">No reviews yet. Be the first after purchasing.</p>
              ) : (
                <ul className="space-y-4">
                  {reviews.slice(0, 8).map((r) => (
                    <li key={r.id} className="border-b border-mist-300 pb-3 last:border-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-ink-950">{r.user.name ?? r.user.email.split("@")[0]}</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </span>
                      </div>
                      {r.comment && <p className="mt-1 text-sm text-ink-500">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </Reveal>
        </div>

        <div className="lg:sticky lg:top-20">
          <BuyPanel
            productId={product.id}
            price={product.price}
            currency={product.currency}
            deliveryType={product.deliveryType}
            authenticated={Boolean(session?.user)}
          />
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold text-ink-950">Related products</h2>
            <Link href={`/marketplace?category=${product.category.slug}`} className="text-sm font-semibold text-accent-400">
              View category →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card mt-6 p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-ink-950">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function RowGrid({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-4 border-b border-mist-300 pb-2">
          <dt className="text-sm text-ink-500">{r.label}</dt>
          <dd className="text-right text-sm font-medium text-ink-950">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Highlight({
  icon: Icon,
  text,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  tone: "emerald" | "ink";
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-mist-300 bg-mist-100/60 px-3 py-2.5 text-sm">
      <Icon className={`h-4 w-4 shrink-0 ${tone === "emerald" ? "text-emerald-400" : "text-accent-400"}`} />
      <span className="text-ink-800">{text}</span>
    </div>
  );
}

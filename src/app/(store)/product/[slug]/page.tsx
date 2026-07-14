import { notFound } from "next/navigation";
import { ShieldCheck, Mail, Zap, Gamepad2, BadgeCheck } from "lucide-react";
import { auth } from "@/auth";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { Reveal } from "@/components/ui/motion";
import { getProductBySlug } from "@/lib/queries";
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

  // Overview rows (hide empty).
  const overview: Row[] = [
    { label: "Platform", value: product.category.name },
    { label: "Delivery", value: "Instant · automated" },
    ...(country ? [{ label: "Country", value: country }] : []),
    ...(origin ? [{ label: "Account type", value: origin }] : []),
    ...(warranty ? [{ label: "Warranty", value: warranty }] : []),
    { label: "Email access", value: emailNative ? "Native (full access)" : "See details" },
  ];

  return (
    <Container className="py-12">
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Reveal>
            <div className="flex items-start gap-4">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-white"
                style={{ background: `linear-gradient(135deg, ${product.category.accent}, #0a0a0b 150%)` }}
              >
                <BrandIcon slug={product.category.slug} className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <Badge tone="neutral">{product.category.name}</Badge>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-950">{product.title}</h1>
                {product.description && <p className="mt-1 text-sm text-ink-500">{product.description}</p>}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Highlight icon={Zap} tone="emerald" text="Account data delivered immediately after purchase" />
              {emailNative && <Highlight icon={Mail} tone="emerald" text="Access to account email (native)" />}
              {warranty && <Highlight icon={ShieldCheck} tone="ink" text={`${warranty} warranty`} />}
              <Highlight icon={BadgeCheck} tone="ink" text="Verified live from supplier" />
            </div>
          </Reveal>

          {/* Product Overview */}
          <Reveal delay={0.1}>
            <SectionCard title="Product overview">
              <RowGrid rows={overview} />
            </SectionCard>
          </Reveal>

          {/* Grouped API sections */}
          {sections.map((sec, i) => (
            <Reveal key={sec.title} delay={0.12 + i * 0.03}>
              <SectionCard title={sec.title}>
                <RowGrid rows={sec.rows} />
              </SectionCard>
            </Reveal>
          ))}

          {/* Games */}
          {games.length > 0 && (
            <Reveal delay={0.2}>
              <SectionCard title={`Included games (${games.length})`} icon={<Gamepad2 className="h-5 w-5 text-ink-500" />}>
                <div className="flex flex-wrap gap-2">
                  {games.map((g, i) => (
                    <span key={i} className="rounded-lg bg-mist-100 px-2.5 py-1 text-xs font-medium text-ink-700">
                      {g}
                    </span>
                  ))}
                </div>
              </SectionCard>
            </Reveal>
          )}
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
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-950">
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
        <div key={i} className="flex items-center justify-between gap-4 border-b border-mist-100 pb-2">
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
    <div className="flex items-center gap-2 rounded-xl border border-mist-200 bg-white px-3 py-2.5 text-sm">
      <Icon className={`h-4 w-4 shrink-0 ${tone === "emerald" ? "text-emerald-600" : "text-ink-500"}`} />
      <span className="text-ink-700">{text}</span>
    </div>
  );
}

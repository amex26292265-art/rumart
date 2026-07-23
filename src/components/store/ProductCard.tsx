"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShieldCheck, Zap, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { formatMoney } from "@/lib/utils";

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  price: number;
  currency: string;
  deliveryType: string;
  categoryName: string;
  categorySlug?: string;
  categoryIcon?: string | null;
  accent?: string;
  attributes?: Record<string, unknown> | null;
  images?: string[] | null;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const a = product.attributes ?? {};
  const country = typeof a.country === "string" ? a.country : null;
  const warranty = typeof a.warranty === "string" ? a.warranty : null;
  const emailNative = a.emailNative === true;
  const stats = (Array.isArray(a.stats) ? a.stats : []) as { label: string; value: string }[];
  const PRIORITY = [
    "Balance",
    "Inventory value",
    "Skin count",
    "Skins",
    "Account level",
    "Level",
    "Premium",
    "Nitro",
    "Followers count",
    "Channels count",
    "Register date",
    "Total games",
    "Country",
    "Region",
  ];
  const prioritized = PRIORITY.map((label) => stats.find((s) => s.label === label)).filter(
    (s): s is { label: string; value: string } => Boolean(s),
  );
  const keyStats = (prioritized.length ? prioritized : stats).slice(0, 2);
  const cardImage = (product.images ?? []).find((u) => u.startsWith("https://")) ?? null;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="card group relative flex flex-col overflow-hidden transition-shadow hover:shadow-[0_0_32px_rgba(139,92,246,0.18)]"
    >
      <Link href={`/product/${product.slug}`} prefetch={false} className="block">
        <div
          className="relative flex aspect-[16/10] items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${product.accent ?? "#4c1d95"} 0%, #07070b 130%)`,
          }}
        >
          {cardImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardImage}
              alt={product.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <BrandIcon
              slug={product.categorySlug}
              className="h-12 w-12 text-white/90 transition-transform duration-500 group-hover:scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-paper/80 via-transparent to-transparent" />
          <span className="absolute left-3 top-3">
            <Badge tone="dark">{product.categoryName}</Badge>
          </span>
          <button
            aria-label="Add to wishlist"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-mist-100/90 text-ink-500 backdrop-blur transition-colors hover:text-rose-400"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={`/product/${product.slug}`} prefetch={false}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-950 transition-colors group-hover:text-accent-400">
            {product.title}
          </h3>
        </Link>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-400">
            <Zap className="h-3 w-3" /> Instant
          </span>
          {emailNative && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-400">
              <Mail className="h-3 w-3" /> Email
            </span>
          )}
          {warranty && (
            <span className="inline-flex items-center gap-1 rounded-md bg-mist-200 px-1.5 py-0.5 font-medium text-ink-700">
              <ShieldCheck className="h-3 w-3" /> {warranty}
            </span>
          )}
          {country && (
            <span className="rounded-md bg-mist-200 px-1.5 py-0.5 font-medium uppercase text-ink-700">
              {country}
            </span>
          )}
        </div>

        {keyStats.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500">
            {keyStats.map((s, i) => (
              <span key={i}>
                <span className="font-medium text-ink-800">{s.value}</span> {s.label.toLowerCase()}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-bold text-ink-950">
            {formatMoney(product.price, product.currency)}
          </span>
          <span className="text-xs font-medium text-accent-400 opacity-0 transition-opacity group-hover:opacity-100">
            View →
          </span>
        </div>
      </div>
    </motion.article>
  );
}

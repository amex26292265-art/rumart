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
  // Show up to two compact key stats (e.g. register date, total games).
  const keyStats = stats
    .filter((s) => ["Register date", "Total games", "Balance", "Account level"].includes(s.label))
    .slice(0, 2);
  // Cards only use light CDN images (steam game headers). The heavy proxied
  // preview collages (/api/supplier-image/…) are reserved for detail pages.
  const cardImage = (product.images ?? []).find((u) => u.startsWith("https://")) ?? null;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="card group relative flex flex-col overflow-hidden"
    >
      <Link href={`/product/${product.slug}`} className="block">
        {/* Brand tile — generated gradient, no stock imagery */}
        <div
          className="relative flex aspect-[16/10] items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${product.accent ?? "#1d1d21"} 0%, #0a0a0b 130%)`,
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
          <span className="absolute left-3 top-3">
            <Badge tone="dark">{product.categoryName}</Badge>
          </span>
          <button
            aria-label="Add to wishlist"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-ink-500 backdrop-blur transition-colors hover:text-red-500"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-950 transition-colors group-hover:text-accent-600">
            {product.title}
          </h3>
        </Link>

        {/* Feature badges — parsed automatically from the account */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
            <Zap className="h-3 w-3" /> Instant
          </span>
          {emailNative && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
              <Mail className="h-3 w-3" /> Email
            </span>
          )}
          {warranty && (
            <span className="inline-flex items-center gap-1 rounded-md bg-mist-100 px-1.5 py-0.5 font-medium text-ink-600">
              <ShieldCheck className="h-3 w-3" /> {warranty}
            </span>
          )}
          {country && (
            <span className="rounded-md bg-mist-100 px-1.5 py-0.5 font-medium uppercase text-ink-600">
              {country}
            </span>
          )}
        </div>

        {/* Key parsed stats */}
        {keyStats.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500">
            {keyStats.map((s, i) => (
              <span key={i}>
                <span className="font-medium text-ink-700">{s.value}</span> {s.label.toLowerCase()}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-semibold text-ink-950">
            {formatMoney(product.price, product.currency)}
          </span>
          <span className="text-xs font-medium text-accent-600 opacity-0 transition-opacity group-hover:opacity-100">
            View →
          </span>
        </div>
      </div>
    </motion.article>
  );
}

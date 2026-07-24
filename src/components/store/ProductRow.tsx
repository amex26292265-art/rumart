"use client";

import Link from "next/link";
import { Heart, Scale, Zap, Mail, ShieldCheck, KeyRound, User, CalendarDays, Activity } from "lucide-react";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { formatMoney } from "@/lib/utils";
import { countryLabel } from "@/lib/countries";
import { useLocalList } from "./useLocalList";
import type { ProductCardData } from "./ProductCard";

/** Client only for wishlist/compare — no framer-motion (CSS hover). */
export function ProductRow({ product }: { product: ProductCardData }) {
  const wishlist = useLocalList("rumart:wishlist");
  const compare = useLocalList("rumart:compare");

  const a = product.attributes ?? {};
  const country = typeof a.country === "string" ? countryLabel(a.country) : null;
  const warranty = typeof a.warranty === "string" ? a.warranty : null;
  const emailNative = a.emailNative === true;
  const sda = a.sda === true;
  const personal = a.personal === true;
  const vac = a.vac === true;
  const level = typeof a.level === "number" ? a.level : null;
  const registerDate = typeof a.registerDate === "string" ? a.registerDate : null;
  const lastActivity = typeof a.lastActivity === "string" ? a.lastActivity : null;
  const games = (Array.isArray(a.games) ? a.games : []) as string[];
  const shownGames = games.slice(0, 6);
  const moreGames = games.length - shownGames.length;

  const href = `/product/${product.slug}`;

  return (
    <article className="card group relative flex flex-col gap-4 p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(139,92,246,0.15)] sm:flex-row">
      <Link
        href={href}
        className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-white sm:h-20 sm:w-20"
        style={{ background: `linear-gradient(135deg, ${product.accent ?? "#7c3aed"}, #07070b 150%)` }}
      >
        <BrandIcon slug={product.categorySlug} className="h-8 w-8 transition-transform duration-300 group-hover:scale-110" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-ink-950 transition-colors group-hover:text-accent-400">
              {product.title}
            </h3>
          </Link>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          {product.deliveryType === "auto" && <Chip tone="emerald" icon={Zap}>Instant</Chip>}
          {emailNative && <Chip tone="emerald" icon={Mail}>Native email</Chip>}
          {sda && <Chip icon={KeyRound}>SDA</Chip>}
          {personal && <Chip icon={User}>Personal</Chip>}
          {warranty && <Chip icon={ShieldCheck}>{warranty}</Chip>}
          {vac && <Chip tone="red">VAC</Chip>}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-500">
          {country && <span>{country}</span>}
          {registerDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> Reg. {registerDate}
            </span>
          )}
          {lastActivity && (
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3 w-3" /> Active {lastActivity}
            </span>
          )}
          {level !== null && <span>Level {level}</span>}
        </div>

        {shownGames.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {shownGames.map((g, i) => (
              <span key={i} className="max-w-[160px] truncate rounded-md bg-mist-200 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                {g}
              </span>
            ))}
            {moreGames > 0 && (
              <span className="rounded-md bg-accent-500/10 px-2 py-0.5 text-[11px] font-semibold text-accent-400">
                +{moreGames} more
              </span>
            )}
          </div>
        )}

        {product.description && (
          <p className="mt-2 line-clamp-1 text-xs text-ink-500">{product.description}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-mist-300 pt-3 sm:w-40 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
        <span className="text-2xl font-bold text-ink-950">{formatMoney(product.price, product.currency)}</span>
        <div className="flex items-center gap-2">
          <IconButton active={wishlist.has(product.id)} onClick={() => wishlist.toggle(product.id)} label="Wishlist" activeClass="border-rose-500/40 bg-rose-500/10 text-rose-400">
            <Heart className={`h-4 w-4 ${wishlist.has(product.id) ? "fill-rose-400" : ""}`} />
          </IconButton>
          <IconButton active={compare.has(product.id)} onClick={() => compare.toggle(product.id)} label="Compare" activeClass="border-accent-500/40 bg-accent-500/10 text-accent-400">
            <Scale className="h-4 w-4" />
          </IconButton>
          <Link
            href={href}
            className="rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(139,92,246,0.3)] transition-opacity hover:opacity-90"
          >
            Buy
          </Link>
        </div>
      </div>
    </article>
  );
}

function Chip({
  children,
  icon: Icon,
  tone = "neutral",
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "emerald" | "red";
}) {
  const tones = {
    neutral: "bg-mist-200 text-ink-700",
    emerald: "bg-emerald-500/15 text-emerald-400",
    red: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${tones[tone]}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

function IconButton({
  children,
  onClick,
  active,
  label,
  activeClass,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  label: string;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
        active ? activeClass : "border-mist-300 text-ink-500 hover:border-accent-500/40 hover:text-ink-900"
      }`}
    >
      {children}
    </button>
  );
}

import type { Metadata } from "next";
import { Outfit, Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rumart.amex26292265.workers.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Rumart — Premium digital marketplace by Velexis",
    template: "%s · Rumart",
  },
  description:
    "Rumart by Velexis is a premium marketplace for game accounts, AI subscriptions, and digital goods — instant encrypted delivery.",
  openGraph: {
    title: "Rumart — Premium digital marketplace",
    description: "Instant, automated delivery of premium digital goods. Built by Velexis.",
    url: "/",
    siteName: "Rumart",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${syne.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}

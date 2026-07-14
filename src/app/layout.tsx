import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://rumart.xyz"),
  title: {
    default: "Rumart — Premium digital marketplace",
    template: "%s · Rumart",
  },
  description:
    "Rumart is a premium marketplace for digital accounts and goods, with instant automated delivery.",
  openGraph: {
    title: "Rumart — Premium digital marketplace",
    description: "Instant, automated delivery of premium digital goods.",
    url: "/",
    siteName: "Rumart",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}

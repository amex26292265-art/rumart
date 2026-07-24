import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware (required on Cloudflare OpenNext — Node `proxy.ts` is unsupported).
 *
 * When SITE_PUBLIC is not "true", the marketplace stays private: every page
 * rewrites to /coming-soon unless the visitor unlocked preview with
 * ?preview=<SITE_PREVIEW_SECRET> (cookie lasts 7 days).
 *
 * When public, anonymous catalog pages get short CDN cache headers so Cloudflare
 * can serve warm HTML without another Neon round-trip.
 */
const PREVIEW_COOKIE = "rumart_preview";

function isBypassPath(pathname: string): boolean {
  if (pathname === "/coming-soon" || pathname.startsWith("/coming-soon/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/admin/migrate")) return true;
  if (pathname.startsWith("/api/admin/reset-password")) return true;
  if (pathname.startsWith("/api/admin/purge-capture")) return true;
  if (pathname === "/favicon.ico" || pathname === "/icon.svg" || pathname === "/robots.txt") return true;
  if (/\.(?:ico|png|svg|jpg|jpeg|webp|gif|txt|xml|webmanifest)$/i.test(pathname)) return true;
  return false;
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get("__Secure-authjs.session-token") ||
      request.cookies.get("authjs.session-token") ||
      request.cookies.get("__Host-authjs.session-token") ||
      request.cookies.get("__Secure-next-auth.session-token") ||
      request.cookies.get("next-auth.session-token"),
  );
}

/** Anonymous-safe pages — same HTML for every visitor. */
function isAnonymousCatalog(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/marketplace" ||
    pathname === "/categories" ||
    pathname === "/faq" ||
    pathname === "/community"
  ) {
    return true;
  }
  if (pathname.startsWith("/product/")) return true;
  if (pathname.startsWith("/community/")) return true;
  if (pathname.startsWith("/seller/") && pathname !== "/seller") return true;
  if (pathname.startsWith("/u/")) return true;
  return false;
}

function withCatalogCache(request: NextRequest): NextResponse {
  const res = NextResponse.next();
  if (
    request.method === "GET" &&
    isAnonymousCatalog(request.nextUrl.pathname) &&
    !hasSessionCookie(request)
  ) {
    // Cloudflare edge can reuse this HTML briefly; browser stays revalidate.
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.headers.set("CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  }
  return res;
}

export function middleware(request: NextRequest) {
  if (process.env.SITE_PUBLIC === "true") {
    return withCatalogCache(request);
  }

  const { pathname } = request.nextUrl;
  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.SITE_PREVIEW_SECRET?.trim() ?? "";
  const previewParam = request.nextUrl.searchParams.get("preview");
  const previewCookie = request.cookies.get(PREVIEW_COOKIE)?.value;

  if (secret && previewParam === secret) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("preview");
    const res = NextResponse.redirect(clean);
    res.cookies.set(PREVIEW_COOKIE, secret, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  if (secret && previewCookie === secret) {
    return withCatalogCache(request);
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = "/coming-soon";
  rewriteUrl.search = "";
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  // Include `/` explicitly — the catch-all alone often skips the site root.
  matcher: ["/", "/((?!_next/static|_next/image).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Network boundary (Next.js 16 `proxy` replaces middleware).
 *
 * When SITE_PUBLIC is not "true", the marketplace stays private: every page
 * rewrites to /coming-soon unless the visitor unlocked preview with
 * ?preview=<SITE_PREVIEW_SECRET> (cookie lasts 7 days).
 *
 * Webhooks/cron/admin ops + static assets always pass through.
 */
const PREVIEW_COOKIE = "rumart_preview";

function isBypassPath(pathname: string): boolean {
  if (pathname === "/coming-soon" || pathname.startsWith("/coming-soon/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/api/admin/migrate")) return true;
  if (pathname.startsWith("/api/admin/reset-password")) return true;
  if (pathname === "/favicon.ico" || pathname === "/icon.svg" || pathname === "/robots.txt") return true;
  if (/\.(?:ico|png|svg|jpg|jpeg|webp|gif|txt|xml|webmanifest)$/i.test(pathname)) return true;
  return false;
}

export function proxy(request: NextRequest) {
  if (process.env.SITE_PUBLIC === "true") {
    return NextResponse.next();
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
    return NextResponse.next();
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = "/coming-soon";
  rewriteUrl.search = "";
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

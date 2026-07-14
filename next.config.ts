import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma engine files must not be bundled by the server build; let the
  // Worker resolve them at runtime.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon"],
};

export default nextConfig;

// Enable Cloudflare bindings during `next dev` (no-op outside OpenNext).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();

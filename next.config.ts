import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma (and its wasm query engine) out of Next's SSR chunk bundling so
  // the .wasm isn't inlined with a mangled absolute path — it's copied as a
  // normal node_module and loaded by the driver adapter at runtime instead.
  serverExternalPackages: ["@prisma/client", ".prisma/client", "@prisma/adapter-neon", "@neondatabase/serverless"],
};

export default nextConfig;

// Enable Cloudflare bindings during `next dev` (no-op outside OpenNext).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();

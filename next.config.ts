import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Enable Cloudflare bindings during `next dev` (no-op outside OpenNext).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();

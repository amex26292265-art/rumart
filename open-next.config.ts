import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext adapter config — deploys this Next.js app to Cloudflare Workers
// (the supported way to run a full Next.js app on Cloudflare; the old
// next-on-pages/Edge path can't run Prisma or Node crypto).
export default defineCloudflareConfig();

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Version-skew protection: an app left open during a deploy notices the new
  // version and does a full reload on its next navigation instead of breaking.
  // VERCEL_DEPLOYMENT_ID is set by Vercel at build time; undefined locally.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}

export default nextConfig

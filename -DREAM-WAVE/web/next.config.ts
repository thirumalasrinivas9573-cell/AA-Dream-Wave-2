import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dream Wave — Next.js configuration (foundation).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  turbopack: {
    root: projectRoot,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "zod",
      "@hookform/resolvers",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
    {
      source: "/:path*.(js|css|woff2|woff|svg|png|jpg|jpeg|webp|avif|ico)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
};

export default nextConfig;

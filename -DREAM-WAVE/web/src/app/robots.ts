import type { MetadataRoute } from "next";

import { appConfig } from "@/config/app.config";

/**
 * Production robots policy — index marketing; keep auth and app shells private.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/settings",
        "/onboarding",
        "/goals",
        "/tasks",
        "/mentor",
        "/roadmap",
        "/books",
        "/reports",
        "/ai",
        "/learn",
        "/institution",
        "/research",
        "/community",
        "/workspace",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: `${appConfig.url}/sitemap.xml`,
    host: appConfig.url,
  };
}

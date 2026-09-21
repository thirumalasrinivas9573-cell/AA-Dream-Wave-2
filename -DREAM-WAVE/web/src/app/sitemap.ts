import type { MetadataRoute } from "next";

import { appConfig } from "@/config/app.config";
import { INSTITUTION_DIRECTORY } from "@/constants/institution-directory";

/**
 * Public marketing sitemap for Version 1.0.0 production discovery.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appConfig.url.replace(/\/$/, "");
  const now = new Date();

  const institutionEntries: MetadataRoute.Sitemap = INSTITUTION_DIRECTORY.map(
    (institution) => ({
      url: `${base}/institutions/${institution.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/institutions`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/institutions/compare`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...institutionEntries,
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}

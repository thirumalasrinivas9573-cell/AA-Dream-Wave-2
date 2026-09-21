import type { MetadataRoute } from "next";

import { appConfig } from "@/config/app.config";
import { APP_DESCRIPTION, APP_NAME } from "@/constants";

/**
 * Web app manifest for Dream Wave Frontend Version 1.0.0.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: "DreamWave",
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    lang: "en",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    id: appConfig.url,
  };
}

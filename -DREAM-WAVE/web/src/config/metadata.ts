import type { Metadata, Viewport } from "next";

import { appConfig } from "@/config/app.config";
import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "@/constants";

const keywords = [
  "Dream Wave",
  "AI learning",
  "education platform",
  "enterprise learning",
  "online education",
] as const;

/**
 * Global SEO / social metadata for Version 1.0.0 production.
 */
export const siteMetadata: Metadata = {
  metadataBase: new URL(appConfig.url),
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: `${APP_NAME} ${APP_VERSION}`,
  keywords: [...keywords],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appConfig.url,
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
  },
  manifest: "/manifest.webmanifest",
  category: "education",
  other: {
    "application-version": APP_VERSION,
  },
};

/**
 * Viewport + theme-color foundation (semantic light/dark surfaces).
 */
export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

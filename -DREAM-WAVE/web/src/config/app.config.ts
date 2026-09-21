import { getPublicEnv } from "@/config/env";
import {
  ANIMATION_DURATION,
  ANIMATION_EASE,
  APP_DESCRIPTION,
  APP_VERSION,
  BREAKPOINTS,
  LAYOUT,
  ROUTES,
  STORAGE_KEYS,
  SUPPORTED_THEMES,
} from "@/constants";
import { themeConfig } from "@/themes";

/**
 * Dream Wave — Centralized application configuration.
 * Prefer importing `appConfig` over scattering magic values.
 */

const publicEnv = getPublicEnv();

export const appConfig = {
  name: publicEnv.NEXT_PUBLIC_APP_NAME,
  description: APP_DESCRIPTION,
  version: APP_VERSION,
  url: publicEnv.NEXT_PUBLIC_APP_URL,
  env: publicEnv.NEXT_PUBLIC_APP_ENV,
  api: {
    baseUrl: publicEnv.NEXT_PUBLIC_API_BASE_URL,
  },
  features: {
    analytics: publicEnv.NEXT_PUBLIC_ENABLE_ANALYTICS,
    threeJs: publicEnv.NEXT_PUBLIC_ENABLE_THREE_JS,
  },
  theme: {
    ...themeConfig,
    supported: SUPPORTED_THEMES,
  },
  routes: ROUTES,
  layout: LAYOUT,
  breakpoints: BREAKPOINTS,
  animation: {
    duration: ANIMATION_DURATION,
    ease: ANIMATION_EASE,
  },
  storageKeys: STORAGE_KEYS,
} as const;

export type AppConfig = typeof appConfig;

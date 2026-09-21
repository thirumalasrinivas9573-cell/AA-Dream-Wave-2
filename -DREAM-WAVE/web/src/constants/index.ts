/**
 * Dream Wave — Global constants barrel.
 */

export const APP_NAME = "Dream Wave" as const;
export const APP_DESCRIPTION = "Enterprise AI Learning Platform" as const;
export const APP_VERSION = "1.0.0" as const;

export const SUPPORTED_THEMES = ["light", "dark", "system"] as const;
export type SupportedTheme = (typeof SUPPORTED_THEMES)[number];

export {
  ANIMATION_DURATION,
  ANIMATION_EASE,
  REDUCED_MOTION_QUERY,
} from "@/constants/animation";
export { AUTH_ROUTES, type AuthRoute } from "@/constants/auth";
export { type BreakpointKey, BREAKPOINTS } from "@/constants/breakpoints";
export {
  LANDING_AI_CAPABILITIES,
  LANDING_FEATURES,
  LANDING_STATS,
  LANDING_TESTIMONIALS,
  type LandingAiCapability,
  type LandingFeature,
  type LandingStat,
  type LandingTestimonial,
} from "@/constants/landing";
export { CONTAINER_SIZES, LAYOUT } from "@/constants/layout";
export {
  DISCOVERY_ROUTES,
  FOOTER_CONTACT,
  FOOTER_LEGAL_LINKS,
  FOOTER_LINK_GROUPS,
  FOOTER_SOCIAL_LINKS,
  MARKETING_AUTH_ROUTES,
  MARKETING_NAV_LINKS,
} from "@/constants/navigation";
export { type AppRoute, ROUTES } from "@/constants/routes";
export { STORAGE_KEYS, type StorageKey } from "@/constants/storage";
export { FONT_FAMILIES, FONT_WEIGHTS } from "@/constants/typography";
export { Z_INDEX } from "@/constants/z-index";

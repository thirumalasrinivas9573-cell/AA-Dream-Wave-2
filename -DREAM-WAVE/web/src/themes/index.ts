import { STORAGE_KEYS } from "@/constants/storage";
import type { ThemeConfig } from "@/types/theme";

/**
 * Dream Wave — Theme foundation.
 *
 * Semantic CSS variables live in `globals.css`.
 * Brand token overrides are deferred to the Design System phase.
 */

export const THEME_STORAGE_KEY = STORAGE_KEYS.theme;

export const THEME_ATTRIBUTE = "class" as const;

export const themeConfig: ThemeConfig = {
  defaultTheme: "system",
  storageKey: THEME_STORAGE_KEY,
  attribute: THEME_ATTRIBUTE,
  enableSystem: true,
};

/**
 * Reserved token slots for future design-system work.
 * Do not hardcode brand colors here.
 */
export const THEME_TOKEN_SLOTS = [
  "color.primary",
  "color.secondary",
  "color.success",
  "color.warning",
  "color.danger",
  "color.background",
  "color.surface",
  "color.border",
  "color.text.primary",
  "color.text.secondary",
  "color.muted",
  "color.accent",
  "radius",
  "elevation",
  "motion.duration",
] as const;

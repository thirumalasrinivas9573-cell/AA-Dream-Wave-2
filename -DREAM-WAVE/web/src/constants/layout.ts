/**
 * Layout dimension constants (px unless noted).
 */

export const LAYOUT = {
  headerHeight: 64,
  footerHeight: 72,
  sidebarWidth: 280,
  sidebarCollapsedWidth: 72,
  containerMaxWidth: 1280,
  contentMaxWidth: 960,
} as const;

export const CONTAINER_SIZES = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

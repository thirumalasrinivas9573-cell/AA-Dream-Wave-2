/**
 * Responsive breakpoint constants (px).
 * Keep aligned with `src/app/globals.css` `@theme` breakpoints.
 */

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

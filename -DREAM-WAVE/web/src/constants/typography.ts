/**
 * Typography foundation constants.
 * Font loading lives in `src/lib/fonts.ts`.
 */

export const FONT_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const FONT_FAMILIES = {
  primary: "var(--font-sans)",
  secondary: "var(--font-mono)",
  heading: "var(--font-heading)",
  mono: "var(--font-mono)",
} as const;

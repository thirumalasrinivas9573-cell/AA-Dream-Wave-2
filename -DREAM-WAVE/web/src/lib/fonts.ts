import { Geist, Geist_Mono } from "next/font/google";

/**
 * Dream Wave — Font loading foundation.
 *
 * Primary: Geist Sans (`--font-sans`, also mapped to `--font-heading`)
 * Secondary: Geist Mono (`--font-mono`)
 *
 * Typography scale / component styles are deferred to the Design System phase.
 */

export const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
  adjustFontFallback: true,
});

export const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
  adjustFontFallback: true,
});

export const fontVariables = `${fontSans.variable} ${fontMono.variable}`;

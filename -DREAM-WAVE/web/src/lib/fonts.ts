import {
  Be_Vietnam_Pro,
  IBM_Plex_Sans,
  Lexend,
  Manrope,
  Outfit,
  Plus_Jakarta_Sans,
  Sora,
  Space_Grotesk,
} from "next/font/google";

/**
 * Dream Wave — 4-Theme Font Loading Foundation.
 *
 * Barely Working: Sora / IBM Plex Sans
 * Delulu Daylight: Outfit / Plus Jakarta Sans
 * Green Flag Energy: Lexend / Be Vietnam Pro
 * Midnight Intelligence: Space Grotesk / Manrope
 */

export const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex",
  display: "swap",
});

export const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

export const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const fontVariables = `${sora.variable} ${ibmPlexSans.variable} ${outfit.variable} ${plusJakartaSans.variable} ${lexend.variable} ${beVietnamPro.variable} ${spaceGrotesk.variable} ${manrope.variable}`;


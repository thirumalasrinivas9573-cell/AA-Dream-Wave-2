"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

import { themeConfig } from "@/themes";

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * Theme provider — light / dark / system with persistence.
 * Color transitions are handled in CSS and respect reduced motion.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={themeConfig.attribute}
      defaultTheme={themeConfig.defaultTheme}
      enableSystem={themeConfig.enableSystem}
      storageKey={themeConfig.storageKey}
      disableTransitionOnChange={false}
      enableColorScheme
    >
      {children}
    </NextThemesProvider>
  );
}

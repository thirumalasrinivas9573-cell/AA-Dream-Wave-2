"use client";

import { useTheme as useNextTheme } from "next-themes";

import type { ThemeMode } from "@/types/theme";

/**
 * Theme access hook wrapping next-themes with Dream Wave types.
 */
export function useTheme() {
  const themeApi = useNextTheme();

  return {
    ...themeApi,
    theme: themeApi.theme as ThemeMode | undefined,
    setTheme: (theme: ThemeMode) => {
      themeApi.setTheme(theme);
    },
  };
}

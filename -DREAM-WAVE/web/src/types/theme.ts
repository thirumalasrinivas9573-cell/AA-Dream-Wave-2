export type ThemeMode = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

export type ThemeConfig = {
  defaultTheme: ThemeMode;
  storageKey: string;
  attribute: "class" | "data-theme";
  enableSystem: boolean;
};

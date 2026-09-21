import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";

type DynamicOptions = {
  ssr?: boolean;
  loading?: () => ReactNode;
};

/**
 * Client-only dynamic import helper for heavy UI (Three.js, charts, etc.).
 */
export function lazyClientComponent<TProps extends object>(
  loader: () => Promise<{ default: ComponentType<TProps> }>,
  options: DynamicOptions = {},
) {
  if (options.loading) {
    return dynamic(loader, {
      ssr: options.ssr ?? false,
      loading: options.loading,
    });
  }

  return dynamic(loader, {
    ssr: options.ssr ?? false,
  });
}

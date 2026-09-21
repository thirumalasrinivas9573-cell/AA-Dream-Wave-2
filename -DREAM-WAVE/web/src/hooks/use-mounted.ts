"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns true after the component has mounted on the client.
 * Useful for avoiding hydration mismatches.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

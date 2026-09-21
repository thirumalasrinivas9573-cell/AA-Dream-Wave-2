"use client";

import { useEffect } from "react";

type KeyboardHandler = (event: KeyboardEvent) => void;

type UseKeyboardOptions = {
  enabled?: boolean;
  event?: "keydown" | "keyup";
  target?: Window | Document | HTMLElement | null;
};

/**
 * Attach a keyboard event listener with cleanup.
 */
export function useKeyboard(
  handler: KeyboardHandler,
  options: UseKeyboardOptions = {},
): void {
  const { enabled = true, event = "keydown", target } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const element: Window | Document | HTMLElement =
      target ?? (typeof window !== "undefined" ? window : document);

    element.addEventListener(event, handler as EventListener);
    return () => element.removeEventListener(event, handler as EventListener);
  }, [enabled, event, handler, target]);
}

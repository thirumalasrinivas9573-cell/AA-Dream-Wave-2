"use client";

import type { ReactNode } from "react";

/**
 * Lightweight route enter transition for App Router templates.
 * Honors prefers-reduced-motion via CSS.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="page-enter flex min-h-0 flex-1 flex-col">{children}</div>;
}

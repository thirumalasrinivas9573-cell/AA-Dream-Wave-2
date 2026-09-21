"use client";

import type { ReactNode } from "react";

import { TooltipProvider as UiTooltipProvider } from "@/components/ui/tooltip";

type TooltipProviderProps = {
  children: ReactNode;
  delay?: number;
};

/**
 * Application-level tooltip provider shell.
 * Wraps the shadcn/ui TooltipProvider with Dream Wave defaults.
 */
export function TooltipProvider({
  children,
  delay = 200,
}: TooltipProviderProps) {
  return <UiTooltipProvider delay={delay}>{children}</UiTooltipProvider>;
}

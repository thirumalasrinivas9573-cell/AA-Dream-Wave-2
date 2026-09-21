"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type RetryActionProps = {
  onRetry: () => void;
  label?: string;
  disabled?: boolean;
  children?: ReactNode;
};

/**
 * Standard retry action pattern for error/empty recovery flows.
 */
export function RetryAction({
  onRetry,
  label = "Try again",
  disabled = false,
  children,
}: RetryActionProps) {
  return (
    <Button type="button" onClick={onRetry} disabled={disabled}>
      {children ?? label}
    </Button>
  );
}

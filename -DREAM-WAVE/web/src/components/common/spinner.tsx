import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  label?: string;
  children?: ReactNode;
};

/**
 * Structural loading spinner foundation.
 * Visual design refinements deferred to Design System phase.
 */
export function Spinner({
  className,
  label = "Loading",
  children,
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span
        className="border-muted border-t-foreground size-4 shrink-0 animate-spin rounded-full border-2 motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

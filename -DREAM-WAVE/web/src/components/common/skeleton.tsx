import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
  children?: ReactNode;
};

/**
 * Structural skeleton placeholder for loading states.
 */
export function Skeleton({ className, children }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-md motion-reduce:bg-muted/80 motion-reduce:animate-pulse",
        className,
      )}
      aria-hidden={children ? undefined : true}
    >
      {children}
    </div>
  );
}

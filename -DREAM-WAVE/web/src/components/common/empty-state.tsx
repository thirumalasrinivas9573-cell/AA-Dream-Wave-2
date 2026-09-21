import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  illustration?: ReactNode;
  /** Heading element for document outline; default h2. */
  titleAs?: "h2" | "h3" | "p";
  className?: string;
};

/**
 * Accessible empty-state shell used across platform modules.
 */
export function EmptyState({
  title,
  description,
  action,
  illustration,
  titleAs = "h2",
  className,
}: EmptyStateProps) {
  const titleClassName = "text-lg font-medium tracking-tight";
  const titleNode =
    titleAs === "h3" ? (
      <h3 className={titleClassName}>{title}</h3>
    ) : titleAs === "p" ? (
      <p className={titleClassName}>{title}</p>
    ) : (
      <h2 className={titleClassName}>{title}</h2>
    );

  return (
    <div
      role="status"
      className={cn(
        "border-border/60 bg-muted/20 fade-in-up flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center sm:py-16",
        className,
      )}
    >
      {illustration ? (
        <div className="text-muted-foreground mb-2" aria-hidden="true">
          {illustration}
        </div>
      ) : (
        <div
          className="bg-muted text-muted-foreground mb-1 flex size-12 items-center justify-center rounded-full text-lg font-semibold"
          aria-hidden="true"
        >
          ···
        </div>
      )}
      {titleNode}
      {description ? (
        <p className="text-muted-foreground max-w-sm text-sm text-pretty">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

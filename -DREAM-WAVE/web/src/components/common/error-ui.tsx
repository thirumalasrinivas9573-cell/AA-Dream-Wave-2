import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ErrorUIProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * Shared error presentation shell (no business logic).
 */
export function ErrorUI({
  title = "Something went wrong",
  description = "Please try again. If the problem continues, contact support.",
  action,
  className,
}: ErrorUIProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

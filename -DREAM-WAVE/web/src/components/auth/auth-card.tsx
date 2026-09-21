import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Shared auth page card shell.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <div
      className={cn(
        "border-border bg-background/80 w-full max-w-md rounded-2xl border p-6 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-8",
        className,
      )}
    >
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}

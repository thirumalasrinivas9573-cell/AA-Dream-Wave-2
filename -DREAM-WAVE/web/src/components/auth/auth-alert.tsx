import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthAlertProps = {
  variant: "error" | "success";
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Inline auth feedback banner for error/success states.
 */
export function AuthAlert({
  variant,
  title,
  description,
  className,
  children,
}: AuthAlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "fade-in-up rounded-xl border px-3.5 py-3 text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
        className,
      )}
    >
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 opacity-90">{description}</p> : null}
      {children}
    </div>
  );
}

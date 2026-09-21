import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-xl border px-3.5 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      info: "border-border bg-muted/50 text-foreground",
      success:
        "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
      warning:
        "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
      error: "border-destructive/30 bg-destructive/5 text-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: string;
    description?: string;
    children?: ReactNode;
  };

export function Alert({
  className,
  variant,
  title,
  description,
  children,
  role,
  ...props
}: AlertProps) {
  return (
    <div
      role={
        role ??
        (variant === "error" || variant === "warning" ? "alert" : "status")
      }
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {description ? <p className="mt-1 opacity-90">{description}</p> : null}
      {children}
    </div>
  );
}

export { alertVariants };

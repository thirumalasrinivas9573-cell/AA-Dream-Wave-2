import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string | undefined;
  error?: string | undefined;
  success?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
};

/**
 * Accessible form field shell: label, control, hint, error, and success.
 */
export function FormField({
  id,
  label,
  children,
  hint,
  error,
  success,
  required,
  className,
}: FormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const successId = `${id}-success`;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="gap-1">
        <span>{label}</span>
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only">(required)</span> : null}
      </Label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-muted-foreground text-xs text-pretty">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-destructive fade-in text-xs text-pretty"
        >
          {error}
        </p>
      ) : null}
      {success && !error ? (
        <p
          id={successId}
          role="status"
          className="fade-in text-xs text-pretty text-emerald-700 dark:text-emerald-300"
        >
          {success}
        </p>
      ) : null}
    </div>
  );
}

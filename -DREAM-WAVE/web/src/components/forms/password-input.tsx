"use client";

import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, forwardRef, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  invalid?: boolean;
};

/**
 * Password input with show/hide toggle.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, invalid, id, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const reactId = useId();
    const inputId = id ?? reactId;

    return (
      <div className="relative">
        <Input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          autoComplete={props.autoComplete ?? "current-password"}
          aria-invalid={invalid || undefined}
          className={cn("h-10 pr-10", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={inputId}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    );
  },
);

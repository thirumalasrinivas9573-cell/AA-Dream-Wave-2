"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaVariant = "primary" | "secondary";

type SharedCtaProps = {
  variant?: CtaVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

type CtaLinkProps = SharedCtaProps & {
  href: string;
};

type CtaActionProps = SharedCtaProps & {
  href?: undefined;
  onClick?: ComponentProps<typeof Button>["onClick"];
  type?: "button" | "submit" | "reset";
};

export type CtaButtonProps = CtaLinkProps | CtaActionProps;

function resolveVariant(variant: CtaVariant) {
  return variant === "secondary" ? "outline" : "default";
}

function CtaContent({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {loading ? (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      <span>{children}</span>
    </>
  );
}

/**
 * Reusable marketing CTA — link or button with hover/focus/active/loading/disabled.
 */
export function CtaButton(props: CtaButtonProps) {
  const {
    variant = "primary",
    loading = false,
    disabled = false,
    className,
    children,
  } = props;

  const isDisabled = disabled || loading;
  const buttonVariant = resolveVariant(variant);

  if ("href" in props && typeof props.href === "string") {
    if (isDisabled) {
      return (
        <span
          className={cn(
            buttonVariants({ variant: buttonVariant, size: "lg" }),
            "pointer-events-none min-h-11 px-5 opacity-50",
            className,
          )}
          aria-disabled="true"
        >
          <CtaContent loading={loading}>{children}</CtaContent>
        </span>
      );
    }

    return (
      <Link
        href={props.href}
        className={cn(
          buttonVariants({ variant: buttonVariant, size: "lg" }),
          "min-h-11 px-5 transition-transform active:scale-[0.98]",
          className,
        )}
        aria-busy={loading || undefined}
      >
        <CtaContent loading={loading}>{children}</CtaContent>
      </Link>
    );
  }

  return (
    <Button
      type={props.type ?? "button"}
      variant={buttonVariant}
      size="lg"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onClick={props.onClick}
      className={cn(
        "min-h-11 px-5 transition-transform active:scale-[0.98]",
        className,
      )}
    >
      <CtaContent loading={loading}>{children}</CtaContent>
    </Button>
  );
}

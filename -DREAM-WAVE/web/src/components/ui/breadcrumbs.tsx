"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (!items.length) return null;

  const compact =
    items.length > 3
      ? [items[0]!, { label: "…" }, items[items.length - 2]!, items[items.length - 1]!]
      : items;

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="hidden flex-wrap items-center gap-1.5 sm:flex">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex max-w-[12rem] items-center gap-1.5 md:max-w-none"
            >
              {index > 0 ? (
                <ChevronRight
                  className="text-muted-foreground size-3.5 shrink-0"
                  aria-hidden="true"
                />
              ) : null}
              {last || !item.href ? (
                <span
                  className={cn(
                    "truncate",
                    last
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring truncate rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <ol className="flex items-center gap-1.5 overflow-hidden sm:hidden">
        {compact.map((item, index) => {
          const last = index === compact.length - 1;
          const isEllipsis = item.label === "…";
          return (
            <li
              key={`m-${item.label}-${index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 ? (
                <ChevronRight
                  className="text-muted-foreground size-3.5 shrink-0"
                  aria-hidden="true"
                />
              ) : null}
              {isEllipsis ? (
                <span className="text-muted-foreground" aria-hidden="true">
                  …
                </span>
              ) : last || !item.href ? (
                <span
                  className={cn(
                    "truncate",
                    last
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring truncate rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

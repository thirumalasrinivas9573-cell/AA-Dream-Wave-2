"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { WORKSPACE_NAV, WORKSPACE_ROUTES } from "@/constants/workspace";
import { cn } from "@/lib/utils";

export function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav
      className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      aria-label="Smart workspace sections"
    >
      {WORKSPACE_NAV.map((item) => {
        const active =
          item.href === WORKSPACE_ROUTES.root
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({
                size: "sm",
                variant: active ? "default" : "outline",
              }),
              "h-10 shrink-0 md:h-9",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkspacePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-sm">Smart Workspace</p>
        <h1 className="page-title">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div>
      ) : null}
    </header>
  );
}

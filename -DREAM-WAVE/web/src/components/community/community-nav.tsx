"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { COMMUNITY_NAV } from "@/constants/community";
import { cn } from "@/lib/utils";

export function CommunityPageHeader({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description: string;
  eyebrow?: string;
}) {
  return (
    <header className="space-y-2">
      {eyebrow ? (
        <p className="text-muted-foreground text-sm">{eyebrow}</p>
      ) : null}
      <h1 className="page-title text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </header>
  );
}

export function CommunityNav() {
  const pathname = usePathname();

  return (
    <nav
      className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      aria-label="Community sections"
    >
      {COMMUNITY_NAV.map((item) => {
        const active =
          item.href === COMMUNITY_NAV[0].href
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

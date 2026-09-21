"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { KNOWLEDGE_NAV, KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import { cn } from "@/lib/utils";

export function KnowledgeNav() {
  const pathname = usePathname();

  return (
    <nav
      className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      aria-label="Knowledge library sections"
    >
      {KNOWLEDGE_NAV.map((item) => {
        const active =
          item.href === KNOWLEDGE_ROUTES.root
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

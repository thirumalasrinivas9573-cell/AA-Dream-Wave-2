"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { LEARN_NAV, LEARN_ROUTES } from "@/constants/learn";
import { cn } from "@/lib/utils";

export function LearnNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Adaptive learning sections">
      {LEARN_NAV.map((item) => {
        const active =
          item.href === LEARN_ROUTES.root
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
              "h-9",
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RECRUITMENT_NAV } from "@/constants/partnership";
import { cn } from "@/lib/utils";

export function RecruitmentNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border/60 bg-muted/30 flex flex-wrap gap-1 rounded-xl border p-1">
      {RECRUITMENT_NAV.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/company/recruitment" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

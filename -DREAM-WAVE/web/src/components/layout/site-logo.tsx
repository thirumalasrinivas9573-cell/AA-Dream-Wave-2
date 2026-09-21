import Link from "next/link";

import { APP_NAME } from "@/constants";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  className?: string;
  href?: string;
};

/**
 * Dream Wave brand mark used across marketing, auth, and platform shells.
 */
export function SiteLogo({ className, href = "/" }: SiteLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "text-foreground focus-visible:ring-ring inline-flex items-center gap-2 rounded-md text-base font-semibold tracking-tight focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      <span
        className="bg-primary text-primary-foreground inline-flex size-7 items-center justify-center rounded-md text-xs font-bold"
        aria-hidden="true"
      >
        DW
      </span>
      <span>
        {APP_NAME}
        <span className="sr-only"> home</span>
      </span>
    </Link>
  );
}

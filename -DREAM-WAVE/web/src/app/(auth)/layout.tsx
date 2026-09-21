import Link from "next/link";
import type { ReactNode } from "react";

import { OfflineBanner } from "@/components/layout/offline-banner";
import { SiteLogo } from "@/components/layout/site-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ROUTES } from "@/constants";

type AuthLayoutProps = {
  children: ReactNode;
};

/**
 * Authentication shell — focused entry experience without marketing chrome.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      data-layout="auth"
      className="relative flex min-h-full flex-1 flex-col"
    >
      <OfflineBanner />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="from-muted/40 via-background to-background absolute inset-0 bg-gradient-to-b" />
      </div>

      <header className="container-app flex items-center justify-between py-5">
        <SiteLogo href={ROUTES.home} />
        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.home}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring hidden rounded-md px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none sm:inline-flex"
          >
            Back to home
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="container-app flex flex-1 flex-col items-center justify-center py-10 outline-none"
      >
        {children}
      </main>
    </div>
  );
}

"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { Spinner } from "@/components/common/spinner";
import { GlobalSearch } from "@/components/layout/global-search";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { PlatformBreadcrumbs } from "@/components/layout/platform-breadcrumbs";
import { SiteLogo } from "@/components/layout/site-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { NotificationBell } from "@/components/providers/notification-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Z_INDEX } from "@/constants";
import { AUTH_ROUTES } from "@/constants/auth";
import { getPlatformNav } from "@/constants/platform-nav";
import { getRoleLabel } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useKeyboard } from "@/hooks/use-keyboard";
import { needsOnboarding } from "@/lib/auth/post-auth";
import { cn } from "@/lib/utils";

type PlatformShellProps = {
  children: ReactNode;
  /** Hide chrome on focused onboarding screens. */
  minimal?: boolean;
};

function NavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      className={cn(
        "nav-feedback focus-visible:ring-ring min-h-11 rounded-lg px-3 py-2.5 text-sm outline-none focus-visible:ring-2 lg:min-h-0 lg:py-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function PlatformShell({ children, minimal = false }: PlatformShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const mobileMenuId = useId();
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const nav = getPlatformNav(user?.role);
  const mobileMenuVisible = mobileOpen && menuPath === pathname;

  useFocusTrap(mobileNavRef, mobileMenuVisible);

  const setMobileMenu = (open: boolean) => {
    setMenuPath(pathname);
    setMobileOpen(open);
  };

  useEffect(() => {
    document.body.style.overflow = mobileMenuVisible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuVisible]);

  useKeyboard(
    (event) => {
      if (event.key === "Escape") {
        setMobileMenu(false);
        menuButtonRef.current?.focus();
      }
    },
    { enabled: mobileMenuVisible },
  );

  const signOut = () => {
    logout();
    window.location.href = AUTH_ROUTES.login;
  };

  if (minimal) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <OfflineBanner />
        <header className="container-app flex items-center justify-between py-5">
          <SiteLogo href={ROUTES.home} />
          <ThemeToggle />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="container-app flex flex-1 flex-col py-6 outline-none"
        >
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-full min-w-0 flex-1 overflow-x-hidden">
      <OfflineBanner />
      <aside className="border-border bg-sidebar text-sidebar-foreground sticky top-0 hidden h-svh w-64 shrink-0 border-r lg:flex lg:flex-col xl:w-72 2xl:w-80">
        <div className="flex items-center px-5 py-5">
          <SiteLogo href={ROUTES.dashboard} />
        </div>
        <nav
          className="scroll-region flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3"
          aria-label="Platform"
        >
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={active}
              />
            );
          })}
        </nav>
        <div className="border-border space-y-3 border-t px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {getRoleLabel(user?.role)}
            </p>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 flex items-center justify-between gap-2 border-b py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] backdrop-blur-md sm:gap-3 md:pl-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]"
          style={{ zIndex: Z_INDEX.sticky }}
        >
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <Button
              ref={menuButtonRef}
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-expanded={mobileMenuVisible}
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              aria-label={mobileMenuVisible ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenu(!mobileMenuVisible)}
            >
              {mobileMenuVisible ? (
                <X aria-hidden="true" />
              ) : (
                <Menu aria-hidden="true" />
              )}
            </Button>
            <div className="min-w-0 truncate">
              <SiteLogo href={ROUTES.dashboard} />
            </div>
          </div>
          <p className="text-muted-foreground hidden truncate text-sm lg:block">
            {getRoleLabel(user?.role)} platform
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <GlobalSearch />
            <NotificationBell />
            <ThemeToggle />
            <Link
              href={ROUTES.home}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden md:inline-flex",
              )}
            >
              Marketing site
            </Link>
          </div>
        </header>

        {mobileMenuVisible ? (
          <nav
            ref={mobileNavRef}
            id={mobileMenuId}
            className="border-border bg-card/95 safe-pb scroll-region max-h-[min(70vh,32rem)] overflow-y-auto border-b p-3 backdrop-blur-sm lg:hidden"
            aria-label="Mobile platform navigation"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex flex-col gap-1">
              {nav.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={active}
                    onNavigate={() => setMobileMenu(false)}
                  />
                );
              })}
              <Button
                type="button"
                variant="outline"
                className="mt-2 min-h-11"
                onClick={signOut}
              >
                Sign out
              </Button>
            </div>
          </nav>
        ) : null}

        <PlatformBreadcrumbs />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Redirects authenticated users who still need onboarding.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onOnboarding =
    pathname === ROUTES.onboarding ||
    pathname.startsWith(`${ROUTES.onboarding}/`);

  useEffect(() => {
    if (loading || !isAuthenticated || !user) return;

    if (needsOnboarding(user) && !onOnboarding) {
      router.replace(ROUTES.onboarding);
      return;
    }

    if (!needsOnboarding(user) && onOnboarding) {
      router.replace(ROUTES.dashboard);
    }
  }, [isAuthenticated, loading, onOnboarding, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading workspace" />
      </div>
    );
  }

  if (needsOnboarding(user) && !onOnboarding) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Opening onboarding" />
      </div>
    );
  }

  return children;
}

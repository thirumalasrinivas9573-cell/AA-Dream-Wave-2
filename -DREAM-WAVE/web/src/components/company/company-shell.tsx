"use client";

import { Building2, BriefcaseBusiness, LayoutDashboard, Menu, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { COMPANY_NAV, COMPANY_ROUTES } from "@/constants/partnership";
import { cn } from "@/lib/utils";

type CompanyShellProps = {
  children: ReactNode;
};

export function CompanyShell({ children }: CompanyShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = useMemo(
    () =>
      COMPANY_NAV.map((item, index) => ({
        ...item,
        icon: index === 0 ? LayoutDashboard : index === 1 ? BriefcaseBusiness : Building2,
      })),
    [],
  );

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/60 bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <Link href={COMPANY_ROUTES.dashboard} className="flex min-w-0 items-center gap-3">
            <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
              <Building2 className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 hidden sm:block">
              <span className="block truncate text-sm font-semibold">
                {user?.organizationName || "Company Portal"}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                Enterprise console
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-12">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="bg-background absolute inset-y-0 left-0 w-72 p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">Company Portal</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <nav className="space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="hover:bg-muted block rounded-xl px-3 py-2 text-sm font-medium"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}

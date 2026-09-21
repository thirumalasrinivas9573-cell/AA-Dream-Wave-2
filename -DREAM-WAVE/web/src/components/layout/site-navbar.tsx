"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { SiteLogo } from "@/components/layout/site-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  LAYOUT,
  MARKETING_AUTH_ROUTES,
  MARKETING_NAV_LINKS,
  Z_INDEX,
} from "@/constants";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useKeyboard } from "@/hooks/use-keyboard";
import { cn } from "@/lib/utils";

/**
 * Sticky marketing navbar with desktop links and mobile disclosure menu.
 */
export function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(mobilePanelRef, open);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useKeyboard(
    (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    },
    { enabled: open },
  );

  const closeMenu = () => setOpen(false);

  return (
    <header
      className="border-border/60 bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 border-b backdrop-blur-md"
      style={{ zIndex: Z_INDEX.header, minHeight: LAYOUT.headerHeight }}
    >
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <SiteLogo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {MARKETING_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Link
            href={MARKETING_AUTH_ROUTES.login}
            className={buttonVariants({ variant: "ghost" })}
          >
            Log in
          </Link>
          <Link
            href={MARKETING_AUTH_ROUTES.getStarted}
            className={buttonVariants()}
          >
            Get started
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Button
            ref={menuButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={open}
            aria-controls={menuId}
            aria-haspopup="true"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <div
        ref={mobilePanelRef}
        id={menuId}
        hidden={!open}
        className={cn("border-border bg-background border-t lg:hidden")}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? "Mobile navigation" : undefined}
      >
        <nav
          className="container-app flex flex-col gap-1 py-4"
          aria-label="Mobile"
        >
          {MARKETING_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="text-foreground hover:bg-muted focus-visible:ring-ring min-h-11 rounded-md px-3 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t pt-3">
            <Link
              href={MARKETING_AUTH_ROUTES.login}
              onClick={closeMenu}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Log in
            </Link>
            <Link
              href={MARKETING_AUTH_ROUTES.getStarted}
              onClick={closeMenu}
              className={cn(buttonVariants(), "w-full")}
            >
              Get started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

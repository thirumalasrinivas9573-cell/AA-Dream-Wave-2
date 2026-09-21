"use client";

import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  FileText,
  GalleryHorizontal,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Network,
  Plus,
  Search,
  Settings,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { OfflineBanner } from "@/components/layout/offline-banner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_ROUTES } from "@/constants/auth";
import {
  INSTITUTION_ACCOUNT_ROUTE,
  INSTITUTION_NAV,
  INSTITUTION_ROUTES,
} from "@/constants/institution";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useKeyboard } from "@/hooks/use-keyboard";
import { cn } from "@/lib/utils";
import { useInstitutionStore } from "@/store/institution-store";

type InstitutionShellProps = {
  children: ReactNode;
};

const NAV_ICONS = [
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  BriefcaseBusiness,
  Network,
  CalendarDays,
  GalleryHorizontal,
  Megaphone,
  BarChart3,
  FileText,
  Settings,
  CircleHelp,
] as const;

const SEARCH_TARGETS = [
  { label: "Students", href: INSTITUTION_ROUTES.students, keywords: "learners roster" },
  { label: "Faculty", href: INSTITUTION_ROUTES.faculty, keywords: "teachers staff" },
  {
    label: "Departments",
    href: INSTITUTION_ROUTES.departments,
    keywords: "academic units",
  },
  { label: "Courses", href: INSTITUTION_ROUTES.courses, keywords: "programs" },
  {
    label: "Admissions",
    href: INSTITUTION_ROUTES.admissions,
    keywords: "applications enrollment",
  },
  {
    label: "Industry Network",
    href: INSTITUTION_ROUTES.industryNetwork,
    keywords: "partnerships companies industry",
  },
  {
    label: "Announcements",
    href: INSTITUTION_ROUTES.announcements,
    keywords: "notices alerts",
  },
] as const;

function InstitutionMark({ compact = false }: { compact?: boolean }) {
  const profile = useInstitutionStore((state) => state.profile);

  return (
    <Link
      href={INSTITUTION_ROUTES.dashboard}
      className="focus-visible:ring-ring flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2"
    >
      <span
        className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
        aria-hidden="true"
      >
        <Building2 className="size-5" />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{profile.name}</span>
          <span className="text-muted-foreground block truncate text-xs">
            Institution console
          </span>
        </span>
      ) : null}
      <span className="sr-only">{profile.name} dashboard</span>
    </Link>
  );
}

function InstitutionSearch({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return SEARCH_TARGETS;
    return SEARCH_TARGETS.filter((item) =>
      `${item.label} ${item.keywords}`.toLowerCase().includes(term),
    );
  }, [query]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (results[0]) {
      router.push(results[0].href);
      setFocused(false);
    }
  };

  return (
    <form
      role="search"
      aria-label="Institution search"
      className={cn(
        "relative w-full max-w-md",
        mobile ? "block" : "hidden md:block",
      )}
      onSubmit={submit}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="bg-background/70 h-10 pl-9"
        placeholder="Search students, faculty, courses…"
        aria-label="Search institution records"
        aria-expanded={focused}
        aria-controls="institution-search-results"
        autoComplete="off"
      />
      {focused ? (
        <div
          id="institution-search-results"
          className="border-border bg-popover text-popover-foreground absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border p-1 shadow-[var(--shadow-lg)]"
          role="listbox"
          aria-label="Search categories"
        >
          {results.length ? (
            results.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="option"
                aria-selected="false"
                className="hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring flex min-h-10 items-center rounded-lg px-3 text-sm outline-none focus-visible:ring-2"
                onClick={() => setFocused(false)}
              >
                {item.label}
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground px-3 py-4 text-center text-sm">
              No matching category
            </p>
          )}
        </div>
      ) : null}
    </form>
  );
}

function InstitutionNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Institution portal" className="flex flex-col gap-1">
      {INSTITUTION_NAV.map((item, index) => {
        const Icon = NAV_ICONS[index]!;
        const active =
          pathname === item.href ||
          (item.href !== INSTITUTION_ROUTES.dashboard &&
            pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            className={cn(
              "focus-visible:ring-ring flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm outline-none transition-colors focus-visible:ring-2",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function InstitutionBreadcrumbs() {
  const pathname = usePathname();
  const current = INSTITUTION_NAV.find(
    (item) =>
      pathname === item.href ||
      (item.href !== INSTITUTION_ROUTES.dashboard &&
        pathname.startsWith(`${item.href}/`)),
  );

  return (
    <div className="border-border bg-background/70 border-b px-4 py-3 backdrop-blur-md sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Institution", href: INSTITUTION_ROUTES.dashboard },
          { label: current?.label ?? "Workspace" },
        ]}
      />
    </div>
  );
}

export function InstitutionShell({ children }: InstitutionShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const hydrated = useInstitutionStore((state) => state.hydrated);
  const hydrate = useInstitutionStore((state) => state.hydrate);
  const profile = useInstitutionStore((state) => state.profile);
  const notifications = useInstitutionStore((state) => state.notifications);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavId = useId();
  const mobileMenuVisible = mobileOpen && menuPath === pathname;

  useFocusTrap(mobileNavRef, mobileMenuVisible);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuVisible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuVisible]);

  useKeyboard(
    (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    },
    { enabled: mobileMenuVisible },
  );

  const signOut = () => {
    logout();
    window.location.href = AUTH_ROUTES.login;
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="bg-muted/20 flex min-h-svh min-w-0 flex-1 overflow-x-hidden">
      <OfflineBanner />

      <aside className="border-border bg-card/90 sticky top-0 hidden h-svh w-64 shrink-0 border-r backdrop-blur-xl lg:flex lg:flex-col xl:w-72">
        <div className="border-border border-b px-5 py-5">
          <InstitutionMark />
        </div>
        <div className="scroll-region flex-1 overflow-y-auto px-3 py-4">
          <InstitutionNavigation />
        </div>
        <div className="border-border space-y-3 border-t p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              Institution administrator
            </p>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={signOut}>
            <LogOut aria-hidden="true" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background/80 sticky top-0 z-40 flex min-h-16 items-center gap-3 border-b px-4 backdrop-blur-xl sm:px-6">
          <Button
            ref={menuButtonRef}
            type="button"
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label={
              mobileMenuVisible ? "Close institution menu" : "Open institution menu"
            }
            aria-expanded={mobileMenuVisible}
            aria-controls={mobileNavId}
            onClick={() => {
              setMenuPath(pathname);
              setMobileOpen(!mobileMenuVisible);
            }}
          >
            {mobileMenuVisible ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </Button>

          <div className="lg:hidden">
            <InstitutionMark compact />
          </div>

          <InstitutionSearch />

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <details className="group relative">
              <summary
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "list-none [&::-webkit-details-marker]:hidden",
                )}
                aria-label="Quick actions"
              >
                <Plus aria-hidden="true" />
              </summary>
              <div className="border-border bg-popover absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border p-2 shadow-[var(--shadow-lg)]">
                <p className="text-muted-foreground px-2 py-1 text-xs font-medium uppercase">
                  Quick actions
                </p>
                <Link
                  href={INSTITUTION_ROUTES.admissions}
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-10 items-center rounded-lg px-2 text-sm outline-none focus-visible:ring-2"
                >
                  Add admission
                </Link>
                <Link
                  href={INSTITUTION_ROUTES.announcements}
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-10 items-center rounded-lg px-2 text-sm outline-none focus-visible:ring-2"
                >
                  Publish announcement
                </Link>
                <Link
                  href={INSTITUTION_ROUTES.events}
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-10 items-center rounded-lg px-2 text-sm outline-none focus-visible:ring-2"
                >
                  Create event
                </Link>
              </div>
            </details>

            <Link
              href={INSTITUTION_ROUTES.notifications}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "relative",
              )}
              aria-label={`${unreadCount} unread institution notifications`}
            >
              <Bell aria-hidden="true" />
              {unreadCount ? (
                <span className="bg-destructive text-destructive-foreground absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
                  {Math.min(unreadCount, 9)}
                </span>
              ) : null}
            </Link>

            <ThemeToggle />

            <details className="group relative">
              <summary
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "hidden list-none gap-2 sm:inline-flex [&::-webkit-details-marker]:hidden",
                )}
              >
                <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg text-xs font-semibold">
                  {(user?.name || profile.name).slice(0, 2).toUpperCase()}
                </span>
                <span className="max-w-32 truncate">{user?.name ?? "Admin"}</span>
                <ChevronDown className="size-3" aria-hidden="true" />
              </summary>
              <div className="border-border bg-popover absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border p-2 shadow-[var(--shadow-lg)]">
                <p className="truncate px-2 py-1 text-sm font-medium">{profile.name}</p>
                <p className="text-muted-foreground truncate px-2 pb-2 text-xs">
                  {user?.email}
                </p>
                <Link
                  href={INSTITUTION_ROUTES.profile}
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-10 items-center rounded-lg px-2 text-sm outline-none focus-visible:ring-2"
                >
                  Institution profile
                </Link>
                <Link
                  href={INSTITUTION_ACCOUNT_ROUTE}
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-10 items-center rounded-lg px-2 text-sm outline-none focus-visible:ring-2"
                >
                  Account settings
                </Link>
                <button
                  type="button"
                  className="text-destructive hover:bg-muted focus-visible:ring-ring flex min-h-10 w-full items-center rounded-lg px-2 text-sm outline-none focus-visible:ring-2"
                  onClick={signOut}
                >
                  Logout
                </button>
              </div>
            </details>
          </div>
        </header>

        {mobileMenuVisible ? (
          <>
            <button
              type="button"
              className="bg-background/70 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
              aria-label="Close institution navigation"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              ref={mobileNavRef}
              id={mobileNavId}
              className="border-border bg-card fixed inset-y-0 left-0 z-50 flex w-[min(88vw,20rem)] flex-col border-r shadow-[var(--shadow-lg)] lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Institution navigation"
            >
              <div className="border-border flex items-center justify-between border-b p-4">
                <InstitutionMark />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close institution menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
              <div className="scroll-region flex-1 overflow-y-auto p-3">
                <div className="mb-3 md:hidden">
                  <InstitutionSearch mobile />
                </div>
                <InstitutionNavigation onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="border-border border-t p-4">
                <Link
                  href={INSTITUTION_ROUTES.profile}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "mb-2 w-full justify-start",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  Institution profile
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={signOut}
                >
                  <LogOut aria-hidden="true" />
                  Logout
                </Button>
              </div>
            </aside>
          </>
        ) : null}

        <InstitutionBreadcrumbs />

        <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

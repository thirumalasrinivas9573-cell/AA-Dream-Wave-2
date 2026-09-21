"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { useKeyboard } from "@/hooks/use-keyboard";
import { searchApi, type SearchResult } from "@/lib/api/search";
import { cn } from "@/lib/utils";

const SEARCH_TARGETS = [
  { label: "Smart Search", href: ROUTES.search, keywords: "semantic hybrid discovery research" },
  { label: "AI Dashboard", href: ROUTES.dashboard, keywords: "home overview personalization widgets" },
  { label: "Research Mode", href: "/search/research", keywords: "citations evidence synthesis" },
  { label: "Personalization Center", href: ROUTES.personalization, keywords: "privacy preferences memory" },
  { label: "Career Copilot", href: "/ai/career/copilot", keywords: "career roadmap skills" },
  { label: "Opportunities", href: ROUTES.opportunities, keywords: "internship jobs apply" },
  { label: "Research Workspace", href: ROUTES.research, keywords: "notes editor pdf" },
  { label: "Books", href: ROUTES.books, keywords: "library reading knowledge" },
] as const;

export function GlobalSearch() {
  const router = useRouter();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useKeyboard((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setOpen(true);
    }
  });

  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setApiResults([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      searchApi.search(token, { q: query.trim(), limit: 6 })
        .then((res) => setApiResults(res.results))
        .catch(() => setApiResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, token]);

  const navResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_TARGETS;
    return SEARCH_TARGETS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.includes(q) ||
        item.href.includes(q),
    );
  }, [query]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-muted-foreground hidden h-8 gap-2 md:inline-flex"
        onClick={() => setOpen(true)}
        aria-label="Open global search"
      >
        <Search className="size-3.5" />
        Search
        <kbd className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
          ⌘K
        </kbd>
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="md:hidden"
        aria-label="Open global search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
        title="Global search"
        description="Search authorized content or jump to a module."
        className="max-w-xl"
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search anything…"
          className="mb-3 h-10"
          autoFocus
          aria-label="Search"
        />
        {loading ? <p className="text-muted-foreground mb-2 text-xs">Searching…</p> : null}
        {apiResults.length ? (
          <div className="mb-3">
            <p className="text-muted-foreground mb-1 text-xs font-medium">Results</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {apiResults.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="nav-feedback hover:bg-muted flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm"
                      onClick={() => setOpen(false)}
                    >
                      <span>{item.title}</span>
                      <span className="text-muted-foreground text-xs">{item.type}{item.explanation ? ` · ${item.explanation}` : ""}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="nav-feedback hover:bg-muted flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm"
                      onClick={() => { setOpen(false); router.push(`${ROUTES.search}?q=${encodeURIComponent(query)}`); }}
                    >
                      <span>{item.title}</span>
                      <span className="text-muted-foreground text-xs">{item.type}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-muted-foreground mb-1 text-xs font-medium">Jump to</p>
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {navResults.length === 0 ? (
            <li className="text-muted-foreground px-2 py-6 text-center text-sm">
              No matches — <Link href={ROUTES.search} className="underline" onClick={() => setOpen(false)}>open Smart Search</Link>
            </li>
          ) : (
            navResults.map((item) => (
              <li key={item.href}>
                <button
                  type="button"
                  className="nav-feedback hover:bg-muted focus-visible:ring-ring flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2"
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <span>{item.label}</span>
                  <span className="text-muted-foreground text-xs">{item.href}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="mt-3 flex justify-end">
          <Link href={ROUTES.search} className={cn(buttonVariants({ size: "sm", variant: "outline" }))} onClick={() => setOpen(false)}>
            Open Smart Search
          </Link>
        </div>
      </Dialog>
    </>
  );
}

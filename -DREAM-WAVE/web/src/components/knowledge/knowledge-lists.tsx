"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { RetryAction } from "@/components/common/retry-action";
import {
  BookGrid,
  KnowledgePageHeader,
} from "@/components/knowledge/book-card";
import { KnowledgeNav } from "@/components/knowledge/knowledge-nav";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AI_SEARCH_SUGGESTIONS,
  KNOWLEDGE_ROUTES,
} from "@/constants/knowledge";
import {
  getRecentlyAddedBooks,
  KNOWLEDGE_CATALOG,
} from "@/constants/knowledge-catalog";
import { toUserSafeMessage } from "@/lib/errors";
import { studentService } from "@/services/student.service";
import { useKnowledgeStore } from "@/store/knowledge-store";
import type { BookDifficulty } from "@/types/knowledge";
import type { Book } from "@/types/student";

export function KnowledgeSearchPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const recentSearches = useKnowledgeStore((s) => s.recentSearches);
  const addRecentSearch = useKnowledgeStore((s) => s.addRecentSearch);
  const clearRecentSearches = useKnowledgeStore((s) => s.clearRecentSearches);

  const [queryDraft, setQueryDraft] = useState<string | null>(null);
  const [syncedInitial, setSyncedInitial] = useState(initial);
  if (initial !== syncedInitial) {
    setSyncedInitial(initial);
    setQueryDraft(null);
  }
  const query = queryDraft ?? initial;
  const setQuery = (value: string) => setQueryDraft(value);
  const [category, setCategory] = useState("All");
  const [author, setAuthor] = useState("All");
  const [subject, setSubject] = useState("All");
  const [language, setLanguage] = useState("All");
  const [difficulty, setDifficulty] = useState<"All" | BookDifficulty>("All");
  const [browseMode, setBrowseMode] = useState<
    "results" | "subjects" | "categories" | "authors"
  >("results");
  const [apiBooks, setApiBooks] = useState<Book[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiRefresh, setApiRefresh] = useState(0);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!token || !query.trim()) return;

    let active = true;
    const handle = window.setTimeout(() => {
      void (async () => {
        setApiLoading(true);
        setApiError(null);
        try {
          const data = await studentService.books.list(token, query.trim());
          if (!active) return;
          setApiBooks(data.books ?? []);
        } catch (err) {
          if (!active) return;
          setApiError(toUserSafeMessage(err));
          setApiBooks([]);
        } finally {
          if (active) setApiLoading(false);
        }
      })();
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [apiRefresh, query, token]);

  const showApiResults = Boolean(token && query.trim());
  const visibleApiBooks = showApiResults ? apiBooks : [];
  const visibleApiLoading = showApiResults ? apiLoading : false;
  const visibleApiError = showApiResults ? apiError : null;

  const authors = useMemo(
    () => ["All", ...Array.from(new Set(KNOWLEDGE_CATALOG.map((b) => b.author)))],
    [],
  );
  const categories = useMemo(
    () =>
      ["All", ...Array.from(new Set(KNOWLEDGE_CATALOG.map((b) => b.category)))],
    [],
  );
  const subjects = useMemo(
    () =>
      ["All", ...Array.from(new Set(KNOWLEDGE_CATALOG.map((b) => b.subject)))],
    [],
  );
  const languages = useMemo(
    () =>
      ["All", ...Array.from(new Set(KNOWLEDGE_CATALOG.map((b) => b.language)))],
    [],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return KNOWLEDGE_CATALOG.filter((book) => {
      const matchesQuery =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.subject.toLowerCase().includes(q) ||
        book.category.toLowerCase().includes(q) ||
        book.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        book.description.toLowerCase().includes(q) ||
        book.keyConcepts.some((concept) =>
          concept.toLowerCase().includes(q),
        );
      return (
        matchesQuery &&
        (category === "All" || book.category === category) &&
        (author === "All" || book.author === author) &&
        (subject === "All" || book.subject === subject) &&
        (language === "All" || book.language === language) &&
        (difficulty === "All" || book.difficulty === difficulty)
      );
    });
  }, [author, category, difficulty, language, query, subject]);

  const aiSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return AI_SEARCH_SUGGESTIONS.slice(0, 6);
    return AI_SEARCH_SUGGESTIONS.filter((item) =>
      item.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [query]);

  const recentlyAdded = useMemo(() => getRecentlyAddedBooks(6), []);

  const subjectGroups = useMemo(() => {
    const map = new Map<string, number>();
    for (const book of KNOWLEDGE_CATALOG) {
      map.set(book.subject, (map.get(book.subject) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, []);

  const categoryGroups = useMemo(() => {
    const map = new Map<string, number>();
    for (const book of KNOWLEDGE_CATALOG) {
      map.set(book.category, (map.get(book.category) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, []);

  const authorGroups = useMemo(() => {
    const map = new Map<string, number>();
    for (const book of KNOWLEDGE_CATALOG) {
      map.set(book.author, (map.get(book.author) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, []);

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <KnowledgePageHeader
        title="Book discovery"
        description="Smart search with AI suggestions, browsers, and difficulty filters."
        actions={
          <Link href={KNOWLEDGE_ROUTES.root}>
            <Button type="button" variant="outline" className="h-10">
              Knowledge home
            </Button>
          </Link>
        }
      />
      <KnowledgeNav />

      {visibleApiError ? (
        <AuthAlert
          variant="error"
          title="Live catalog sync notice"
          description={visibleApiError}
        >
          <div className="mt-2">
            <RetryAction
              onRetry={() => setApiRefresh((value) => value + 1)}
            />
          </div>
        </AuthAlert>
      ) : null}

      {(visibleApiLoading || visibleApiBooks.length > 0) &&
      browseMode === "results" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API catalog matches</CardTitle>
            <CardDescription>
              {visibleApiLoading
                ? "Searching Dream Wave books API…"
                : `${visibleApiBooks.length} live result${visibleApiBooks.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          {!visibleApiLoading && visibleApiBooks.length > 0 ? (
            <ul className="space-y-2 px-6 pb-6">
              {visibleApiBooks.slice(0, 8).map((book, index) => (
                <li
                  key={`${book.id ?? book.title}-${index}`}
                  className="border-border rounded-xl border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{book.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {[book.author, book.category].filter(Boolean).join(" · ") ||
                      "API recommendation"}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <form
        className="grid gap-3 lg:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          addRecentSearch(query);
          setBrowseMode("results");
        }}
      >
        <Input
          className="h-10"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search books…"
          aria-label="Smart search"
        />
        <Button type="submit" className="h-10">
          Search
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">AI search suggestions</p>
        <div className="flex flex-wrap gap-2">
          {aiSuggestions.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery(item);
                addRecentSearch(item);
                setBrowseMode("results");
              }}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["results", "Results"],
            ["subjects", "Subject browser"],
            ["categories", "Category browser"],
            ["authors", "Author browser"],
          ] as const
        ).map(([mode, label]) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={browseMode === mode ? "default" : "outline"}
            aria-pressed={browseMode === mode}
            onClick={() => setBrowseMode(mode)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <select
          className="form-control sm:min-w-[9rem]"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setBrowseMode("results");
          }}
          aria-label="Category"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              Category: {item}
            </option>
          ))}
        </select>
        <select
          className="form-control sm:min-w-[9rem]"
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value);
            setBrowseMode("results");
          }}
          aria-label="Subject"
        >
          {subjects.map((item) => (
            <option key={item} value={item}>
              Subject: {item}
            </option>
          ))}
        </select>
        <select
          className="form-control sm:min-w-[9rem]"
          value={author}
          onChange={(event) => {
            setAuthor(event.target.value);
            setBrowseMode("results");
          }}
          aria-label="Author"
        >
          {authors.map((item) => (
            <option key={item} value={item}>
              Author: {item}
            </option>
          ))}
        </select>
        <select
          className="form-control sm:min-w-[9rem]"
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value);
            setBrowseMode("results");
          }}
          aria-label="Language"
        >
          {languages.map((item) => (
            <option key={item} value={item}>
              Language: {item}
            </option>
          ))}
        </select>
        <select
          className="form-control sm:min-w-[9rem]"
          value={difficulty}
          onChange={(event) => {
            setDifficulty(event.target.value as "All" | BookDifficulty);
            setBrowseMode("results");
          }}
          aria-label="Difficulty"
        >
          {(["All", "beginner", "intermediate", "advanced"] as const).map(
            (item) => (
              <option key={item} value={item}>
                Difficulty: {item}
              </option>
            ),
          )}
        </select>
      </div>

      {recentSearches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Recent:</span>
          {recentSearches.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery(item);
                addRecentSearch(item);
                setBrowseMode("results");
              }}
            >
              {item}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => clearRecentSearches()}
          >
            Clear
          </Button>
        </div>
      ) : null}

      {browseMode === "subjects" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjectGroups.map(([name, count]) => (
            <button
              key={name}
              type="button"
              className="border-border hover:bg-muted/40 rounded-2xl border p-4 text-left transition"
              onClick={() => {
                setSubject(name);
                setBrowseMode("results");
              }}
            >
              <p className="font-medium">{name}</p>
              <p className="text-muted-foreground text-sm">
                {count} book{count === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {browseMode === "categories" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categoryGroups.map(([name, count]) => (
            <button
              key={name}
              type="button"
              className="border-border hover:bg-muted/40 rounded-2xl border p-4 text-left transition"
              onClick={() => {
                setCategory(name);
                setBrowseMode("results");
              }}
            >
              <p className="font-medium">{name}</p>
              <p className="text-muted-foreground text-sm">
                {count} book{count === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {browseMode === "authors" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {authorGroups.map(([name, count]) => (
            <button
              key={name}
              type="button"
              className="border-border hover:bg-muted/40 rounded-2xl border p-4 text-left transition"
              onClick={() => {
                setAuthor(name);
                setBrowseMode("results");
              }}
            >
              <p className="font-medium">{name}</p>
              <p className="text-muted-foreground text-sm">
                {count} book{count === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {browseMode === "results" ? (
        <>
          <p className="text-muted-foreground text-sm">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          {results.length === 0 ? (
            <EmptyState
              title="No matches"
              description="Try a broader query or clear one of the filters."
            />
          ) : (
            <BookGrid books={results} />
          )}
        </>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recently added</h2>
        <BookGrid books={recentlyAdded} />
      </section>
    </div>
  );
}

export function FavoritesPage() {
  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const favorites = useKnowledgeStore((s) => s.favorites);
  const progress = useKnowledgeStore((s) => s.progress);
  const collections = useKnowledgeStore((s) => s.collections);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const books = useMemo(
    () =>
      favorites
        .map((id) => KNOWLEDGE_CATALOG.find((book) => book.id === id))
        .filter(Boolean) as typeof KNOWLEDGE_CATALOG,
    [favorites],
  );

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of progress) map[item.bookId] = item.percent;
    return map;
  }, [progress]);

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <KnowledgePageHeader
        title="Favorites"
        description="Books and curated collections for quick access."
      />
      <KnowledgeNav />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Favorite collections</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {collections.map((collection) => {
            const items = collection.bookIds
              .map((id) => KNOWLEDGE_CATALOG.find((book) => book.id === id))
              .filter(Boolean) as typeof KNOWLEDGE_CATALOG;
            return (
              <Card key={collection.id}>
                <CardHeader>
                  <CardTitle className="text-base">{collection.title}</CardTitle>
                  <CardDescription>{collection.description}</CardDescription>
                  <ul className="mt-3 space-y-1 text-sm">
                    {items.map((book) => (
                      <li key={book.id}>
                        <Link
                          href={KNOWLEDGE_ROUTES.detail(book.id)}
                          className="hover:underline"
                        >
                          {book.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>
      {books.length === 0 ? (
        <EmptyState
          title="No favorites"
          description="Open any book and tap the heart icon."
        />
      ) : (
        <BookGrid books={books} progressMap={progressMap} />
      )}
    </div>
  );
}

export function HistoryPage() {
  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const history = useKnowledgeStore((s) => s.history);
  const progress = useKnowledgeStore((s) => s.progress);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const books = useMemo(
    () =>
      history
        .map((id) => KNOWLEDGE_CATALOG.find((book) => book.id === id))
        .filter(Boolean) as typeof KNOWLEDGE_CATALOG,
    [history],
  );

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of progress) map[item.bookId] = item.percent;
    return map;
  }, [progress]);

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <KnowledgePageHeader
        title="Reading history"
        description="Recently opened titles and continue-reading progress."
      />
      <KnowledgeNav />
      {books.length === 0 ? (
        <EmptyState
          title="No history yet"
          description="Start reading to populate this list."
        />
      ) : (
        <BookGrid books={books} progressMap={progressMap} />
      )}
    </div>
  );
}

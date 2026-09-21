"use client";

import { Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import {
  BookGrid,
  BookSkeletonGrid,
  KnowledgePageHeader,
} from "@/components/knowledge/book-card";
import { KnowledgeNav } from "@/components/knowledge/knowledge-nav";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AI_RECOMMENDED_TOPICS,
  AI_SEARCH_SUGGESTIONS,
  KNOWLEDGE_ROUTES,
  LIBRARY_SCOPES,
} from "@/constants/knowledge";
import {
  getBookById,
  getRecentlyAddedBooks,
  getTrendingBooks,
  KNOWLEDGE_CATALOG,
} from "@/constants/knowledge-catalog";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import { useKnowledgeStore } from "@/store/knowledge-store";

export function KnowledgeHome() {
  const { token } = useAuth();
  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const favorites = useKnowledgeStore((s) => s.favorites);
  const progress = useKnowledgeStore((s) => s.progress);
  const history = useKnowledgeStore((s) => s.history);
  const collections = useKnowledgeStore((s) => s.collections);
  const addRecentSearch = useKnowledgeStore((s) => s.addRecentSearch);

  const [query, setQuery] = useState("");
  const [recommendQuery, setRecommendQuery] = useState("");
  const [apiBooksLoading, setApiBooksLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiTitles, setApiTitles] = useState<string[]>([]);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const continueReading = useMemo(() => {
    return progress
      .filter((item) => !item.completed)
      .map((item) => {
        const book = getBookById(item.bookId);
        return book ? { book, percent: item.percent } : null;
      })
      .filter(Boolean) as Array<{
      book: (typeof KNOWLEDGE_CATALOG)[number];
      percent: number;
    }>;
  }, [progress]);

  const favoriteBooks = useMemo(
    () =>
      favorites
        .map((id) => getBookById(id))
        .filter(Boolean) as typeof KNOWLEDGE_CATALOG,
    [favorites],
  );

  const recentBooks = useMemo(
    () =>
      history
        .map((id) => getBookById(id))
        .filter(Boolean)
        .slice(0, 4) as typeof KNOWLEDGE_CATALOG,
    [history],
  );

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of progress) map[item.bookId] = item.percent;
    return map;
  }, [progress]);

  const trending = useMemo(() => getTrendingBooks(4), []);
  const recentlyAdded = useMemo(() => getRecentlyAddedBooks(4), []);

  const recommendedBooks = useMemo(() => {
    const ids = new Set([
      ...favorites,
      ...history,
      ...continueReading.map((item) => item.book.id),
    ]);
    return KNOWLEDGE_CATALOG.filter((book) => !ids.has(book.id)).slice(0, 4);
  }, [continueReading, favorites, history]);

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    addRecentSearch(query);
    window.location.href = `${KNOWLEDGE_ROUTES.search}?q=${encodeURIComponent(query.trim())}`;
  };

  const onRecommend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !recommendQuery.trim()) return;
    setApiBooksLoading(true);
    setApiError(null);
    try {
      const data = await studentService.books.recommend(
        recommendQuery.trim(),
        token,
      );
      setApiTitles((data.books ?? []).map((book) => book.title).slice(0, 6));
    } catch (err) {
      setApiError(toUserSafeMessage(err));
    } finally {
      setApiBooksLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="container-app space-y-6 py-8 md:py-10">
        <KnowledgePageHeader title="Smart Library" />
        <BookSkeletonGrid />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-8 md:py-10">
      <KnowledgePageHeader
        title="Smart Library"
        description="Personalized reading dashboard with AI recommendations, collections, and discovery."
        actions={
          <>
            <Link
              href={KNOWLEDGE_ROUTES.search}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Smart search
            </Link>
            <Link
              href={KNOWLEDGE_ROUTES.explorer}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Explorer
            </Link>
          </>
        }
      />

      <KnowledgeNav />

      <Card>
        <CardHeader>
          <CardTitle>Find a book</CardTitle>
          <CardDescription>
            Search by title, author, subject, or category.
          </CardDescription>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={onSearch}
          >
            <Input
              className="h-10 flex-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. habits, Cal Newport, finance"
              aria-label="Search books"
            />
            <Button type="submit" className="h-10">
              <Search className="size-4" aria-hidden="true" />
              Search
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {AI_SEARCH_SUGGESTIONS.slice(0, 4).map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setQuery(suggestion);
                  addRecentSearch(suggestion);
                  window.location.href = `${KNOWLEDGE_ROUTES.search}?q=${encodeURIComponent(suggestion)}`;
                }}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Libraries</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LIBRARY_SCOPES.map((scope) => (
            <Link key={scope.id} href={KNOWLEDGE_ROUTES.library(scope.id)}>
              <Card className="hover:bg-muted/30 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{scope.title}</CardTitle>
                  <CardDescription>{scope.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {continueReading.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Continue reading</h2>
            <Link
              href={KNOWLEDGE_ROUTES.history}
              className="text-muted-foreground text-sm hover:underline"
            >
              History
            </Link>
          </div>
          <BookGrid
            books={continueReading.map((item) => item.book)}
            progressMap={Object.fromEntries(
              continueReading.map((item) => [item.book.id, item.percent]),
            )}
          />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recently opened</h2>
        {recentBooks.length === 0 ? (
          <EmptyState
            title="No reading history"
            description="Open a book to start building your history."
          />
        ) : (
          <BookGrid books={recentBooks} progressMap={progressMap} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recommended books</h2>
        <BookGrid books={recommendedBooks} progressMap={progressMap} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">AI recommended topics</h2>
          <Link
            href={KNOWLEDGE_ROUTES.explorer}
            className="text-muted-foreground text-sm hover:underline"
          >
            Open explorer
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AI_RECOMMENDED_TOPICS.slice(0, 6).map((topic) => (
            <Link
              key={topic.id}
              href={`${KNOWLEDGE_ROUTES.explorer}?topic=${topic.id}`}
            >
              <Card className="hover:bg-muted/30 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Trending books</h2>
        <BookGrid books={trending} progressMap={progressMap} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recently added</h2>
        <BookGrid books={recentlyAdded} progressMap={progressMap} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Favorite collections</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {collections.map((collection) => {
            const books = collection.bookIds
              .map((id) => getBookById(id))
              .filter(Boolean) as typeof KNOWLEDGE_CATALOG;
            return (
              <Card key={collection.id}>
                <CardHeader>
                  <CardTitle className="text-base">{collection.title}</CardTitle>
                  <CardDescription>{collection.description}</CardDescription>
                  <ul className="mt-3 space-y-1 text-sm">
                    {books.map((book) => (
                      <li key={book.id}>
                        <Link
                          href={KNOWLEDGE_ROUTES.detail(book.id)}
                          className="hover:underline"
                        >
                          {book.cover} {book.title}
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Favorites</h2>
        {favoriteBooks.length === 0 ? (
          <EmptyState
            title="No favorites yet"
            description="Heart any book to keep it here."
          />
        ) : (
          <BookGrid books={favoriteBooks.slice(0, 4)} progressMap={progressMap} />
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>AI reading recommendations</CardTitle>
          <CardDescription>
            Uses the existing Dream Wave books recommend API when available.
          </CardDescription>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => void onRecommend(event)}
          >
            <Input
              className="h-10 flex-1"
              value={recommendQuery}
              onChange={(event) => setRecommendQuery(event.target.value)}
              placeholder="e.g. become a better product manager"
              disabled={apiBooksLoading}
            />
            <Button type="submit" className="h-10" disabled={apiBooksLoading}>
              <Sparkles className="size-4" aria-hidden="true" />
              {apiBooksLoading ? "Finding…" : "Recommend"}
            </Button>
          </form>
          {apiError ? (
            <div className="mt-4">
              <AuthAlert
                variant="error"
                title="Recommendation failed"
                description={apiError}
              />
            </div>
          ) : null}
          {apiTitles.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
              {apiTitles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          ) : null}
        </CardHeader>
      </Card>
    </div>
  );
}

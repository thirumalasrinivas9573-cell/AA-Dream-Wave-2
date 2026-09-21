"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import {
  BookGrid,
  BookSkeletonGrid,
  KnowledgePageHeader,
} from "@/components/knowledge/book-card";
import { KnowledgeNav } from "@/components/knowledge/knowledge-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KNOWLEDGE_ROUTES, LIBRARY_SCOPES } from "@/constants/knowledge";
import { KNOWLEDGE_CATALOG } from "@/constants/knowledge-catalog";
import { useKnowledgeStore } from "@/store/knowledge-store";
import type { LibraryScope } from "@/types/knowledge";

export function LibraryScopePage({ scope }: { scope: LibraryScope }) {
  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const progress = useKnowledgeStore((s) => s.progress);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [subject, setSubject] = useState("All");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const meta = LIBRARY_SCOPES.find((item) => item.id === scope);

  const books = useMemo(() => {
    return KNOWLEDGE_CATALOG.filter((book) => book.libraries.includes(scope));
  }, [scope]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(books.map((book) => book.category)))],
    [books],
  );
  const subjects = useMemo(
    () => ["All", ...Array.from(new Set(books.map((book) => book.subject)))],
    [books],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((book) => {
      const matchesQuery =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.tags.some((tag) => tag.toLowerCase().includes(q));
      return (
        matchesQuery &&
        (category === "All" || book.category === category) &&
        (subject === "All" || book.subject === subject)
      );
    });
  }, [books, category, search, subject]);

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of progress) map[item.bookId] = item.percent;
    return map;
  }, [progress]);

  if (!hydrated) {
    return (
      <div className="container-app space-y-6 py-8 md:py-10">
        <KnowledgePageHeader title={meta?.title ?? "Library"} />
        <BookSkeletonGrid />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="container-app py-10">
        <EmptyState
          title="Unknown library"
          description="This library scope is not available."
          action={
            <Link href={KNOWLEDGE_ROUTES.root}>
              <Button type="button">Back to Smart Library</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <KnowledgePageHeader
        title={meta.title}
        description={meta.description}
        actions={
          <Link href={KNOWLEDGE_ROUTES.root}>
            <Button type="button" variant="outline" className="h-10">
              Smart Library
            </Button>
          </Link>
        }
      />
      <KnowledgeNav />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          className="h-10 flex-1"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter books…"
          aria-label="Filter library books"
        />
        <select
          className="border-input bg-background h-10 rounded-lg border px-2.5 text-sm"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Category filter"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              Category: {item}
            </option>
          ))}
        </select>
        <select
          className="border-input bg-background h-10 rounded-lg border px-2.5 text-sm"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          aria-label="Subject filter"
        >
          {subjects.map((item) => (
            <option key={item} value={item}>
              Subject: {item}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title="No books in this library"
          description="Try another filter or switch library scope."
        />
      ) : (
        <BookGrid books={filtered} progressMap={progressMap} />
      )}
    </div>
  );
}

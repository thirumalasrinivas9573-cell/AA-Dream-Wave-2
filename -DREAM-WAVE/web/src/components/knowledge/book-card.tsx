"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import { cn } from "@/lib/utils";
import { useKnowledgeStore } from "@/store/knowledge-store";
import type { KnowledgeBook } from "@/types/knowledge";

type BookCardProps = {
  book: KnowledgeBook;
  progress?: number;
};

export function BookCard({ book, progress }: BookCardProps) {
  const favorites = useKnowledgeStore((s) => s.favorites);
  const toggleFavorite = useKnowledgeStore((s) => s.toggleFavorite);
  const isFavorite = favorites.includes(book.id);

  return (
    <Card className="relative h-full overflow-hidden">
      <CardHeader>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="text-3xl" aria-hidden="true">
            {book.cover}
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleFavorite(book.id);
            }}
          >
            <Heart
              className={cn(
                "size-4",
                isFavorite && "fill-current text-rose-500",
              )}
            />
          </Button>
        </div>
        <CardTitle className="text-base leading-snug">
          <Link
            href={KNOWLEDGE_ROUTES.detail(book.id)}
            className="hover:underline focus-visible:ring-ring rounded outline-none focus-visible:ring-2"
          >
            {book.title}
          </Link>
        </CardTitle>
        <CardDescription>
          {book.author} · {book.category}
        </CardDescription>
        <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
          {book.description}
        </p>
        {typeof progress === "number" ? (
          <div className="mt-3">
            <div className="text-muted-foreground mb-1 flex justify-between text-xs">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={KNOWLEDGE_ROUTES.detail(book.id)}
            className="text-sm underline-offset-4 hover:underline"
          >
            Details
          </Link>
          <Link
            href={KNOWLEDGE_ROUTES.read(book.id)}
            className="text-sm underline-offset-4 hover:underline"
          >
            Read
          </Link>
        </div>
      </CardHeader>
    </Card>
  );
}

export function BookGrid({
  books,
  progressMap,
}: {
  books: KnowledgeBook[];
  progressMap?: Record<string, number>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          {...(progressMap?.[book.id] !== undefined
            ? { progress: progressMap[book.id] }
            : {})}
        />
      ))}
    </div>
  );
}

export function KnowledgePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-sm">Books & Knowledge</p>
        <h1 className="page-title">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div>
      ) : null}
    </header>
  );
}

export function BookSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="border-border bg-muted/30 h-56 animate-pulse rounded-2xl border"
        />
      ))}
    </div>
  );
}

"use client";

import { Heart, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import {
  BookGrid,
  KnowledgePageHeader,
} from "@/components/knowledge/book-card";
import { KnowledgeNav } from "@/components/knowledge/knowledge-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import {
  getBookById,
  getBooksByAuthor,
  getRelatedBooks,
} from "@/constants/knowledge-catalog";
import { cn } from "@/lib/utils";
import { useKnowledgeStore } from "@/store/knowledge-store";

function buildFlashcards(bookId: string, concepts: string[]) {
  return concepts.slice(0, 4).map((concept, index) => ({
    id: `${bookId}-fc-${index}`,
    front: `Concept ${index + 1}`,
    back: concept,
  }));
}

function buildQuiz(bookId: string, concepts: string[]) {
  return concepts.slice(0, 3).map((concept, index) => ({
    id: `${bookId}-qz-${index}`,
    question: `Which idea best matches: “${concept.slice(0, 48)}…”?`,
    options: [
      concept,
      "Ignore feedback and avoid deliberate practice",
      "Optimize only for short-term speed",
      "Avoid systems and rely on motivation alone",
    ],
    answerIndex: 0,
  }));
}

function explainTopic(topic: string, bookTitle: string) {
  return `${topic} in “${bookTitle}” is best understood as a practical lever: notice the cue, practice the behavior in a low-friction way, and review what changed. Connect it to one concrete situation from your week so the idea becomes usable knowledge rather than abstract theory.`;
}

function answerAboutBook(question: string, bookTitle: string, summary: string) {
  const trimmed = question.trim();
  if (!trimmed) {
    return "Ask a specific question about themes, chapters, or how to apply the ideas.";
  }
  return `Regarding “${trimmed}” in ${bookTitle}: ${summary} Focus on one chapter practice this week, then compare notes against your current system.`;
}

export function BookDetailPage({ bookId }: { bookId: string }) {
  const book = getBookById(bookId);
  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const favorites = useKnowledgeStore((s) => s.favorites);
  const toggleFavorite = useKnowledgeStore((s) => s.toggleFavorite);
  const pushHistory = useKnowledgeStore((s) => s.pushHistory);
  const progress = useKnowledgeStore((s) => s.progress);
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [quizPick, setQuizPick] = useState<Record<string, number | null>>({});
  const [askDraft, setAskDraft] = useState("");
  const [askReply, setAskReply] = useState<string | null>(null);
  const [topicFocus, setTopicFocus] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (book) pushHistory(book.id);
  }, [book, pushHistory]);

  const related = useMemo(
    () => (book ? getRelatedBooks(book) : []),
    [book],
  );
  const authorBooks = useMemo(
    () =>
      book
        ? getBooksByAuthor(book.author).filter((item) => item.id !== book.id)
        : [],
    [book],
  );
  const currentProgress = progress.find((item) => item.bookId === bookId);

  if (!book) {
    return (
      <div className="container-app py-10">
        <EmptyState
          title="Book not found"
          description="This title is not in the knowledge catalog."
          action={
            <Link href={KNOWLEDGE_ROUTES.root}>
              <Button type="button">Back to books</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const flashcards = buildFlashcards(book.id, book.keyConcepts);
  const quiz = buildQuiz(book.id, book.keyConcepts);
  const isFavorite = favorites.includes(book.id);

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <KnowledgePageHeader
        title={book.title}
        description={`${book.author} · ${book.category} · ${book.subject} · ${book.difficulty}`}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              aria-pressed={isFavorite}
              onClick={() => toggleFavorite(book.id)}
            >
              <Heart
                className={cn(
                  "size-4",
                  isFavorite && "fill-current text-rose-500",
                )}
              />
              {isFavorite ? "Favorited" : "Favorite"}
            </Button>
            <Link
              href={KNOWLEDGE_ROUTES.read(book.id)}
              className={cn(buttonVariants(), "h-10")}
            >
              {currentProgress ? "Continue reading" : "Start reading"}
            </Link>
          </>
        }
      />
      <KnowledgeNav />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="mb-3 text-5xl" aria-hidden="true">
              {book.cover}
            </div>
            <CardTitle>Book information</CardTitle>
            <CardDescription className="text-foreground/90 mt-2 text-sm leading-relaxed">
              {book.description}
            </CardDescription>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {[
                ["Author", book.author],
                ["Category", book.category],
                ["Subject", book.subject],
                ["Difficulty", book.difficulty],
                ["Pages", String(book.pages)],
                ["Language", book.language],
                ["Published", String(book.publishedYear)],
                ["Rating", `${book.rating}/5`],
                [
                  "Libraries",
                  book.libraries
                    .map((item) => item[0]!.toUpperCase() + item.slice(1))
                    .join(", "),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-border flex justify-between gap-3 rounded-xl border px-3 py-2"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Author profile</CardTitle>
              <CardDescription className="text-foreground/90 mt-2 leading-relaxed">
                {book.authorBio}
              </CardDescription>
              {authorBooks.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {authorBooks.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={KNOWLEDGE_ROUTES.detail(item.id)}
                        className="hover:underline"
                      >
                        Also by author: {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reading statistics</CardTitle>
              <CardDescription>
                Local progress tracked on this device.
              </CardDescription>
              <p className="mt-4 text-4xl font-semibold">
                {currentProgress?.percent ?? 0}%
              </p>
              <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${currentProgress?.percent ?? 0}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                {currentProgress
                  ? `Last read ${new Date(currentProgress.lastReadAt).toLocaleString()}`
                  : "Not started yet"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {book.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted rounded-full px-2.5 py-1 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden="true" />
            AI book summary
          </CardTitle>
          <CardDescription className="text-foreground/90 mt-2 leading-relaxed">
            {book.aiSummary}
          </CardDescription>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">Key concepts</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {book.keyConcepts.map((concept) => (
                  <li key={concept}>
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={() => setTopicFocus(concept)}
                    >
                      {concept}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Important points</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {book.importantPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
          {topicFocus ? (
            <div className="border-border mt-4 rounded-xl border p-3 text-sm">
              <p className="font-medium">AI topic explanation</p>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                {explainTopic(topicFocus, book.title)}
              </p>
            </div>
          ) : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended learning path</CardTitle>
          <CardDescription>
            A sequenced path to apply this book without overwhelm.
          </CardDescription>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
            {book.learningPath.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden="true" />
            AI ask about this book
          </CardTitle>
          <CardDescription>
            Ask how to apply ideas, compare chapters, or clarify concepts.
          </CardDescription>
          <Textarea
            className="mt-3"
            value={askDraft}
            onChange={(event) => setAskDraft(event.target.value)}
            placeholder="e.g. How do I apply the four laws this week?"
            aria-label="Ask about this book"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() =>
                setAskReply(
                  answerAboutBook(askDraft, book.title, book.aiSummary),
                )
              }
            >
              Ask AI
            </Button>
            <Input
              className="h-10 max-w-xs"
              value={topicFocus ?? ""}
              onChange={(event) => setTopicFocus(event.target.value || null)}
              placeholder="Focus topic for explanation"
              aria-label="Topic for AI explanation"
            />
          </div>
          {askReply ? (
            <p className="border-border mt-4 rounded-xl border p-3 text-sm leading-relaxed">
              {askReply}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI flashcards</CardTitle>
            <CardDescription>
              Generated from this book’s key concepts.
            </CardDescription>
            <div className="mt-4 space-y-3">
              {flashcards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="border-border hover:bg-muted/30 w-full rounded-xl border p-3 text-left transition"
                  onClick={() =>
                    setShowAnswer((prev) => ({
                      ...prev,
                      [card.id]: !prev[card.id],
                    }))
                  }
                >
                  <p className="text-sm font-medium">{card.front}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {showAnswer[card.id] ? card.back : "Tap to reveal"}
                  </p>
                </button>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI quiz generator</CardTitle>
            <CardDescription>
              Quick comprehension checks for this title.
            </CardDescription>
            <div className="mt-4 space-y-4">
              {quiz.map((item) => (
                <div key={item.id} className="space-y-2">
                  <p className="text-sm font-medium">{item.question}</p>
                  <div className="grid gap-2">
                    {item.options.map((option, index) => {
                      const picked = quizPick[item.id];
                      const correct = picked !== null && picked !== undefined;
                      const isAnswer = index === item.answerIndex;
                      const isPicked = picked === index;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={cn(
                            "border-border rounded-lg border px-3 py-2 text-left text-sm",
                            correct && isAnswer && "border-emerald-500",
                            correct && isPicked && !isAnswer && "border-rose-500",
                          )}
                          onClick={() =>
                            setQuizPick((prev) => ({
                              ...prev,
                              [item.id]: index,
                            }))
                          }
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Chapters</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {book.chapters.map((chapter, index) => (
            <Card key={chapter.id} padding="sm">
              <CardHeader>
                <CardTitle className="text-base">
                  {index + 1}. {chapter.title}
                </CardTitle>
                <CardDescription>{chapter.summary}</CardDescription>
                <Link
                  href={`${KNOWLEDGE_ROUTES.read(book.id)}?chapter=${chapter.id}`}
                  className="mt-2 text-sm underline-offset-4 hover:underline"
                >
                  Read chapter
                </Link>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Related books</h2>
        {related.length === 0 ? (
          <EmptyState
            title="No related titles"
            description="Browse the catalog for more."
          />
        ) : (
          <BookGrid books={related} />
        )}
      </section>
    </div>
  );
}

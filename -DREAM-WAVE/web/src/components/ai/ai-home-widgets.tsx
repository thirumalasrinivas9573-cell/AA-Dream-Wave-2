"use client";

import { BookOpen, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AI_ROUTES } from "@/constants/ai-platform";
import { KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import { getBookById } from "@/constants/knowledge-catalog";
import { LEARN_ROUTES } from "@/constants/learn";
import { getLearnAnimation } from "@/constants/learn-catalog";
import { cn } from "@/lib/utils";
import { useAiPlatformStore } from "@/store/ai-platform-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { useLearnStore } from "@/store/learn-store";

export function DailyLearningGoals() {
  const dailyGoals = useAiPlatformStore((s) => s.dailyGoals);
  const toggleDailyGoal = useAiPlatformStore((s) => s.toggleDailyGoal);
  const resetDailyGoals = useAiPlatformStore((s) => s.resetDailyGoals);
  const doneCount = dailyGoals.filter((goal) => goal.done).length;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Daily learning goals</CardTitle>
          <CardDescription>
            {doneCount}/{dailyGoals.length} complete today
          </CardDescription>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={resetDailyGoals}>
          Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {dailyGoals.map((goal) => (
          <button
            key={goal.id}
            type="button"
            onClick={() => toggleDailyGoal(goal.id)}
            className={cn(
              "border-border flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition",
              goal.done ? "bg-muted/50" : "hover:bg-muted/30",
            )}
            aria-pressed={goal.done}
          >
            <span
              className={cn(
                "mt-0.5 size-4 shrink-0 rounded-full border",
                goal.done
                  ? "bg-primary border-transparent"
                  : "border-border",
              )}
              aria-hidden="true"
            />
            <span className={cn(goal.done && "line-through opacity-70")}>
              {goal.label}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function ContinueLearningWidgets() {
  const knowledgeHydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrateKnowledge = useKnowledgeStore((s) => s.hydrate);
  const reading = useKnowledgeStore((s) => s.progress);
  const bookHistory = useKnowledgeStore((s) => s.history);
  const bookFavorites = useKnowledgeStore((s) => s.favorites);

  const learnHydrated = useLearnStore((s) => s.hydrated);
  const hydrateLearn = useLearnStore((s) => s.hydrate);
  const watchProgress = useLearnStore((s) => s.progress);
  const watchHistory = useLearnStore((s) => s.history);
  const learnFavorites = useLearnStore((s) => s.favorites);

  useEffect(() => {
    if (!knowledgeHydrated) hydrateKnowledge();
    if (!learnHydrated) hydrateLearn();
  }, [hydrateKnowledge, hydrateLearn, knowledgeHydrated, learnHydrated]);

  const continueReading = useMemo(() => {
    const open = reading.find((item) => !item.completed);
    if (open) return open;
    const id = bookHistory[0];
    if (!id) return null;
    return (
      reading.find((item) => item.bookId === id) ?? {
        bookId: id,
        chapterId: "",
        percent: 0,
        lastReadAt: "",
        completed: false,
      }
    );
  }, [bookHistory, reading]);

  const continueWatching = useMemo(() => {
    const open = watchProgress.find((item) => !item.completed);
    if (open) return open;
    const id = watchHistory[0];
    if (!id) return null;
    return (
      watchProgress.find((item) => item.animationId === id) ?? {
        animationId: id,
        positionSec: 0,
        percent: 0,
        completed: false,
        lastWatchedAt: "",
      }
    );
  }, [watchHistory, watchProgress]);

  const readBook = continueReading
    ? getBookById(continueReading.bookId)
    : undefined;
  const watchItem = continueWatching
    ? getLearnAnimation(continueWatching.animationId)
    : undefined;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="transition-transform hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4" aria-hidden="true" />
            Continue reading
          </CardTitle>
          <CardDescription>
            {readBook
              ? `${readBook.title} · ${continueReading?.percent ?? 0}%`
              : "No books in progress yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {readBook && continueReading ? (
            <Link
              href={KNOWLEDGE_ROUTES.read(continueReading.bookId)}
              className={cn(buttonVariants(), "h-10")}
            >
              Resume book
            </Link>
          ) : (
            <Link
              href={KNOWLEDGE_ROUTES.root}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Browse books
            </Link>
          )}
        </CardContent>
      </Card>

      <Card className="transition-transform hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="size-4" aria-hidden="true" />
            Continue watching
          </CardTitle>
          <CardDescription>
            {watchItem
              ? `${watchItem.title} · ${continueWatching?.percent ?? 0}%`
              : "No lessons in progress yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {watchItem && continueWatching ? (
            <Link
              href={LEARN_ROUTES.watch(continueWatching.animationId)}
              className={cn(buttonVariants(), "h-10")}
            >
              Resume lesson
            </Link>
          ) : (
            <Link
              href={LEARN_ROUTES.library}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Browse learn
            </Link>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" aria-hidden="true" />
            Favorite learning
          </CardTitle>
          <CardDescription>
            Quick access to saved books and animations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {bookFavorites.slice(0, 3).map((id) => {
            const book = getBookById(id);
            if (!book) return null;
            return (
              <Link
                key={id}
                href={KNOWLEDGE_ROUTES.detail(id)}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                )}
              >
                {book.title}
              </Link>
            );
          })}
          {learnFavorites.slice(0, 3).map((id) => {
            const item = getLearnAnimation(id);
            if (!item) return null;
            return (
              <Link
                key={id}
                href={LEARN_ROUTES.detail(id)}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                )}
              >
                {item.title}
              </Link>
            );
          })}
          {bookFavorites.length === 0 && learnFavorites.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Favorites will appear here as you save content.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function SmartSuggestions() {
  const roadmap = useAiPlatformStore((s) => s.roadmapProgress);
  const study = useAiPlatformStore((s) => s.studyProgress);
  const bookmarks = useAiPlatformStore((s) => s.conversationBookmarks);

  const suggestions = [
    {
      title: "Talk with your mentor",
      description: "Get clarity on what to focus on today.",
      href: AI_ROUTES.mentor,
    },
    {
      title: roadmap?.goal
        ? `Continue roadmap: ${roadmap.goal}`
        : "Generate a learning roadmap",
      description: roadmap
        ? `${roadmap.completedSteps.length} steps tracked`
        : "Build a phased plan with milestones.",
      href: AI_ROUTES.roadmap,
    },
    {
      title: study.lastSubject
        ? `Resume ${study.lastSubject} study`
        : "Start an AI lesson",
      description: `${study.lessonsStarted} lessons · ${study.quizzesCompleted} quizzes`,
      href: AI_ROUTES.teacher,
    },
    {
      title: "Career skill check",
      description: "Review gaps and certification ideas.",
      href: AI_ROUTES.career,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {suggestions.map((item) => (
          <Link
            key={item.href + item.title}
            href={item.href}
            className="focus-visible:ring-ring rounded-2xl outline-none focus-visible:ring-2"
          >
            <Card className="hover:bg-muted/30 h-full transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {bookmarks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookmarked conversations</CardTitle>
            <CardDescription>Jump back into saved AI chats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bookmarks.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="border-border rounded-xl border px-3 py-2 text-sm"
              >
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {item.preview}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No bookmarked chats yet"
          description="Use Bookmark inside any AI chat to save important conversations."
        />
      )}
    </div>
  );
}

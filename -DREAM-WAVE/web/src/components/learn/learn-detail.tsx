"use client";

import { Heart, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { LearnNav } from "@/components/learn/learn-nav";
import {
  AnimationGrid,
  LearnPageHeader,
} from "@/components/learn/learn-shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import { getBookById } from "@/constants/knowledge-catalog";
import {
  LEARN_PRACTICE_PROBLEMS,
  LEARN_RELATED_BOOKS,
  LEARN_RELATED_PROJECTS,
  LEARN_ROUTES,
} from "@/constants/learn";
import {
  getLearnAnimation,
  getRelatedAnimations,
} from "@/constants/learn-catalog";
import { cn } from "@/lib/utils";
import { useLearnStore } from "@/store/learn-store";

export function LearnDetailPage({ animationId }: { animationId: string }) {
  const hydrate = useLearnStore((s) => s.hydrate);
  const hydrated = useLearnStore((s) => s.hydrated);
  const favorites = useLearnStore((s) => s.favorites);
  const toggleFavorite = useLearnStore((s) => s.toggleFavorite);
  const progress = useLearnStore((s) => s.progress);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const animation = getLearnAnimation(animationId);
  const related = getRelatedAnimations(animationId);
  const watch = progress.find((item) => item.animationId === animationId);
  const isFavorite = favorites.includes(animationId);

  const timeline = useMemo(() => animation?.chapters ?? [], [animation]);
  const relatedBooks = useMemo(() => {
    const ids = LEARN_RELATED_BOOKS[animationId] ?? [];
    return ids
      .map((id) => getBookById(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [animationId]);
  const relatedProjects = LEARN_RELATED_PROJECTS[animationId] ?? [];
  const practiceProblems = LEARN_PRACTICE_PROBLEMS[animationId] ?? [];

  if (!animation) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Animation not found"
          description="This lesson may have been moved."
          action={
            <Link href={LEARN_ROUTES.library} className={cn(buttonVariants(), "h-10")}>
              Back to library
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <LearnPageHeader
        title={animation.title}
        description={animation.description}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              aria-pressed={isFavorite}
              onClick={() => toggleFavorite(animation.id)}
            >
              <Heart
                className={cn("size-4", isFavorite && "fill-current text-rose-500")}
              />
              {isFavorite ? "Favorited" : "Favorite"}
            </Button>
            <Link
              href={LEARN_ROUTES.watch(animation.id)}
              className={cn(buttonVariants(), "h-10")}
            >
              <Play className="size-4" aria-hidden="true" />
              {watch && watch.percent > 0 ? "Continue" : "Watch"}
            </Link>
          </>
        }
      />
      <LearnNav />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Animation details</CardTitle>
            <CardDescription>
              {animation.subject} · {animation.topic} · {animation.level} ·{" "}
              {Math.round(animation.durationSec / 60)} min
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-pretty">{animation.description}</p>
            <div className="flex flex-wrap gap-2">
              {animation.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted rounded-full px-2.5 py-1 text-xs capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>
            {watch ? (
              <div>
                <div className="text-muted-foreground mb-1 flex justify-between text-xs">
                  <span>Learning progress</span>
                  <span>{watch.percent}%</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${watch.percent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="border-border bg-muted/20 relative min-h-56 overflow-hidden rounded-2xl border bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.14),transparent_65%)]" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson timeline</CardTitle>
          <CardDescription>Chapter navigation for this animation.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-3 border-l pl-5">
            {timeline.map((chapter, index) => (
              <li key={chapter.id} className="relative">
                <span className="bg-primary absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full" />
                <p className="font-medium">
                  {index + 1}. {chapter.title}
                </p>
                <p className="text-muted-foreground text-xs text-pretty">
                  {chapter.summary}
                </p>
                <Link
                  href={LEARN_ROUTES.watch(animation.id)}
                  className="mt-1 inline-block text-xs underline-offset-4 hover:underline"
                >
                  Jump to player
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Recommended animations
        </h2>
        {related.length === 0 ? (
          <EmptyState
            title="No related lessons"
            description="Browse the library for more."
          />
        ) : (
          <AnimationGrid items={related} />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related books</CardTitle>
            <ul className="mt-3 space-y-1 text-sm">
              {relatedBooks.length === 0 ? (
                <li className="text-muted-foreground">None mapped.</li>
              ) : (
                relatedBooks.map((book) => (
                  <li key={book.id}>
                    <Link
                      href={KNOWLEDGE_ROUTES.detail(book.id)}
                      className="hover:underline"
                    >
                      {book.title}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related projects</CardTitle>
            <ul className="mt-3 space-y-1 text-sm">
              {relatedProjects.map((project) => (
                <li key={project.id}>
                  <Link href={project.href} className="hover:underline">
                    {project.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Practice problems</CardTitle>
            <ul className="mt-3 space-y-2 text-sm">
              {practiceProblems.length === 0 ? (
                <li className="text-muted-foreground">None mapped.</li>
              ) : (
                practiceProblems.map((problem) => (
                  <li key={problem.id} className="text-pretty">
                    {problem.prompt}
                  </li>
                ))
              )}
            </ul>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

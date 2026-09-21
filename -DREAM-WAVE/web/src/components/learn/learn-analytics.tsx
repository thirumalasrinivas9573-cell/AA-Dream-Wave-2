"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { LearnNav } from "@/components/learn/learn-nav";
import {
  AnimationGrid,
  LearnPageHeader,
} from "@/components/learn/learn-shared";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LEARN_ROUTES, LEARN_SUBJECTS, LEARN_TOPICS } from "@/constants/learn";
import {
  getLearnAnimation,
  LEARN_CATALOG,
} from "@/constants/learn-catalog";
import { cn } from "@/lib/utils";
import { useLearnStore } from "@/store/learn-store";
import type { LearnAchievement } from "@/types/learn";

export function LearnAnalyticsPage() {
  const hydrate = useLearnStore((s) => s.hydrate);
  const hydrated = useLearnStore((s) => s.hydrated);
  const progress = useLearnStore((s) => s.progress);
  const history = useLearnStore((s) => s.history);
  const completedQuizzes = useLearnStore((s) => s.completedQuizzes);
  const streakDays = useLearnStore((s) => s.streakDays);
  const dailyGoals = useLearnStore((s) => s.dailyGoals);
  const notes = useLearnStore((s) => s.notes);
  const bookmarks = useLearnStore((s) => s.bookmarks);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const completedAnimations = useMemo(
    () => progress.filter((item) => item.completed || item.percent >= 95),
    [progress],
  );

  const topicCompletion = useMemo(() => {
    return LEARN_TOPICS.map((topic) => {
      const items = LEARN_CATALOG.filter((item) => item.topic === topic.id);
      const done = items.filter((item) =>
        completedAnimations.some((row) => row.animationId === item.id),
      ).length;
      const percent =
        items.length === 0 ? 0 : Math.round((done / items.length) * 100);
      return { ...topic, total: items.length, done, percent };
    });
  }, [completedAnimations]);

  const subjectCompletion = useMemo(() => {
    return LEARN_SUBJECTS.map((subject) => {
      const items = LEARN_CATALOG.filter((item) => item.subject === subject.id);
      const done = items.filter((item) =>
        completedAnimations.some((row) => row.animationId === item.id),
      ).length;
      const percent =
        items.length === 0 ? 0 : Math.round((done / items.length) * 100);
      return { ...subject, total: items.length, done, percent };
    });
  }, [completedAnimations]);

  const weeklyProgress = useMemo(() => {
    return [...progress]
      .sort(
        (a, b) =>
          Date.parse(b.lastWatchedAt) - Date.parse(a.lastWatchedAt),
      )
      .slice(0, 7);
  }, [progress]);

  const achievements: LearnAchievement[] = useMemo(
    () => [
      {
        id: "ach-first",
        title: "First orbit",
        description: "Started your first animation.",
        earned: history.length > 0,
      },
      {
        id: "ach-streak",
        title: "Streak builder",
        description: "Maintain a 3-day learning streak.",
        earned: streakDays >= 3,
      },
      {
        id: "ach-quiz",
        title: "Quiz finisher",
        description: "Complete at least one lesson quiz.",
        earned: completedQuizzes.length > 0,
      },
      {
        id: "ach-notes",
        title: "Note taker",
        description: "Save three or more learning notes.",
        earned: notes.length >= 3,
      },
      {
        id: "ach-complete",
        title: "Lesson finisher",
        description: "Complete an animation to 95%+.",
        earned: completedAnimations.length > 0,
      },
      {
        id: "ach-goals",
        title: "Daily driver",
        description: "Complete all AI daily goals.",
        earned: dailyGoals.every((goal) => goal.completed),
      },
    ],
    [
      completedAnimations.length,
      completedQuizzes.length,
      dailyGoals,
      history.length,
      notes.length,
      streakDays,
    ],
  );

  const recentlyCompleted = useMemo(
    () =>
      completedAnimations
        .map((item) => getLearnAnimation(item.animationId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, 6),
    [completedAnimations],
  );

  if (!hydrated) {
    return (
      <div className="container-app space-y-6 py-8 md:py-10">
        <LearnPageHeader title="Learning analytics" />
        <div className="bg-muted/30 h-48 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-8 md:py-10">
      <LearnPageHeader
        title="Learning analytics"
        description="Topic completion, weekly progress, streaks, and achievement cards."
        actions={
          <Link
            href={LEARN_ROUTES.root}
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          >
            Learning home
          </Link>
        }
      />
      <LearnNav />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Streak", `${streakDays} day${streakDays === 1 ? "" : "s"}`],
          ["Completed", String(completedAnimations.length)],
          ["Quizzes", String(completedQuizzes.length)],
          ["Bookmarks", String(bookmarks.length)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Weekly progress</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {weeklyProgress.length} recent lesson
              {weeklyProgress.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription>
              Latest activity average{" "}
              {weeklyProgress.length
                ? Math.round(
                    weeklyProgress.reduce((sum, item) => sum + item.percent, 0) /
                      weeklyProgress.length,
                  )
                : 0}
              %
            </CardDescription>
            <ul className="mt-4 space-y-2 text-sm">
              {weeklyProgress.length === 0 ? (
                <li className="text-muted-foreground">No activity this week yet.</li>
              ) : (
                weeklyProgress.map((item) => {
                  const animation = getLearnAnimation(item.animationId);
                  return (
                    <li
                      key={item.animationId}
                      className="border-border flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                    >
                      <span>{animation?.title ?? item.animationId}</span>
                      <span className="text-muted-foreground">{item.percent}%</span>
                    </li>
                  );
                })
              )}
            </ul>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Topic completion</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {topicCompletion.map((topic) => (
            <Card key={topic.id}>
              <CardHeader>
                <CardTitle className="text-base">{topic.label}</CardTitle>
                <CardDescription>
                  {topic.done}/{topic.total} animations
                </CardDescription>
                <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${topic.percent}%` }}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Animation completion by subject</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {subjectCompletion.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <CardTitle className="text-base">{subject.label}</CardTitle>
                <CardDescription>
                  {subject.percent}% · {subject.done}/{subject.total}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Achievement cards</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {achievements.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "transition",
                item.earned ? "border-primary/40 bg-primary/5" : "opacity-70",
              )}
            >
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
                <p className="mt-2 text-xs font-medium">
                  {item.earned ? "Earned" : "Locked"}
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Completed animations</h2>
        {recentlyCompleted.length === 0 ? (
          <EmptyState
            title="No completions yet"
            description="Finish a lesson to populate this list."
            action={
              <Link href={LEARN_ROUTES.library} className={cn(buttonVariants(), "h-10")}>
                Open library
              </Link>
            }
          />
        ) : (
          <AnimationGrid items={recentlyCompleted} />
        )}
      </section>
    </div>
  );
}

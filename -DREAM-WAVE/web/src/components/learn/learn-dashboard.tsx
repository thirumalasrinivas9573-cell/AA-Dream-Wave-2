"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { LearnNav } from "@/components/learn/learn-nav";
import {
  AnimationGrid,
  AnimationSkeletonGrid,
  LearnPageHeader,
} from "@/components/learn/learn-shared";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_WEEKLY_PLAN,
  LEARN_ROUTES,
  LEARN_SUBJECTS,
} from "@/constants/learn";
import {
  getLearnAnimation,
  LEARN_CATALOG,
} from "@/constants/learn-catalog";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import { useLearnStore } from "@/store/learn-store";
import type { LessonSuggestion } from "@/types/learn";

export function LearnDashboardPage() {
  const { token } = useAuth();
  const hydrate = useLearnStore((s) => s.hydrate);
  const hydrated = useLearnStore((s) => s.hydrated);
  const progress = useLearnStore((s) => s.progress);
  const history = useLearnStore((s) => s.history);
  const favorites = useLearnStore((s) => s.favorites);
  const dailyGoals = useLearnStore((s) => s.dailyGoals);
  const toggleDailyGoal = useLearnStore((s) => s.toggleDailyGoal);
  const streakDays = useLearnStore((s) => s.streakDays);
  const touchStreak = useLearnStore((s) => s.touchStreak);

  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<LessonSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sceneSubject, setSceneSubject] = useState<string>("science");
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (hydrated) touchStreak();
  }, [hydrated, touchStreak]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (token) {
          const data = await studentService.lessons.suggestions(token);
          if (!active) return;
          setSuggestions(data.suggestions ?? []);
        }
      } catch (err) {
        if (!active) return;
        setError(toUserSafeMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    queueMicrotask(() => {
      void load();
    });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (reducedMotion) return;
    const ids = LEARN_SUBJECTS.map((item) => item.id);
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % ids.length;
      setSceneSubject(ids[index] ?? "science");
    }, 5000);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of progress) map[item.animationId] = item.percent;
    return map;
  }, [progress]);

  const continueLearning = useMemo(() => {
    return progress
      .filter((item) => !item.completed && item.percent > 0 && item.percent < 100)
      .map((item) => getLearnAnimation(item.animationId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 6);
  }, [progress]);

  const recentlyWatched = useMemo(() => {
    return history
      .map((id) => getLearnAnimation(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 6);
  }, [history]);

  const favoriteItems = useMemo(() => {
    return favorites
      .map((id) => getLearnAnimation(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 6);
  }, [favorites]);

  const recommendedLessons = useMemo(() => {
    if (!suggestions.length) {
      const seen = new Set([
        ...favorites,
        ...history,
        ...continueLearning.map((item) => item.id),
      ]);
      return LEARN_CATALOG.filter((item) => !seen.has(item.id)).slice(0, 6);
    }
    const topics = suggestions.map((s) => s.topic.toLowerCase());
    const matched = LEARN_CATALOG.filter((item) =>
      topics.some(
        (topic) =>
          item.title.toLowerCase().includes(topic) ||
          item.tags.some((tag) => topic.includes(tag)),
      ),
    );
    return matched.length ? matched.slice(0, 6) : LEARN_CATALOG.slice(0, 3);
  }, [continueLearning, favorites, history, suggestions]);

  const timeline = useMemo(() => {
    return [...progress]
      .sort(
        (a, b) =>
          new Date(b.lastWatchedAt).getTime() -
          new Date(a.lastWatchedAt).getTime(),
      )
      .slice(0, 6)
      .map((item) => ({
        ...item,
        animation: getLearnAnimation(item.animationId),
      }))
      .filter((item) => item.animation);
  }, [progress]);

  const goalsDone = dailyGoals.filter((goal) => goal.completed).length;

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-8 md:py-10">
      <LearnPageHeader
        title="Adaptive Learning"
        description="Personalized interactive animation learning with daily goals, weekly plans, and 3D topic scenes."
        actions={
          <>
            <Link
              href="/learn/intelligence"
              className={cn(buttonVariants(), "h-10")}
            >
              Skill Intelligence
            </Link>
            <Link
              href={LEARN_ROUTES.library}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Library
            </Link>
            <Link
              href={LEARN_ROUTES.analytics}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Analytics
            </Link>
          </>
        }
      />

      <LearnNav />

      <section className="border-border relative overflow-hidden rounded-2xl border">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
            <p className="text-muted-foreground text-sm">
              Personalized dashboard · {streakDays}-day streak
            </p>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Learn with motion, not just slides
            </h2>
            <p className="text-muted-foreground max-w-md text-sm text-pretty">
              Continue lessons, hit AI daily goals, and explore animated 3D topic
              transitions across subjects.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={LEARN_ROUTES.library} className={cn(buttonVariants(), "h-10")}>
                Browse animations
              </Link>
              {continueLearning[0] ? (
                <Link
                  href={LEARN_ROUTES.watch(continueLearning[0].id)}
                  className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                >
                  Continue learning
                </Link>
              ) : null}
            </div>
          </div>
          <div className="bg-muted/20 relative min-h-56 overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.15),transparent_65%)] lg:min-h-72">
            <p className="bg-background/80 absolute right-3 bottom-3 rounded-full px-2.5 py-1 text-xs capitalize backdrop-blur">
              {sceneSubject}
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <AuthAlert
          variant="error"
          title="Suggestions unavailable"
          description={error}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">AI daily goals</h2>
          <span className="text-muted-foreground text-sm">
            {goalsDone}/{dailyGoals.length} done
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {dailyGoals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              className={cn(
                "border-border rounded-2xl border p-4 text-left transition",
                goal.completed
                  ? "border-primary/40 bg-primary/5"
                  : "hover:bg-muted/40",
              )}
              aria-pressed={goal.completed}
              onClick={() => toggleDailyGoal(goal.id)}
            >
              <p className="font-medium">{goal.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {goal.description}
              </p>
              <p className="text-muted-foreground mt-3 text-xs">
                {goal.targetMinutes} min · {goal.completed ? "Completed" : "Tap to toggle"}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">AI weekly learning plan</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {DEFAULT_WEEKLY_PLAN.map((item) => (
            <Card key={item.id} className="h-full">
              <CardHeader>
                <CardDescription>{item.day}</CardDescription>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <p className="text-muted-foreground text-xs">
                  {item.focus} · {item.minutes}m
                </p>
                {item.animationId ? (
                  <Link
                    href={LEARN_ROUTES.watch(item.animationId)}
                    className="mt-2 text-sm underline-offset-4 hover:underline"
                  >
                    Open lesson
                  </Link>
                ) : (
                  <Link
                    href={LEARN_ROUTES.analytics}
                    className="mt-2 text-sm underline-offset-4 hover:underline"
                  >
                    Review analytics
                  </Link>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Learning progress timeline</h2>
        {timeline.length === 0 ? (
          <EmptyState
            title="No progress yet"
            description="Watch a lesson to build your timeline."
          />
        ) : (
          <ol className="border-border relative space-y-3 border-l pl-5">
            {timeline.map((item) => (
              <li key={item.animationId} className="relative">
                <span className="bg-primary absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.animation?.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(item.lastWatchedAt).toLocaleString()} ·{" "}
                      {item.percent}%
                    </p>
                  </div>
                  <Link
                    href={LEARN_ROUTES.watch(item.animationId)}
                    className="text-sm underline-offset-4 hover:underline"
                  >
                    Resume
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Subjects</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LEARN_SUBJECTS.map((subject) => (
            <Link
              key={subject.id}
              href={LEARN_ROUTES.subject(subject.id)}
              className="focus-visible:ring-ring rounded-2xl outline-none focus-visible:ring-2"
              onMouseEnter={() => setSceneSubject(subject.id)}
              onFocus={() => setSceneSubject(subject.id)}
            >
              <Card className="hover:bg-muted/30 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{subject.label}</CardTitle>
                  <CardDescription>{subject.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Continue learning</h2>
          <Link
            href={LEARN_ROUTES.history}
            className="text-muted-foreground text-sm hover:underline"
          >
            History
          </Link>
        </div>
        {!hydrated ? (
          <AnimationSkeletonGrid />
        ) : continueLearning.length === 0 ? (
          <EmptyState
            title="Nothing in progress"
            description="Start an animation to track watch progress here."
            action={
              <Link href={LEARN_ROUTES.library} className={cn(buttonVariants(), "h-10")}>
                Open library
              </Link>
            }
          />
        ) : (
          <AnimationGrid items={continueLearning} progressMap={progressMap} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Recommended lessons</h2>
        {loading ? (
          <AnimationSkeletonGrid />
        ) : (
          <>
            {suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 6).map((item) => (
                  <Button
                    key={`${item.topic}-${item.source}`}
                    size="sm"
                    variant="outline"
                    type="button"
                  >
                    {item.topic}
                    {item.reason ? ` · ${item.reason}` : ""}
                  </Button>
                ))}
              </div>
            ) : null}
            <AnimationGrid items={recommendedLessons} progressMap={progressMap} />
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Recently watched</h2>
        {recentlyWatched.length === 0 ? (
          <EmptyState
            title="No recent animations"
            description="Watched lessons will appear here."
          />
        ) : (
          <AnimationGrid items={recentlyWatched} progressMap={progressMap} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Favorite animations</h2>
        {favoriteItems.length === 0 ? (
          <EmptyState
            title="No favorites yet"
            description="Tap the heart on any animation card to save it."
          />
        ) : (
          <AnimationGrid items={favoriteItems} progressMap={progressMap} />
        )}
      </section>
    </div>
  );
}

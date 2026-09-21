"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { Spinner } from "@/components/common/spinner";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  WorkspaceNav,
  WorkspacePageHeader,
} from "@/components/workspace/workspace-nav";
import { KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import { getBookById } from "@/constants/knowledge-catalog";
import { LEARN_ROUTES } from "@/constants/learn";
import { getLearnAnimation } from "@/constants/learn-catalog";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useCareerIntelStore } from "@/store/career-intel-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { useLearnStore } from "@/store/learn-store";
import { useWorkspaceStore } from "@/store/workspace-store";

export function WorkspaceInsightsPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const goals = useWorkspaceStore((s) => s.goals);
  const sessions = useWorkspaceStore((s) => s.sessions);
  const productivityScore = useWorkspaceStore((s) => s.productivityScore);
  const focusMinutesToday = useWorkspaceStore((s) => s.focusMinutesToday);

  const learnHydrated = useLearnStore((s) => s.hydrated);
  const hydrateLearn = useLearnStore((s) => s.hydrate);
  const learnProgress = useLearnStore((s) => s.progress);
  const learnHistory = useLearnStore((s) => s.history);
  const completedQuizzes = useLearnStore((s) => s.completedQuizzes);
  const streakDays = useLearnStore((s) => s.streakDays);

  const knowledgeHydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrateKnowledge = useKnowledgeStore((s) => s.hydrate);
  const readingProgress = useKnowledgeStore((s) => s.progress);
  const readingHistory = useKnowledgeStore((s) => s.history);

  const careerHydrated = useCareerIntelStore((s) => s.hydrated);
  const hydrateCareer = useCareerIntelStore((s) => s.hydrate);
  const readinessScore = useCareerIntelStore((s) => s.readinessScore);
  const careerGoals = useCareerIntelStore((s) => s.goals);

  useEffect(() => {
    if (!hydrated) hydrate();
    if (!learnHydrated) hydrateLearn();
    if (!knowledgeHydrated) hydrateKnowledge();
    if (!careerHydrated) hydrateCareer();
  }, [
    careerHydrated,
    hydrate,
    hydrateCareer,
    hydrateKnowledge,
    hydrateLearn,
    hydrated,
    knowledgeHydrated,
    learnHydrated,
  ]);

  const timeline = useMemo(() => {
    const items: Array<{ at: string; label: string; href?: string }> = [];
    for (const session of sessions.slice(0, 4)) {
      items.push({
        at: session.completedAt,
        label: `${session.mode} session · ${session.minutes}m`,
        href: "/workspace/focus",
      });
    }
    for (const item of learnProgress.slice(0, 3)) {
      const animation = getLearnAnimation(item.animationId);
      items.push({
        at: item.lastWatchedAt,
        label: `Learning · ${animation?.title ?? item.animationId} (${item.percent}%)`,
        href: LEARN_ROUTES.watch(item.animationId),
      });
    }
    for (const item of readingProgress.slice(0, 3)) {
      const book = getBookById(item.bookId);
      items.push({
        at: item.lastReadAt,
        label: `Reading · ${book?.title ?? item.bookId} (${item.percent}%)`,
        href: KNOWLEDGE_ROUTES.read(item.bookId),
      });
    }
    return items
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, 10);
  }, [learnProgress, readingProgress, sessions]);

  const achievements = useMemo(
    () => [
      {
        id: "a1",
        title: "Focus starter",
        earned: sessions.some((item) => item.mode === "focus"),
        detail: "Complete a pomodoro block",
      },
      {
        id: "a2",
        title: "Task finisher",
        earned: tasks.some((task) => task.status === "done"),
        detail: "Mark a workspace task done",
      },
      {
        id: "a3",
        title: "Learning streak",
        earned: streakDays >= 3,
        detail: "Maintain a 3-day learning streak",
      },
      {
        id: "a4",
        title: "Quiz complete",
        earned: completedQuizzes.length > 0,
        detail: "Finish an animation quiz",
      },
      {
        id: "a5",
        title: "Reader in motion",
        earned: readingHistory.length > 0,
        detail: "Open a Smart Library book",
      },
      {
        id: "a6",
        title: "Career momentum",
        earned: readinessScore >= 50,
        detail: "Reach 50+ career readiness",
      },
    ],
    [
      completedQuizzes.length,
      readingHistory.length,
      readinessScore,
      sessions,
      streakDays,
      tasks,
    ],
  );

  if (!hydrated || !learnHydrated || !knowledgeHydrated || !careerHydrated) {
    return (
      <div className="container-app flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading insights" />
      </div>
    );
  }

  const completedAnimations = learnProgress.filter(
    (item) => item.completed || item.percent >= 95,
  ).length;
  const avgReading =
    readingProgress.length === 0
      ? 0
      : Math.round(
          readingProgress.reduce((sum, item) => sum + item.percent, 0) /
            readingProgress.length,
        );
  const careerDone = careerGoals.filter((goal) => goal.done).length;

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-8 md:py-10">
      <WorkspacePageHeader
        title="Personal dashboard"
        description="Activity timeline, learning/reading/animation stats, career progress, and achievements."
        actions={
          <Link
            href={ROUTES.dashboard}
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          >
            Platform dashboard
          </Link>
        }
      />
      <WorkspaceNav />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Productivity", String(productivityScore)],
          ["Focus today", `${focusMinutesToday}m`],
          ["Learning streak", `${streakDays}d`],
          ["Career readiness", String(readinessScore)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learning statistics</CardTitle>
            <ul className="mt-3 space-y-1 text-sm">
              <li>History items: {learnHistory.length}</li>
              <li>Completed animations: {completedAnimations}</li>
              <li>Quizzes finished: {completedQuizzes.length}</li>
            </ul>
            <Link
              href={LEARN_ROUTES.analytics}
              className="mt-3 inline-block text-sm underline-offset-4 hover:underline"
            >
              Open learning analytics
            </Link>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reading statistics</CardTitle>
            <ul className="mt-3 space-y-1 text-sm">
              <li>Books opened: {readingHistory.length}</li>
              <li>Avg progress: {avgReading}%</li>
              <li>In progress: {readingProgress.filter((i) => !i.completed).length}</li>
            </ul>
            <Link
              href={KNOWLEDGE_ROUTES.root}
              className="mt-3 inline-block text-sm underline-offset-4 hover:underline"
            >
              Open Smart Library
            </Link>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Career progress</CardTitle>
            <ul className="mt-3 space-y-1 text-sm">
              <li>Readiness: {readinessScore}</li>
              <li>
                Goals done: {careerDone}/{careerGoals.length || 0}
              </li>
              <li>
                Workspace goals:{" "}
                {goals.filter((goal) => goal.progress >= 100).length}/
                {goals.length}
              </li>
            </ul>
            <Link
              href="/ai/career"
              className="mt-3 inline-block text-sm underline-offset-4 hover:underline"
            >
              Open career intel
            </Link>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Activity timeline</h2>
        <ol className="relative space-y-3 border-l pl-5">
          {timeline.map((item) => (
            <li key={`${item.at}-${item.label}`} className="relative">
              <span className="bg-primary absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full" />
              <p className="font-medium">{item.label}</p>
              <p className="text-muted-foreground text-xs">
                {new Date(item.at).toLocaleString()}
              </p>
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-xs underline-offset-4 hover:underline"
                >
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Achievement cards</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {achievements.map((item) => (
            <Card
              key={item.id}
              className={item.earned ? "border-primary/40 bg-primary/5" : "opacity-70"}
            >
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.detail}</CardDescription>
                <p className="mt-2 text-xs font-medium">
                  {item.earned ? "Earned" : "Locked"}
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

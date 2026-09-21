"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
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
import { LEARN_ROUTES } from "@/constants/learn";
import { getLearnAnimation } from "@/constants/learn-catalog";
import { ROUTES } from "@/constants/routes";
import {
  QUICK_ACTIONS,
  WORKSPACE_ROUTES,
} from "@/constants/workspace";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import { useLearnStore } from "@/store/learn-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { Goal, Task } from "@/types/student";

export function WorkspaceHomePage() {
  const { token } = useAuth();
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const goals = useWorkspaceStore((s) => s.goals);
  const dailyInsights = useWorkspaceStore((s) => s.dailyInsights);
  const productivityScore = useWorkspaceStore((s) => s.productivityScore);
  const focusMinutesToday = useWorkspaceStore((s) => s.focusMinutesToday);
  const events = useWorkspaceStore((s) => s.events);

  const learnHydrated = useLearnStore((s) => s.hydrated);
  const hydrateLearn = useLearnStore((s) => s.hydrate);
  const learnProgress = useLearnStore((s) => s.progress);

  const [apiGoals, setApiGoals] = useState<Goal[]>([]);
  const [apiTasks, setApiTasks] = useState<Task[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
    if (!learnHydrated) hydrateLearn();
  }, [hydrate, hydrateLearn, hydrated, learnHydrated]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!token) return;
      setLoadingApi(true);
      setApiError(null);
      try {
        const [goalsRes, tasksRes] = await Promise.all([
          studentService.goals.list(token),
          studentService.tasks.list(token),
        ]);
        if (!active) return;
        setApiGoals(goalsRes.goals ?? []);
        setApiTasks(tasksRes.tasks ?? []);
      } catch (err) {
        if (!active) return;
        setApiError(toUserSafeMessage(err));
      } finally {
        if (active) setLoadingApi(false);
      }
    }
    queueMicrotask(() => {
      void load();
    });
    return () => {
      active = false;
    };
  }, [token]);

  const continueLearning = useMemo(() => {
    return learnProgress
      .filter((item) => !item.completed && item.percent > 0 && item.percent < 100)
      .map((item) => getLearnAnimation(item.animationId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 3);
  }, [learnProgress]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status !== "done")
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 5);
  }, [tasks]);

  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((event) => event.date === today);

  const planner = useMemo(() => {
    const openHigh = tasks.filter(
      (task) => task.status !== "done" && task.priority === "High",
    ).length;
    return [
      {
        title: "Morning focus",
        detail: `Protect ${focusMinutesToday >= 25 ? "another" : "a"} 25-minute deep-work block.`,
      },
      {
        title: "Priority sweep",
        detail:
          openHigh > 0
            ? `Clear ${openHigh} high-priority task${openHigh === 1 ? "" : "s"} before noon.`
            : "No high-priority tasks left — schedule a learning block.",
      },
      {
        title: "Evening review",
        detail: "Capture one note and mark goal progress before shutdown.",
      },
    ];
  }, [focusMinutesToday, tasks]);

  const suggestions = useMemo(() => {
    return [
      ...dailyInsights.map((item) => item.detail),
      apiGoals[0]
        ? `Advance goal: ${apiGoals[0].title}`
        : "Create a career goal to unlock AI planning.",
      apiTasks.filter((t) => !t.completed).length
        ? `${apiTasks.filter((t) => !t.completed).length} synced API tasks need attention.`
        : "Synced task list is clear.",
    ].slice(0, 5);
  }, [apiGoals, apiTasks, dailyInsights]);

  if (!hydrated) {
    return (
      <div className="container-app flex min-h-[40vh] items-center justify-center py-10">
        <Spinner label="Loading workspace" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-8 md:py-10">
      <WorkspacePageHeader
        title="Smart Workspace"
        description="One intelligent dashboard for learning, career, and personal productivity."
        actions={
          <Link
            href={WORKSPACE_ROUTES.focus}
            className={cn(buttonVariants(), "h-10")}
          >
            Start focus
          </Link>
        }
      />
      <WorkspaceNav />

      {apiError ? (
        <AuthAlert
          variant="error"
          title="Synced goals/tasks unavailable"
          description={apiError}
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Productivity score", String(productivityScore)],
          ["Focus today", `${focusMinutesToday}m`],
          ["Open tasks", String(upcomingTasks.length)],
          ["Active goals", String(goals.filter((g) => g.progress < 100).length)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s overview</CardTitle>
            <CardDescription>
              Schedule, focus, and the next outcomes that matter.
            </CardDescription>
            <ul className="mt-4 space-y-2 text-sm">
              {todayEvents.length === 0 ? (
                <li className="text-muted-foreground">No calendar events today.</li>
              ) : (
                todayEvents.map((event) => (
                  <li
                    key={event.id}
                    className="border-border flex justify-between gap-3 rounded-xl border px-3 py-2"
                  >
                    <span>
                      {event.title}
                      <span className="text-muted-foreground"> · {event.kind}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {event.startTime ?? "—"}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI daily planner</CardTitle>
            <CardDescription>A lightweight plan for the next blocks.</CardDescription>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
              {planner.map((item) => (
                <li key={item.title}>
                  <span className="font-medium">{item.title}</span>
                  <p className="text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ol>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Continue learning</h2>
          <Link
            href={LEARN_ROUTES.root}
            className="text-muted-foreground text-sm hover:underline"
          >
            Open Learn
          </Link>
        </div>
        {continueLearning.length === 0 ? (
          <EmptyState
            title="Nothing in progress"
            description="Start an animation lesson to continue here."
            action={
              <Link href={LEARN_ROUTES.library} className={cn(buttonVariants(), "h-10")}>
                Browse lessons
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {continueLearning.map((item) => (
              <Link key={item.id} href={LEARN_ROUTES.watch(item.id)}>
                <Card className="hover:bg-muted/30 h-full transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {item.cover} {item.title}
                    </CardTitle>
                    <CardDescription>
                      {item.subject} · resume watching
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Upcoming tasks</CardTitle>
              <Link
                href={WORKSPACE_ROUTES.tasks}
                className="text-muted-foreground text-sm hover:underline"
              >
                Board
              </Link>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {upcomingTasks.length === 0 ? (
                <li className="text-muted-foreground">No open tasks.</li>
              ) : (
                upcomingTasks.map((task) => (
                  <li
                    key={task.id}
                    className="border-border flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                  >
                    <span>
                      {task.title}
                      <span className="text-muted-foreground">
                        {" "}
                        · {task.priority}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {task.dueDate ?? "No due date"}
                    </span>
                  </li>
                ))
              )}
            </ul>
            {loadingApi ? (
              <p className="text-muted-foreground mt-3 text-xs">Syncing API tasks…</p>
            ) : apiTasks.length > 0 ? (
              <p className="text-muted-foreground mt-3 text-xs">
                {apiTasks.filter((t) => !t.completed).length} open tasks also synced from{" "}
                <Link href={ROUTES.tasks} className="underline">
                  Tasks
                </Link>
                .
              </p>
            ) : null}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI suggestions</CardTitle>
            <CardDescription>Next best moves for today.</CardDescription>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
              {suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Goal snapshot</h2>
          <Link
            href={WORKSPACE_ROUTES.goals}
            className="text-muted-foreground text-sm hover:underline"
          >
            Manage goals
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {goals.slice(0, 3).map((goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <CardTitle className="text-base">{goal.title}</CardTitle>
                <CardDescription>
                  {goal.horizon} · {goal.progress}%
                </CardDescription>
                <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
        {apiGoals[0] ? (
          <p className="text-muted-foreground text-sm">
            Synced goal: {apiGoals[0].title} — open{" "}
            <Link href={ROUTES.goals} className="underline">
              Goals
            </Link>{" "}
            for AI plans.
          </p>
        ) : null}
      </section>
    </div>
  );
}

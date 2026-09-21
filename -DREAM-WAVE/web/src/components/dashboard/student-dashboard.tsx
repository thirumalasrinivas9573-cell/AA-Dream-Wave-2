"use client";

import Link from "next/link";
import {
  type CSSProperties,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { DashboardCustomizer } from "@/components/dashboard/dashboard-customizer";
import {
  PersonalizedHomePanel,
  PersonalizedRecommendationsPanel,
} from "@/components/personalization/personalized-panels";
import {
  ActivityTimeline,
  ContinueCard,
  DashboardSection,
  ExportButton,
  MiniBarChart,
  ProgressBar,
  SmartStatCard,
  Sparkline,
} from "@/components/dashboard/dashboard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import {
  getBookById,
  KNOWLEDGE_CATALOG,
} from "@/constants/knowledge-catalog";
import { LEARN_ROUTES } from "@/constants/learn";
import {
  getLearnAnimation,
  LEARN_CATALOG,
} from "@/constants/learn-catalog";
import {
  ACCENT_OPTIONS,
} from "@/constants/personalization";
import { ROUTES } from "@/constants/routes";
import { WORKSPACE_ROUTES } from "@/constants/workspace";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import { useCareerIntelStore } from "@/store/career-intel-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { useLearnStore } from "@/store/learn-store";
import { usePersonalizationStore } from "@/store/personalization-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { DashboardWidgetId } from "@/types/personalization";
import type { Goal, Task } from "@/types/student";

type StudentDashboardProps = {
  name?: string;
  goal?: string;
};

const LearningHeatmap = memo(function LearningHeatmap({
  values,
}: {
  values: number[];
}) {
  const cells = useMemo(
    () =>
      values.map((value, index) => ({
        index,
        value,
        style: {
          background: `color-mix(in oklch, var(--dashboard-accent, var(--primary)) ${Math.max(12, value)}%, transparent)`,
        } satisfies CSSProperties,
      })),
    [values],
  );

  return (
    <div
      className="grid grid-cols-7 gap-1.5"
      role="img"
      aria-label="Learning heatmap for the last weeks"
    >
      {cells.map((cell) => (
        <div
          key={cell.index}
          className="aspect-square rounded-sm"
          title={`Day ${cell.index + 1}: ${cell.value}`}
          style={cell.style}
        />
      ))}
    </div>
  );
});


export function StudentDashboard({ name, goal }: StudentDashboardProps) {
  const { token } = useAuth();

  const hydratePersonalization = usePersonalizationStore((s) => s.hydrate);
  const personalizationHydrated = usePersonalizationStore((s) => s.hydrated);
  const widgetOrder = usePersonalizationStore((s) => s.widgetOrder);
  const widgets = usePersonalizationStore((s) => s.widgets);
  const accent = usePersonalizationStore((s) => s.accent);
  const denserLayout = usePersonalizationStore((s) => s.denserLayout);
  const favoriteSections = usePersonalizationStore((s) => s.favoriteSections);
  const quickActions = usePersonalizationStore((s) => s.quickActions);
  const smartNotifications = usePersonalizationStore((s) => s.notifications);
  const markNotificationRead = usePersonalizationStore(
    (s) => s.markNotificationRead,
  );
  const markAllNotificationsRead = usePersonalizationStore(
    (s) => s.markAllNotificationsRead,
  );
  const clearNotifications = usePersonalizationStore((s) => s.clearNotifications);

  const hydrateKnowledge = useKnowledgeStore((s) => s.hydrate);
  const knowledgeHydrated = useKnowledgeStore((s) => s.hydrated);
  const bookProgress = useKnowledgeStore((s) => s.progress);
  const bookHistory = useKnowledgeStore((s) => s.history);

  const hydrateLearn = useLearnStore((s) => s.hydrate);
  const learnHydrated = useLearnStore((s) => s.hydrated);
  const watchProgress = useLearnStore((s) => s.progress);
  const watchHistory = useLearnStore((s) => s.history);
  const streakDays = useLearnStore((s) => s.streakDays);
  const dailyGoalsLearn = useLearnStore((s) => s.dailyGoals);

  const hydrateCareer = useCareerIntelStore((s) => s.hydrate);
  const careerHydrated = useCareerIntelStore((s) => s.hydrated);
  const readinessScore = useCareerIntelStore((s) => s.readinessScore);
  const interviewReadiness = useCareerIntelStore((s) => s.interviewReadiness);
  const placementReadiness = useCareerIntelStore((s) => s.placementReadiness);
  const resumeVersions = useCareerIntelStore((s) => s.resumeVersions);
  const interviews = useCareerIntelStore((s) => s.interviews);
  const milestones = useCareerIntelStore((s) => s.milestones);

  const hydrateWorkspace = useWorkspaceStore((s) => s.hydrate);
  const workspaceHydrated = useWorkspaceStore((s) => s.hydrated);
  const productivityScore = useWorkspaceStore((s) => s.productivityScore);
  const focusMinutesToday = useWorkspaceStore((s) => s.focusMinutesToday);
  const workspaceGoals = useWorkspaceStore((s) => s.goals);
  const workspaceTasks = useWorkspaceStore((s) => s.tasks);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<
    "all" | "suggestion" | "learning" | "assignment" | "career"
  >("all");

  useEffect(() => {
    if (!personalizationHydrated) hydratePersonalization();
    if (!knowledgeHydrated) hydrateKnowledge();
    if (!learnHydrated) hydrateLearn();
    if (!careerHydrated) hydrateCareer();
    if (!workspaceHydrated) hydrateWorkspace();
  }, [
    careerHydrated,
    hydrateCareer,
    hydrateKnowledge,
    hydrateLearn,
    hydratePersonalization,
    hydrateWorkspace,
    knowledgeHydrated,
    learnHydrated,
    personalizationHydrated,
    workspaceHydrated,
  ]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [goalsRes, tasksRes, nudgeRes, dailyRes] = await Promise.all([
          studentService.goals.list(token!),
          studentService.tasks.list(token!),
          studentService.ai.nudge(token!).catch(() => null),
          studentService.daily
            .get(token!, {
              category: "Learning",
              query: "Give me a focused daily tip for an ambitious learner.",
            })
            .catch(() => null),
        ]);
        if (!active) return;
        setGoals(goalsRes.goals ?? []);
        setTasks(tasksRes.tasks ?? []);
        const dailyTip =
          dailyRes?.tip || dailyRes?.action || dailyRes?.advice || null;
        setNudge(nudgeRes?.nudge || dailyTip);
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

  const goalProgress = useMemo(() => {
    if (!goals.length) return 0;
    const sum = goals.reduce((acc, g) => acc + (g.progress ?? 0), 0);
    return Math.round(sum / goals.length);
  }, [goals]);

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks],
  );
  const openTasks = useMemo(
    () => tasks.filter((t) => !t.completed),
    [tasks],
  );
  const weeklyValues = useMemo(
    () => [42, 48, 55, 51, 63, 70, Math.max(goalProgress, 20)],
    [goalProgress],
  );
  const monthlyValues = useMemo(
    () => [28, 34, 40, 45, 52, 58, 61, 66, 70, 74, 78, goalProgress || 82],
    [goalProgress],
  );
  const heatmapValues = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const base = weeklyValues[index % weeklyValues.length] ?? 40;
        return Math.min(100, Math.round(base * (0.55 + (index % 5) * 0.08)));
      }),
    [weeklyValues],
  );

  const continueReading = useMemo(() => {
    return bookProgress
      .filter((p) => !p.completed && p.percent > 0)
      .slice(0, 3)
      .map((p) => {
        const book = getBookById(p.bookId);
        if (!book) return null;
        return { book, percent: p.percent };
      })
      .filter(Boolean) as Array<{
      book: NonNullable<ReturnType<typeof getBookById>>;
      percent: number;
    }>;
  }, [bookProgress]);

  const continueWatching = useMemo(() => {
    return watchProgress
      .filter((p) => !p.completed && p.percent > 0)
      .slice(0, 3)
      .map((p) => {
        const animation = getLearnAnimation(p.animationId);
        if (!animation) return null;
        return { animation, percent: p.percent };
      })
      .filter(Boolean) as Array<{
      animation: NonNullable<ReturnType<typeof getLearnAnimation>>;
      percent: number;
    }>;
  }, [watchProgress]);

  const readingProgressAvg = useMemo(() => {
    if (!bookProgress.length) return 0;
    return Math.round(
      bookProgress.reduce((sum, item) => sum + item.percent, 0) /
        bookProgress.length,
    );
  }, [bookProgress]);

  const animationProgressAvg = useMemo(() => {
    if (!watchProgress.length) return 0;
    return Math.round(
      watchProgress.reduce((sum, item) => sum + item.percent, 0) /
        watchProgress.length,
    );
  }, [watchProgress]);

  const learningProgress = Math.round(
    (goalProgress + animationProgressAvg + readingProgressAvg) / 3,
  );

  const resumeScore = resumeVersions[0]?.score ?? 0;
  const interviewScore =
    interviews.length === 0
      ? interviewReadiness
      : Math.round(
          interviews.reduce((sum, item) => sum + item.score, 0) /
            interviews.length,
        );

  const skillGaps = useMemo(() => {
    return milestones.slice(0, 4).map((item) => ({
      label: item.title,
      value: item.progress,
    }));
  }, [milestones]);


  const dailySummary = useMemo(() => {
    const parts = [
      `You have ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}`,
      `${focusMinutesToday}m of focus logged`,
      `career readiness at ${readinessScore}`,
    ];
    if (nudge) parts.push(`AI tip: ${nudge}`);
    return parts.join(" · ");
  }, [focusMinutesToday, nudge, openTasks.length, readinessScore]);

  const weeklySummary = useMemo(() => {
    return `This week your learning intensity trends toward ${weeklyValues[weeklyValues.length - 1]}%, with ${streakDays}-day streak and ${completedTasks} completed synced tasks.`;
  }, [completedTasks, streakDays, weeklyValues]);

  const activity = useMemo(() => {
    const items = [
      ...bookHistory.slice(0, 2).map((id, index) => {
        const book = getBookById(id);
        return {
          id: `book-${id}`,
          title: book ? `Read · ${book.title}` : "Book activity",
          detail: "Continue from your knowledge library",
          time: `${index + 1}h ago`,
        };
      }),
      ...watchHistory.slice(0, 2).map((id, index) => {
        const animation = getLearnAnimation(id);
        return {
          id: `watch-${id}`,
          title: animation ? `Watched · ${animation.title}` : "Animation activity",
          detail: "Educational animation progress",
          time: `${index + 2}h ago`,
        };
      }),
      ...openTasks.slice(0, 2).map((task, index) => ({
        id: `task-${task._id}`,
        title: `Task · ${task.title}`,
        detail: task.priority ? `Priority: ${task.priority}` : "Upcoming work",
        time: `${index + 3}h ago`,
      })),
    ];
    return items.slice(0, 6);
  }, [bookHistory, openTasks, watchHistory]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === "all") return smartNotifications;
    return smartNotifications.filter((item) => item.kind === notifFilter);
  }, [notifFilter, smartNotifications]);

  const visibility = useMemo(() => {
    const map = new Map(widgets.map((widget) => [widget.id, widget.visible]));
    return map;
  }, [widgets]);

  const accentCss =
    ACCENT_OPTIONS.find((item) => item.id === accent)?.css ??
    ACCENT_OPTIONS[0]!.css;

  const exportSummary = useCallback(() => {
    const payload = {
      goals: goals.length,
      tasks: tasks.length,
      completedTasks,
      goalProgress,
      learningProgress,
      readinessScore,
      productivityScore,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dreamwave-dashboard-summary.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [
    completedTasks,
    goalProgress,
    goals.length,
    learningProgress,
    productivityScore,
    readinessScore,
    tasks.length,
  ]);

  const renderWidget = (id: DashboardWidgetId) => {
    if (!visibility.get(id)) return null;
    const favorite = favoriteSections.includes(id);

    switch (id) {
      case "welcome":
        return (
          <Card key={id} className={cn(favorite && "border-primary/40")}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>
                  Welcome{name ? `, ${name}` : ""} — your AI dashboard
                </CardTitle>
                <CardDescription>
                  {goal
                    ? `Personalized for your focus: ${goal}`
                    : "Adaptive personalization across learning, career, reading, and productivity."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  aria-expanded={customizerOpen}
                  aria-controls="dashboard-layout-manager"
                  onClick={() => setCustomizerOpen((open) => !open)}
                >
                  Customize
                </Button>
                <ExportButton onClick={exportSummary} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PersonalizedHomePanel />
            </CardContent>
          </Card>
        );

      case "progress-stats":
        return (
          <div
            key={id}
            className={cn(
              "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6",
              denserLayout && "gap-3",
            )}
          >
            <SmartStatCard label="Learning progress" value={`${learningProgress}%`} hint="blended" />
            <SmartStatCard label="Career progress" value={readinessScore} hint="readiness" />
            <SmartStatCard label="Reading progress" value={`${readingProgressAvg}%`} hint="library" />
            <SmartStatCard label="Animation progress" value={`${animationProgressAvg}%`} hint="learn" />
            <SmartStatCard label="Goal progress" value={`${goalProgress}%`} trend="+4%" />
            <SmartStatCard label="Productivity score" value={productivityScore} hint={`${focusMinutesToday}m focus`} />
          </div>
        );

      case "ai-summaries":
        return (
          <div key={id} className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI daily summary</CardTitle>
                <CardDescription className="text-foreground/90 mt-2 text-sm text-pretty">
                  {dailySummary}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI weekly summary</CardTitle>
                <CardDescription className="text-foreground/90 mt-2 text-sm text-pretty">
                  {weeklySummary}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        );

      case "recommendations":
        return (
          <DashboardSection
            key={id}
            title="AI recommendations"
            description="Personalized from your career goal, skills, and opportunities."
          >
            <PersonalizedRecommendationsPanel />
          </DashboardSection>
        );

      case "learning-insights":
        return (
          <div key={id} className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <DashboardSection
              title="Learning heatmap"
              description="Recent study intensity across the last four weeks."
            >
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <LearningHeatmap values={heatmapValues} />
                  <p className="text-muted-foreground text-xs">
                    AI insight: Consistency beats intensity — protect one morning block daily.
                  </p>
                </CardContent>
              </Card>
            </DashboardSection>
            <div className="space-y-4">
              <DashboardSection title="Weekly analytics" description="7-day learning intensity.">
                <Card>
                  <CardContent className="pt-6">
                    <MiniBarChart
                      values={weeklyValues}
                      labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                    />
                  </CardContent>
                </Card>
              </DashboardSection>
              <DashboardSection title="Monthly analytics" description="Momentum trend.">
                <Card>
                  <CardContent className="pt-6">
                    <Sparkline values={monthlyValues} />
                    <p className="text-muted-foreground mt-3 text-xs">
                      AI study suggestion: Pair one animation with one reading session this week.
                    </p>
                  </CardContent>
                </Card>
              </DashboardSection>
            </div>
          </div>
        );

      case "career-insights":
        return (
          <DashboardSection
            key={id}
            title="Career insights"
            description="Readiness, skill gaps, placement, resume, and interview progress."
            action={
              <Link
                href="/ai/career"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Career intel
              </Link>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Career readiness</CardTitle>
                  <p className="text-3xl font-semibold">{readinessScore}</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Placement progress</CardTitle>
                  <ProgressBar value={placementReadiness} label="Placement" />
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resume progress</CardTitle>
                  <ProgressBar value={resumeScore} label="Resume score" />
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Interview progress</CardTitle>
                  <ProgressBar value={interviewScore} label="Interview" />
                </CardHeader>
              </Card>
            </div>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Skill gap visualization</CardTitle>
                <div className="mt-3 space-y-3">
                  {skillGaps.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No milestones yet.
                    </p>
                  ) : (
                    skillGaps.map((gap) => (
                      <ProgressBar
                        key={gap.label}
                        label={gap.label}
                        value={gap.value}
                      />
                    ))
                  )}
                </div>
              </CardHeader>
            </Card>
          </DashboardSection>
        );

      case "productivity-insights":
        return (
          <DashboardSection
            key={id}
            title="Productivity insights"
            description="Focus, time usage, streaks, and goal horizons."
            action={
              <Link
                href={WORKSPACE_ROUTES.focus}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Focus mode
              </Link>
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SmartStatCard label="Focus score" value={productivityScore} />
              <SmartStatCard label="Time usage" value={`${focusMinutesToday}m`} hint="today" />
              <SmartStatCard label="Learning streak" value={`${streakDays}d`} />
              <SmartStatCard
                label="Workspace tasks done"
                value={workspaceTasks.filter((t) => t.status === "done").length}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily goals</CardTitle>
                  <ul className="mt-2 space-y-2 text-sm">
                    {dailyGoalsLearn.map((item) => (
                      <li
                        key={item.id}
                        className="border-border flex justify-between rounded-lg border px-3 py-2"
                      >
                        <span>{item.title}</span>
                        <span className="text-muted-foreground">
                          {item.completed ? "Done" : "Open"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weekly goals</CardTitle>
                  <ul className="mt-2 space-y-2 text-sm">
                    {workspaceGoals
                      .filter((item) => item.horizon === "short")
                      .slice(0, 4)
                      .map((item) => (
                        <li key={item.id}>
                          <ProgressBar label={item.title} value={item.progress} />
                        </li>
                      ))}
                  </ul>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly goals</CardTitle>
                  <ul className="mt-2 space-y-2 text-sm">
                    {workspaceGoals
                      .filter((item) => item.horizon === "long")
                      .slice(0, 4)
                      .map((item) => (
                        <li key={item.id}>
                          <ProgressBar label={item.title} value={item.progress} />
                        </li>
                      ))}
                  </ul>
                </CardHeader>
              </Card>
            </div>
          </DashboardSection>
        );

      case "continue-learning":
        return (
          <DashboardSection
            key={id}
            title="Continue learning"
            description="Resume books and animations."
            action={
              <div className="flex flex-wrap gap-2">
                <Link
                  href={ROUTES.books}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Books
                </Link>
                <Link
                  href={ROUTES.learn}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Learn
                </Link>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {continueReading.map(({ book, percent }) => (
                <ContinueCard
                  key={book.id}
                  href={KNOWLEDGE_ROUTES.detail(book.id)}
                  title={book.title}
                  meta={`${book.author} · continue reading`}
                  progress={percent}
                  badge="Book"
                />
              ))}
              {continueWatching.map(({ animation, percent }) => (
                <ContinueCard
                  key={animation.id}
                  href={LEARN_ROUTES.watch(animation.id)}
                  title={animation.title}
                  meta={`${animation.subject} · continue watching`}
                  progress={percent}
                  badge="Animation"
                />
              ))}
              {!continueReading.length && !continueWatching.length ? (
                <Card className="md:col-span-2 xl:col-span-3">
                  <EmptyState
                    title="Nothing in progress"
                    description="Start a book or animation to unlock continue cards."
                    action={
                      <Link href={ROUTES.learn} className={cn(buttonVariants(), "h-10")}>
                        Browse learn
                      </Link>
                    }
                  />
                </Card>
              ) : null}
            </div>
          </DashboardSection>
        );

      case "notifications":
        return (
          <DashboardSection
            key={id}
            title="Notification center"
            description="Smart notifications, AI suggestions, learning and career alerts."
            action={
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => markAllNotificationsRead()}
                >
                  Mark all read
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => clearNotifications()}
                >
                  Clear
                </Button>
              </div>
            }
          >
            <div className="mb-3 flex flex-wrap gap-2">
              {(
                [
                  "all",
                  "suggestion",
                  "learning",
                  "assignment",
                  "career",
                ] as const
              ).map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={notifFilter === item ? "default" : "outline"}
                  aria-pressed={notifFilter === item}
                  onClick={() => setNotifFilter(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
            <Card>
              <CardContent className="space-y-2 pt-6">
                {filteredNotifications.length === 0 ? (
                  <EmptyState
                    title="No notifications"
                    description="You're all caught up."
                  />
                ) : (
                  filteredNotifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        "border-border w-full rounded-xl border px-3 py-2 text-left transition",
                        !item.read && "border-primary/40 bg-primary/5",
                      )}
                      onClick={() => markNotificationRead(item.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <span className="text-muted-foreground text-[11px] capitalize">
                          {item.kind}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs text-pretty">
                        {item.body}
                      </p>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="mt-2 inline-block text-xs underline-offset-4 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Open
                        </Link>
                      ) : null}
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </DashboardSection>
        );

      case "activity":
        return (
          <DashboardSection
            key={id}
            title="Recent activity"
            description="Cross-module timeline."
          >
            <Card>
              <CardContent className="pt-6">
                <ActivityTimeline items={activity} />
              </CardContent>
            </Card>
          </DashboardSection>
        );

      case "quick-actions":
        return (
          <DashboardSection
            key={id}
            title="Quick actions"
            description="Favorite shortcuts for your personalized workflow."
          >
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                >
                  {action.label}
                </Link>
              ))}
              <Link
                href={ROUTES.settings}
                className={cn(buttonVariants({ variant: "ghost" }), "h-10")}
              >
                Settings
              </Link>
            </div>
          </DashboardSection>
        );

      default:
        return null;
    }
  };

  if (
    loading ||
    !personalizationHydrated ||
    !knowledgeHydrated ||
    !learnHydrated ||
    !careerHydrated ||
    !workspaceHydrated
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading personalized AI dashboard" />
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-8 transition-all", denserLayout && "space-y-5")}
      style={
        {
          "--dashboard-accent": accentCss,
          "--primary": accentCss,
        } as CSSProperties
      }
    >
      <DashboardCustomizer
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
      />

      {error ? (
        <AuthAlert
          variant="error"
          title="Dashboard sync notice"
          description={error}
        />
      ) : null}

      {widgetOrder.map((id) => renderWidget(id))}

      <p className="text-muted-foreground text-xs">
        Catalog size: {KNOWLEDGE_CATALOG.length} books · {LEARN_CATALOG.length}{" "}
        animations · Layout saved locally.
      </p>
    </div>
  );
}

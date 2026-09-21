"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ContinueLearningWidgets,
  DailyLearningGoals,
  SmartSuggestions,
} from "@/components/ai/ai-home-widgets";
import { AiPageHeader } from "@/components/ai/ai-shared";
import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AI_ROUTES, AI_TOOLS } from "@/constants/ai-platform";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import { useAiPlatformStore } from "@/store/ai-platform-store";

export function AiHubPage() {
  const { token, user } = useAuth();
  const hydrate = useAiPlatformStore((s) => s.hydrate);
  const hydrated = useAiPlatformStore((s) => s.hydrated);
  const recentSearches = useAiPlatformStore((s) => s.recentSearches);
  const addRecentSearch = useAiPlatformStore((s) => s.addRecentSearch);
  const clearRecentSearches = useAiPlatformStore((s) => s.clearRecentSearches);
  const notifications = useAiPlatformStore((s) => s.notifications);
  const pushNotification = useAiPlatformStore((s) => s.pushNotification);
  const clearNotifications = useAiPlatformStore((s) => s.clearNotifications);
  const promptHistory = useAiPlatformStore((s) => s.promptHistory);
  const studyProgress = useAiPlatformStore((s) => s.studyProgress);
  const roadmapProgress = useAiPlatformStore((s) => s.roadmapProgress);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    goals: number;
    tasks: number;
    taskDone: number;
    aiChats: number;
  } | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);

  const firstName = user?.name?.split(" ")[0] || "Learner";

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function load() {
      setStatsLoading(true);
      setError(null);
      try {
        const [statsRes, nudgeRes] = await Promise.all([
          studentService.ai.dashboardStats(token!),
          studentService.ai.nudge(token!).catch(() => null),
        ]);
        if (!active) return;
        setStats(statsRes.stats);
        if (nudgeRes?.nudge) {
          setNudge(nudgeRes.nudge);
          pushNotification(nudgeRes.nudge);
        }
      } catch (err) {
        if (!active) return;
        setError(toUserSafeMessage(err));
      } finally {
        if (active) setStatsLoading(false);
      }
    }

    queueMicrotask(() => {
      void load();
    });
    return () => {
      active = false;
    };
  }, [pushNotification, token]);

  const tools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AI_TOOLS.filter((tool) => {
      const matchesFilter = filter === "all" || tool.id === filter;
      const matchesQuery =
        !q ||
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  const recentActivity = promptHistory.slice(0, 5);

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <AiPageHeader
        title={`Welcome back, ${firstName}`}
        description="Your personalized AI learning home — goals, recommendations, and continue paths in one place."
        actions={
          <>
            <Link
              href={AI_ROUTES.mentor}
              className={cn(buttonVariants(), "h-10")}
            >
              Open mentor
            </Link>
            <Link
              href={AI_ROUTES.history}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Prompt history
            </Link>
            <Link
              href={AI_ROUTES.favorites}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Favorites
            </Link>
          </>
        }
      />

      {error ? (
        <AuthAlert variant="error" title="Could not load AI stats" description={error} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading ? (
          <Card className="sm:col-span-2 xl:col-span-4">
            <CardHeader className="items-center py-10">
              <Spinner label="Loading AI home" />
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardDescription>Goals</CardDescription>
                <CardTitle className="text-2xl">{stats?.goals ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Tasks done</CardDescription>
                <CardTitle className="text-2xl">
                  {stats?.taskDone ?? 0}/{stats?.tasks ?? 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>AI chats</CardDescription>
                <CardTitle className="text-2xl">{stats?.aiChats ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Study streak signals</CardDescription>
                <CardTitle className="text-2xl">
                  {studyProgress.quizzesCompleted + studyProgress.lessonsStarted}
                </CardTitle>
              </CardHeader>
            </Card>
          </>
        )}
      </div>

      {nudge || notifications[0] ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex gap-3">
              <Bell className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <CardTitle>AI recommendation</CardTitle>
                <CardDescription className="mt-1">
                  {nudge || notifications[0]}
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => clearNotifications()}
            >
              Dismiss
            </Button>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <DailyLearningGoals />
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Smart suggestions
          </h2>
          <SmartSuggestions />
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Continue learning
        </h2>
        <ContinueLearningWidgets />
      </section>

      {roadmapProgress ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Active roadmap</CardTitle>
              <CardDescription>
                {roadmapProgress.goal} · {roadmapProgress.level}
              </CardDescription>
            </div>
            <Link
              href={AI_ROUTES.roadmap}
              className={cn(buttonVariants({ size: "sm" }), "h-9")}
            >
              Open roadmap
            </Link>
          </CardHeader>
        </Card>
      ) : null}

      {recentActivity.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recently viewed prompts</CardTitle>
            <CardDescription>
              Your latest AI interactions across tools.
            </CardDescription>
          </CardHeader>
          <div className="space-y-2 px-6 pb-6">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="border-border flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
              >
                <p className="line-clamp-1">{item.text}</p>
                <span className="text-muted-foreground shrink-0 text-xs capitalize">
                  {item.tool}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && query.trim()) {
                  addRecentSearch(query);
                }
              }}
              placeholder="Search AI tools…"
              className="h-10 pl-9"
              aria-label="Search AI tools"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            {AI_TOOLS.map((tool) => (
              <Button
                key={tool.id}
                type="button"
                size="sm"
                variant={filter === tool.id ? "default" : "outline"}
                onClick={() => setFilter(tool.id)}
              >
                {tool.title.replace("AI ", "")}
              </Button>
            ))}
          </div>
        </div>

        {recentSearches.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Recent:</span>
            {recentSearches.map((item) => (
              <Button
                key={item}
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => setQuery(item)}
              >
                {item}
              </Button>
            ))}
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => clearRecentSearches()}
            >
              Clear
            </Button>
          </div>
        ) : null}

        {tools.length === 0 ? (
          <EmptyState
            title="No matching tools"
            description="Try another search or clear filters."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className="focus-visible:ring-ring rounded-2xl outline-none focus-visible:ring-2"
              >
                <Card className="hover:bg-muted/30 h-full transition-colors hover:-translate-y-0.5">
                  <CardHeader>
                    <CardTitle>{tool.title}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

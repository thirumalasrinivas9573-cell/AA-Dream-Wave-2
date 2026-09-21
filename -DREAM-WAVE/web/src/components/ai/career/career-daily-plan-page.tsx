"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  Target,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CareerIntelNav } from "@/components/ai/career/career-nav";
import { AiPageHeader } from "@/components/ai/ai-shared";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AI_ROUTES } from "@/constants/ai-platform";
import { WORKSPACE_ROUTES } from "@/constants/workspace";
import {
  careerExecutionApi,
  type DailyPlan,
  type ExecutionDashboard,
  type PlanItem,
} from "@/lib/api/career-execution";
import { cn } from "@/lib/utils";

function priorityVariant(priority: string): "default" | "secondary" | "outline" {
  if (priority === "URGENT" || priority === "HIGH") return "default";
  return "secondary";
}

export function CareerDailyPlanPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<ExecutionDashboard | null>(null);
  const [daily, setDaily] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [dashRes, dailyRes] = await Promise.all([
        careerExecutionApi.dashboard(token),
        careerExecutionApi.daily(token),
      ]);
      setDashboard(dashRes.dashboard);
      setDaily(dailyRes.daily);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load daily plan");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const acceptPlan = async () => {
    if (!token || !dashboard?.executionPlan?.id) return;
    setBusy(true);
    try {
      await careerExecutionApi.acceptPlan(token, dashboard.executionPlan.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept plan");
    } finally {
      setBusy(false);
    }
  };

  const completeTask = async (taskId: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await careerExecutionApi.completeTask(token, taskId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete task");
    } finally {
      setBusy(false);
    }
  };

  const askCopilot = async () => {
    if (!token || !question.trim()) return;
    setBusy(true);
    try {
      const res = await careerExecutionApi.copilot(token, question.trim());
      setCopilotAnswer(res.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copilot request failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <RouteLoading label="Loading today's plan" />;

  const items = daily?.items || [];
  const highPriority = daily?.highPriority || items.filter((i) => i.priority === "URGENT" || i.priority === "HIGH");
  const optional = daily?.optional || items.filter((i) => i.priority === "LOW" || i.priority === "MEDIUM").slice(3);

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={AI_ROUTES.career}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          ← Career
        </Link>
      </div>

      <AiPageHeader
        title="Today"
        description="Your AI daily career plan — every task connects to your goal, skills, and milestones."
      />

      <CareerIntelNav />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {dashboard?.empty || daily?.empty ? (
        <Alert>
          {daily?.message || "Create your first career goal to unlock daily planning."}{" "}
          <Link href="/goals" className="underline">
            Set a goal
          </Link>
        </Alert>
      ) : null}

      {dashboard?.executionPlan?.status === "PROPOSED" ? (
        <Alert>
          You have a proposed execution plan. Accept it to activate daily tasks.
          <Button className="ml-3" size="sm" onClick={() => void acceptPlan()} disabled={busy}>
            Accept plan
          </Button>
        </Alert>
      ) : null}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" aria-hidden />
              Career goal
            </CardTitle>
            <CardDescription>
              {daily?.goal?.title || dashboard?.goal?.title || "Not set"} · Target:{" "}
              {daily?.targetRole || dashboard?.targetRole || "Not set"}
            </CardDescription>
          </CardHeader>
          {dashboard?.currentMilestone ? (
            <CardContent className="text-sm">
              <p className="font-medium">Current milestone</p>
              <p className="text-muted-foreground">{dashboard.currentMilestone.title}</p>
            </CardContent>
          ) : null}
        </Card>

        {daily?.topPriority ? (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" aria-hidden />
                Top priority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{daily.topPriority.title}</p>
              <p className="text-muted-foreground">Why: {daily.topPriority.why}</p>
              {daily.topPriority.estimatedEffort ? (
                <p className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  {daily.topPriority.estimatedEffort}
                </p>
              ) : null}
              {daily.topPriority.taskId ? (
                <Button
                  size="sm"
                  onClick={() => void completeTask(daily.topPriority!.taskId!)}
                  disabled={busy}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden />
                  Mark complete
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" aria-hidden />
              Today&apos;s plan
            </CardTitle>
            <CardDescription>High priority tasks first — optional items when you have time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {highPriority.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">High priority</p>
                {highPriority.map((item, i) => (
                  <TaskRow key={item.taskId || i} item={item} onComplete={completeTask} busy={busy} />
                ))}
              </div>
            ) : null}
            {optional.length ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">Optional</p>
                {optional.map((item, i) => (
                  <TaskRow key={item.taskId || `opt-${i}`} item={item} onComplete={completeTask} busy={busy} optional />
                ))}
              </div>
            ) : null}
            {!items.length ? (
              <p className="text-muted-foreground text-sm">No tasks from current career data.</p>
            ) : null}
          </CardContent>
        </Card>

        {(daily?.blockers?.length || dashboard?.blockers?.length) ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Blockers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(daily?.blockers || dashboard?.blockers || []).map((b, i) => (
                <div key={i} className="rounded-md border p-3">
                  <p className="font-medium">{b.blocker}</p>
                  <p className="text-muted-foreground text-xs">{b.whyItMatters}</p>
                  <p className="text-muted-foreground mt-1 text-xs">→ {b.recommendedAction}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {daily?.focusBlocks?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Focus blocks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {daily.focusBlocks.map((fb, i) => (
                <div key={i} className="flex justify-between rounded-md border p-2">
                  <span>{fb.start}–{fb.end}</span>
                  <span className="text-muted-foreground">{fb.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link href={WORKSPACE_ROUTES.focus} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Start focus session
          </Link>
          <Link href={AI_ROUTES.careerCommandCenter} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Command Center
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" aria-hidden />
              AI Career Copilot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What should I do next?"
                onKeyDown={(e) => e.key === "Enter" && void askCopilot()}
                aria-label="Execution copilot question"
              />
              <Button onClick={() => void askCopilot()} disabled={busy}>
                Ask
              </Button>
            </div>
            {copilotAnswer ? <p className="text-sm">{copilotAnswer}</p> : null}
          </CardContent>
        </Card>

        {dashboard?.progress ? (
          <p className="text-muted-foreground text-xs">{dashboard.progress.explanation}</p>
        ) : null}
        {daily?.disclaimer || dashboard?.disclaimer ? (
          <p className="text-muted-foreground text-xs">{daily?.disclaimer || dashboard?.disclaimer}</p>
        ) : null}
      </div>
    </div>
  );
}

function TaskRow({
  item,
  onComplete,
  busy,
  optional = false,
}: {
  item: PlanItem;
  onComplete: (id: string) => void;
  busy: boolean;
  optional?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm", optional && "opacity-90")}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.title}</p>
        <p className="text-muted-foreground text-xs">Why: {item.why}</p>
        {item.whyNow ? <p className="text-muted-foreground text-xs">Why now: {item.whyNow}</p> : null}
        {item.estimatedEffort ? (
          <p className="text-muted-foreground mt-1 text-xs">Effort: {item.estimatedEffort}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
        {item.taskId ? (
          <Button size="sm" variant="outline" onClick={() => onComplete(item.taskId!)} disabled={busy}>
            Done
          </Button>
        ) : null}
      </div>
    </div>
  );
}

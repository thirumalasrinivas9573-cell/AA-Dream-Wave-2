"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  adaptiveLearningApi,
  type LearningDashboard,
  type SkillGap,
} from "@/lib/api/adaptive-learning";

const STATE_COLOR: Record<string, string> = {
  NOT_STARTED: "bg-muted",
  EXPLORING: "bg-blue-500/60",
  LEARNING: "bg-blue-500/80",
  PRACTICING: "bg-amber-500/80",
  ASSESSED: "bg-emerald-500/80",
  DEMONSTRATED: "bg-emerald-600",
  MASTERED: "bg-primary",
};

export function AdaptiveLearningDashboard() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [coachQ, setCoachQ] = useState("");
  const [coachA, setCoachA] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [dashRes, gapRes] = await Promise.all([
        adaptiveLearningApi.dashboard(token),
        adaptiveLearningApi.skillGaps(token),
      ]);
      setDashboard(dashRes.dashboard);
      setGaps(gapRes.analysis.gaps);
      setGoal(dashRes.dashboard.targetRole || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load learning dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const generatePlan = async () => {
    if (!token) return;
    setBusy("plan");
    setError(null);
    try {
      await adaptiveLearningApi.generatePlan(token, {
        ...(goal ? { targetRole: goal } : {}),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan generation failed");
    } finally {
      setBusy(null);
    }
  };

  const startCoachSession = async () => {
    if (!token || !gaps[0]) return;
    setBusy("session");
    try {
      const res = await adaptiveLearningApi.startSession(token, {
        skillName: gaps[0].skill,
        topic: gaps[0].skill,
        objective: gaps[0].learnNext,
        teachingMode: "EXPLAIN",
      });
      setSessionId(res.session._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session start failed");
    } finally {
      setBusy(null);
    }
  };

  const askCoach = async () => {
    if (!token || !coachQ.trim()) return;
    const res = await adaptiveLearningApi.coachChat(token, {
      question: coachQ.trim(),
      ...(sessionId ? { sessionId } : {}),
    });
    setCoachA(res.answer);
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading || !dashboard) return <RouteLoading label="Loading adaptive learning" />;

  return (
    <div className="container-app space-y-6 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/learn" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Learn home
        </Link>
        <Link href="/ai/career/copilot" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Career Copilot
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Adaptive Learning Intelligence</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Evidence-based skill mastery — what you need, what you know, what is missing, and what to do next.
        </p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Current goal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. software engineer" className="max-w-sm" />
          <Button size="sm" disabled={!!busy} onClick={() => void generatePlan()}>
            <Sparkles className="mr-1 h-4 w-4" />
            {busy === "plan" ? "Generating…" : "Generate study plan"}
          </Button>
          <Badge variant="outline">{dashboard.currentGoal}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill progress</CardTitle>
            <CardDescription>Real mastery states from demonstrated evidence only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.skillProgress.length ? dashboard.skillProgress.map((s) => (
              <div key={s.skill} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.skill}</span>
                  <Badge variant="outline">{s.state}</Badge>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className={cn("h-full transition-all", STATE_COLOR[s.state])}
                    style={{ width: `${s.progressPct}%` }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">{s.nextStep}</p>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm">Complete assessments to build skill evidence.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-4 text-sm">
              {(dashboard.today.length ? dashboard.today : ["Generate a study plan to see today's tasks"]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
            {dashboard.next.length ? (
              <div className="mt-4">
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Next</p>
                <ul className="space-y-1 text-sm">
                  {dashboard.next.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4" />
            Skill gaps
          </CardTitle>
          <CardDescription>Each gap explains what is missing, why it matters, and what to learn next.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {gaps.length ? gaps.map((g) => (
            <div key={g.skill} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium">{g.skill}</span>
                <Badge variant={g.priority === "HIGH" ? "default" : "secondary"}>{g.priority}</Badge>
                <Badge variant="outline">{g.status}</Badge>
              </div>
              <p><span className="font-medium">Missing:</span> {g.what}</p>
              <p className="text-muted-foreground"><span className="font-medium">Why:</span> {g.why}</p>
              <p className="text-muted-foreground text-xs">Required for: {g.whereRequired}</p>
              <p className="mt-1 text-xs">Next: {g.learnNext}</p>
            </div>
          )) : (
            <p className="text-muted-foreground text-sm">No gaps detected — set a target role for analysis.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4" />
              AI Study Coach
            </CardTitle>
            <CardDescription>{dashboard.studyCoachPrompt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button size="sm" variant="outline" disabled={!!busy || !gaps.length} onClick={() => void startCoachSession()}>
              Start study session
            </Button>
            <div className="flex flex-wrap gap-2">
              <Input
                value={coachQ}
                onChange={(e) => setCoachQ(e.target.value)}
                placeholder="What should I learn next?"
                className="max-w-md"
                onKeyDown={(e) => e.key === "Enter" && void askCoach()}
              />
              <Button size="sm" variant="outline" onClick={() => void askCoach()}>
                <MessageSquare className="mr-1 h-4 w-4" />
                Ask
              </Button>
            </div>
            {coachA ? (
              <div className="rounded-lg border p-3 text-sm">
                <Badge variant="secondary" className="mb-2">AI STUDY COACH</Badge>
                <pre className="whitespace-pre-wrap text-xs">{coachA}</pre>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              Revision & weak areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard.weakAreas.length ? dashboard.weakAreas.map((w, i) => (
              <p key={i} className="text-muted-foreground">{w.topic}: {w.attemptCount ?? 0} difficulty signal(s)</p>
            )) : <p className="text-muted-foreground">No weak areas recorded yet.</p>}
            {dashboard.revisionQueue.length ? (
              <div className="mt-3">
                <p className="font-medium text-xs uppercase">Revision queue</p>
                {dashboard.revisionQueue.map((r, i) => (
                  <p key={i} className="text-muted-foreground text-xs">{r.skill}: {r.reason}</p>
                ))}
              </div>
            ) : null}
            {dashboard.plan ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Active plan v{dashboard.plan.version} · {dashboard.plan.itemCount} items · {dashboard.plan.status}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

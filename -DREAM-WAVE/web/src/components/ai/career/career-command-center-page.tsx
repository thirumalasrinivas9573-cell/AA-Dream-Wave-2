"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Compass,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
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
import {
  careerCommandCenterApi,
  type CommandCenter,
  type CopilotResponse,
} from "@/lib/api/career-command-center";
import { cn } from "@/lib/utils";

function priorityVariant(priority: string): "default" | "secondary" | "outline" {
  if (priority === "URGENT" || priority === "HIGH") return "default";
  return "secondary";
}

export function CareerCommandCenterPage() {
  const { token } = useAuth();
  const [center, setCenter] = useState<CommandCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [copilot, setCopilot] = useState<CopilotResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await careerCommandCenterApi.dashboard(token);
      setCenter(res.commandCenter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load command center");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const askCopilot = async () => {
    if (!token || !question.trim()) return;
    setBusy(true);
    try {
      const res = await careerCommandCenterApi.copilot(token, question.trim());
      setCopilot(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copilot request failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <RouteLoading label="Loading command center" />;

  const empty = center?.emptyStates;

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
        title="Dream Wave Command Center"
        description="Your unified career operating system — current state, priorities, and next actions from real data."
      />

      <CareerIntelNav />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {empty?.noGoal ? (
        <Alert>
          Create your first career goal to unlock personalized recommendations.{" "}
          <Link href="/goals" className="underline">
            Set a goal
          </Link>
        </Alert>
      ) : null}

      {center ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" aria-hidden />
                {center.header.greeting}
              </CardTitle>
              <CardDescription>
                Goal: {center.header.careerGoal} · Target: {center.header.targetRole} · State:{" "}
                {center.header.careerState}
              </CardDescription>
            </CardHeader>
            {center.header.nextBestAction ? (
              <CardContent>
                <p className="text-sm font-medium">Next best action</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {center.header.nextBestAction.action}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Why: {center.header.nextBestAction.why}
                </p>
                {center.header.nextBestAction.href ? (
                  <Link
                    href={center.header.nextBestAction.href}
                    className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex gap-1")}
                  >
                    Open <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : null}
              </CardContent>
            ) : null}
          </Card>

          {center.execution?.todaysPlan || center.execution?.currentMilestone ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" aria-hidden />
                    Today&apos;s plan
                  </CardTitle>
                  {center.execution.currentMilestone ? (
                    <CardDescription>
                      Milestone: {center.execution.currentMilestone.title}
                    </CardDescription>
                  ) : null}
                </div>
                <Link href={AI_ROUTES.careerToday} className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Open Today
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {center.execution.todaysPlan?.topPriority ? (
                  <p>
                    <span className="font-medium">{center.execution.todaysPlan.topPriority.title}</span>
                    <span className="text-muted-foreground block text-xs">
                      {center.execution.todaysPlan.topPriority.why}
                    </span>
                  </p>
                ) : null}
                {(center.execution.blockers || []).slice(0, 2).map((b, i) => (
                  <p key={i} className="text-muted-foreground text-xs">
                    Blocker: {b.blocker} → {b.recommendedAction}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  What changed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {center.whatChanged.hasChanges ? (
                  center.whatChanged.changes.map((c, i) => (
                    <div key={i} className="border-b pb-2 last:border-0">
                      <p>{c.fact}</p>
                      <p className="text-muted-foreground text-xs">{c.impact}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No meaningful changes since last visit.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" aria-hidden />
                  What matters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {center.whatMatters.priorities.length ? (
                  center.whatMatters.priorities.map((p, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 text-sm">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-muted-foreground text-right">{p.detail}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Set a goal to see priorities.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" aria-hidden />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {center.today.tasks.length ? (
                center.today.tasks.map((t, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{t.label}</p>
                      <p className="text-muted-foreground text-xs">{t.why}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.priority ? (
                        <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>
                      ) : null}
                      {t.href ? (
                        <Link href={t.href} className={buttonVariants({ size: "sm", variant: "outline" })}>
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No tasks from current career data.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-4 w-4" aria-hidden />
                Career journey
              </CardTitle>
              <CardDescription>Goal → Skill → Learn → Build → Portfolio → Opportunity → Apply → Interview → Outcome</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {center.careerFunnel.map((stage) => (
                  <div
                    key={stage.stage}
                    className={cn(
                      "rounded-md border px-3 py-2 text-xs",
                      stage.status === "complete" && "border-green-500/50 bg-green-500/5",
                      stage.status === "in_progress" && "border-primary/50 bg-primary/5",
                    )}
                  >
                    <p className="font-medium">{stage.stage}</p>
                    <p className="text-muted-foreground capitalize">{stage.status.replace("_", " ")}</p>
                    {stage.nextAction ? (
                      <p className="text-muted-foreground mt-1">{stage.nextAction}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Career snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Skills</p>
                  <p className="text-muted-foreground">
                    {(center.careerSnapshot.skills || []).map((s) => s.skill).join(", ") || "None recorded"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Skill gaps</p>
                  <p className="text-muted-foreground">
                    {(center.careerSnapshot.skillGaps || []).map((g) => g.skill).join(", ") || "Set target role"}
                  </p>
                </div>
                {empty?.noProjects ? (
                  <p className="text-muted-foreground">Build your first project.</p>
                ) : null}
                {empty?.noApplications ? (
                  <p className="text-muted-foreground">
                    <Link href="/opportunities" className="underline">
                      Explore opportunities
                    </Link>
                  </p>
                ) : null}
                {empty?.noInterviews ? (
                  <p className="text-muted-foreground">
                    <Link href={AI_ROUTES.careerInterview} className="underline">
                      Start an AI mock interview
                    </Link>
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" aria-hidden />
                  Next actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {center.nextAction.actions.map((a, i) => (
                  <div key={i} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{a.action}</span>
                      <Badge variant={priorityVariant(a.priority)}>{a.priority}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">{a.why}</p>
                    {a.href ? (
                      <Link href={a.href} className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "mt-2 px-0")}>
                        Open →
                      </Link>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" aria-hidden />
                AI Career Copilot
              </CardTitle>
              <CardDescription>Ask about your career — bounded to your current state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What should I do today?"
                  onKeyDown={(e) => e.key === "Enter" && void askCopilot()}
                  aria-label="Career copilot question"
                />
                <Button onClick={() => void askCopilot()} disabled={busy}>
                  Ask
                </Button>
              </div>
              {copilot ? (
                <div className="space-y-3 text-sm">
                  <p>{copilot.answer}</p>
                  {copilot.facts?.length ? (
                    <div>
                      <p className="font-medium">Facts</p>
                      <ul className="text-muted-foreground list-disc pl-5">
                        {copilot.facts.map((f, i) => (
                          <li key={i}>{f.text}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {copilot.recommendations?.length ? (
                    <div>
                      <p className="font-medium">Recommendations</p>
                      <ul className="text-muted-foreground list-disc pl-5">
                        {copilot.recommendations.map((r, i) => (
                          <li key={i}>{r.text} — {r.why}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-xs">{center.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}

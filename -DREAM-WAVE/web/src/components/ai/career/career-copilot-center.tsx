"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CareerIntelNav } from "@/components/ai/career/career-nav";
import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { careerCopilotApi, type CareerHub } from "@/lib/api/career-copilot";

const QUICK_ACTIONS = [
  { label: "Analyze My Career", intent: "IMPROVE_PROFILE" },
  { label: "Find Skill Gaps", intent: "PRIORITIZE_SKILLS" },
  { label: "What to Learn Next", intent: "WHAT_TO_LEARN_NEXT" },
  { label: "Plan This Week", intent: "WHAT_TO_DO_THIS_WEEK" },
  { label: "Daily Focus", intent: "DAILY_FOCUS" },
  { label: "Explore Careers", intent: "EXPLORE_CAREERS" },
] as const;

function statusIcon(status: string) {
  if (status === "COMPLETED") return "✓";
  if (status === "IN_PROGRESS") return "→";
  if (status === "BLOCKED") return "!";
  return "○";
}

export function CareerCopilotCenter() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hub, setHub] = useState<CareerHub | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [pathCompare, setPathCompare] = useState("software engineer, data scientist");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await careerCopilotApi.getHub(token);
      setHub(res.hub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load career copilot");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function askCopilot(intent: string) {
    if (!token) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await careerCopilotApi.getAiInsight(token, intent);
      setAiResponse(res.observation || res.nextStep || "No insight available");
    } catch (err) {
      setAiResponse(err instanceof Error ? err.message : "AI unavailable");
    } finally {
      setAiLoading(false);
    }
  }

  async function comparePaths() {
    if (!token) return;
    const paths = pathCompare.split(",").map((p) => p.trim()).filter(Boolean);
    if (paths.length < 2) return;
    setAiLoading(true);
    try {
      const res = await careerCopilotApi.comparePaths(token, paths);
      const lines = (res.comparison.comparisons as Array<{ path: string; alignment: number; gapCount: number }>)
        .map((c) => `${c.path}: ${c.alignment}% alignment, ${c.gapCount} gap(s)`)
        .join("\n");
      setAiResponse(lines || res.comparison.disclaimer);
    } catch (err) {
      setAiResponse(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setAiLoading(false);
    }
  }

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !hub) return <RouteLoading label="Loading career copilot" />;

  return (
    <div className="space-y-8">
      <CareerIntelNav />

      <div>
        <p className="text-muted-foreground text-sm">Dream Wave · AI Career Copilot</p>
        <h1 className="text-2xl font-semibold">My Career Intelligence Center</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Where you are, where you want to go, what is missing, and what to do next — based on authorized profile data.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {hub ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SmartStatCard
              label="Career goal"
              value={hub.careerProfile.targetRole !== "INSUFFICIENT_DATA" ? hub.careerProfile.targetRole : "Not set"}
              hint={hub.currentState.state.replace(/_/g, " ")}
            />
            <SmartStatCard label="Current phase" value={hub.currentState.phase.replace(/_/g, " ")} hint="Roadmap" />
            <SmartStatCard label="Strong matches" value={String(hub.opportunities.strongMatches)} hint="Opportunities" />
            <SmartStatCard label="Skill evidence" value={String(hub.progress.skillEvidence)} hint="Profile" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Career gap analysis</CardTitle>
                <CardDescription>Target vs current profile — strengths, gaps, unknown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Strengths</p>
                  {hub.gapAnalysis.strengths.length ? (
                    <p className="text-muted-foreground">{hub.gapAnalysis.strengths.map((s) => s.skill).join(", ")}</p>
                  ) : (
                    <p className="text-muted-foreground">INSUFFICIENT_DATA</p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Gaps</p>
                  {hub.gapAnalysis.gaps.length ? (
                    <p className="text-muted-foreground">{hub.gapAnalysis.gaps.map((g) => g.skill).join(", ")}</p>
                  ) : (
                    <p className="text-muted-foreground">No critical gaps detected</p>
                  )}
                </div>
                {hub.gapAnalysis.unknown.length ? (
                  <div>
                    <p className="font-medium">Unknown</p>
                    <p className="text-muted-foreground">{hub.gapAnalysis.unknown.join("; ")}</p>
                  </div>
                ) : null}
                {hub.gapAnalysis.nextSteps[0] ? (
                  <p className="text-sm">
                    <span className="font-medium">Next:</span> {hub.gapAnalysis.nextSteps[0].nextStep}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Today&apos;s career focus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{hub.dailyFocus.topPriority.what}</p>
                <p className="text-muted-foreground">{hub.dailyFocus.topPriority.why}</p>
                <p>{hub.dailyFocus.topPriority.nextStep}</p>
                {hub.dailyFocus.second ? (
                  <p className="text-muted-foreground mt-2">Second: {hub.dailyFocus.second.what}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personalized roadmap</CardTitle>
              <CardDescription>
                Phase: {hub.roadmap.currentPhase.replace(/_/g, " ")}
                {hub.roadmap.stale ? " · Review recommended" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2" aria-label="Career roadmap steps">
                {hub.roadmap.steps.map((step) => (
                  <li key={step.order} className="flex items-start gap-3 text-sm">
                    <span aria-hidden>{statusIcon(step.status)}</span>
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {step.phase.replace(/_/g, " ")} · {step.status.replace(/_/g, " ")} · {step.priority} priority
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/roadmap" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Full roadmap workspace
                </Link>
                <Link href="/goals" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Career goals
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">This week</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="mb-1 font-medium uppercase tracking-wide text-xs">High priority</p>
                  {(hub.weeklyPlan.priorities.high as Array<{ what: string; why: string }>).map((item, i) => (
                    <p key={i}>
                      {i + 1}. {item.what}
                      <span className="text-muted-foreground block text-xs">{item.why}</span>
                    </p>
                  ))}
                </div>
                {(hub.weeklyPlan.priorities.medium as Array<{ what: string }>).length ? (
                  <div>
                    <p className="mb-1 font-medium uppercase tracking-wide text-xs">Medium</p>
                    {(hub.weeklyPlan.priorities.medium as Array<{ what: string }>).map((item, i) => (
                      <p key={i}>{i + 1}. {item.what}</p>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Student success signals</CardTitle>
                <CardDescription>Neutral support — not a diagnosis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {hub.studentSuccess.signals.length ? (
                  hub.studentSuccess.signals.map((s, i) => (
                    <Alert key={i} variant={s.severity === "HIGH" ? "warning" : "default"}>
                      {s.message}
                    </Alert>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No support signals at this time.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Career Copilot</CardTitle>
              <CardDescription>Ask anything about your career path</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.intent}
                    size="sm"
                    variant="outline"
                    disabled={aiLoading}
                    onClick={() => void askCopilot(action.intent)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder='Compare paths (e.g. "software engineer, data scientist")'
                  value={pathCompare}
                  onChange={(e) => setPathCompare(e.target.value)}
                  aria-label="Career paths to compare"
                />
                <Button variant="outline" disabled={aiLoading} onClick={() => void comparePaths()}>
                  Compare
                </Button>
              </div>

              {aiLoading ? <p className="text-muted-foreground text-sm">Thinking…</p> : null}
              {aiResponse ? (
                <div className="rounded-lg border p-4 text-sm whitespace-pre-wrap">{aiResponse}</div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Link href={ROUTES.marketplace} className={buttonVariants({ size: "sm" })}>
                  Find opportunities
                </Link>
                <Link href={ROUTES.opportunities} className={buttonVariants({ size: "sm", variant: "outline" })}>
                  My opportunities
                </Link>
                <Link href="/ai/career/intelligence" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Placement intelligence
                </Link>
              </div>
            </CardContent>
          </Card>

          {hub.recommendations.length ? (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Recommendations</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {hub.recommendations.map((rec, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">{rec.what}</CardTitle>
                        <Badge variant="outline">{rec.type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="text-muted-foreground">{rec.why}</p>
                      <p className="mt-2">{rec.nextStep}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {hub.disclaimer ? <p className="text-muted-foreground text-xs">{hub.disclaimer}</p> : null}
        </>
      ) : (
        <EmptyState title="Career data unavailable" description="Complete your profile and link your institution to unlock the career copilot." />
      )}

      <Button variant="outline" size="sm" onClick={() => void load()}>
        Refresh
      </Button>
    </div>
  );
}

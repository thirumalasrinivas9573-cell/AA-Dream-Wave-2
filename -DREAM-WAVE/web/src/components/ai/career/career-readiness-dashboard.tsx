"use client";

import Link from "next/link";
import { ArrowLeft, Briefcase, MessageSquare, Target, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CareerIntelNav } from "@/components/ai/career/career-nav";
import { AiPageHeader } from "@/components/ai/ai-shared";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AI_ROUTES } from "@/constants/ai-platform";
import {
  careerReadinessApi,
  type ReadinessDashboard,
} from "@/lib/api/career-readiness";
import { cn } from "@/lib/utils";

const DIMENSION_LABELS: Record<string, string> = {
  SKILL_READINESS: "Skills",
  PROJECT_READINESS: "Projects",
  PORTFOLIO_READINESS: "Portfolio",
  LEARNING_READINESS: "Learning",
  INTERVIEW_READINESS: "Interview",
  COMMUNICATION_PRACTICE: "Communication",
  APPLICATION_READINESS: "Application",
};

export function CareerReadinessDashboard() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<ReadinessDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachQ, setCoachQ] = useState("");
  const [coachA, setCoachA] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await careerReadinessApi.dashboard(token);
      setDashboard(res.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load readiness dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const askCoach = async () => {
    if (!token || !coachQ.trim()) return;
    setBusy(true);
    try {
      const res = await careerReadinessApi.coach(token, coachQ.trim());
      setCoachA(res.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coach request failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <RouteLoading label="Loading career readiness" />;

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={AI_ROUTES.career}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ArrowLeft className="size-4" />
          Career hub
        </Link>
      </div>

      <AiPageHeader
        title="Career Readiness"
        description="Preparation signals from your skills, projects, portfolio, and interview practice — not employment prediction."
      />
      <CareerIntelNav />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {dashboard ? (
        <>
          <Card>
            <CardHeader>
              <CardDescription>Target role</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl capitalize">
                <Target className="size-5" />
                {dashboard.targetRole}
              </CardTitle>
            </CardHeader>
          </Card>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Readiness</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(dashboard.readiness).map(([key, dim]) => {
                const label = DIMENSION_LABELS[key] || key;
                const insufficient = "state" in dim && dim.state === "INSUFFICIENT_DATA";
                const score = "score" in dim ? dim.score : null;
                return (
                  <Card key={key}>
                    <CardHeader className="pb-2">
                      <CardDescription>{label}</CardDescription>
                      <CardTitle className="text-xl">
                        {insufficient || score == null ? "Insufficient data" : `${score}%`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-xs">{dim.explanation}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4" />
                  Top gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard.topGaps.length ? (
                  dashboard.topGaps.map((g) => (
                    <Badge key={g} variant="outline" className="mr-1">
                      {g}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No gaps identified yet.</p>
                )}
                {dashboard.gapDetails.slice(0, 3).map((g) => (
                  <div key={g.skill} className="border-border rounded-lg border p-3 text-sm">
                    <p className="font-medium">{g.skill}</p>
                    <p className="text-muted-foreground mt-1">{g.what}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{g.howToImprove}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="size-4" />
                  Next actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard.nextActions.map((a) => (
                  <div key={a.order} className="text-sm">
                    <span className="font-medium">{a.order}. {a.action}</span>
                    <span className="text-muted-foreground"> — {a.reason}</span>
                  </div>
                ))}
                <Link
                  href={AI_ROUTES.careerInterview}
                  className={cn(buttonVariants({ size: "sm" }), "mt-2 inline-flex")}
                >
                  Start mock interview
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4" />
                AI Career Coach
              </CardTitle>
              <CardDescription>{dashboard.coachPrompt}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={coachQ}
                  onChange={(e) => setCoachQ(e.target.value)}
                  placeholder="What should I improve next?"
                  aria-label="Coach question"
                />
                <Button type="button" disabled={busy || !coachQ.trim()} onClick={() => void askCoach()}>
                  Ask
                </Button>
              </div>
              {coachA ? (
                <div className="border-border bg-muted/30 rounded-xl border px-4 py-3 text-sm whitespace-pre-wrap">
                  {coachA}
                </div>
              ) : null}
              <p className="text-muted-foreground text-xs">{dashboard.disclaimer}</p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

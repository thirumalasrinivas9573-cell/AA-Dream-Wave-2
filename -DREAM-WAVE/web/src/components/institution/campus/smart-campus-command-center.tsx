"use client";

import {
  AlertTriangle,
  CalendarDays,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { campusCommandCenterApi } from "@/lib/api/campus-command-center";
import { cn } from "@/lib/utils";
import type { CampusCommandCenter } from "@/types/campus-command-center";

const HEALTH_VARIANT: Record<string, "default" | "secondary" | "outline" | "muted"> = {
  HEALTHY: "default",
  ACTIVE: "secondary",
  NEEDS_ATTENTION: "muted",
  INSUFFICIENT_DATA: "outline",
};

const PRIORITY_CLASS: Record<string, string> = {
  CRITICAL: "border-destructive/50 bg-destructive/5",
  HIGH: "border-orange-500/40 bg-orange-500/5",
  MEDIUM: "border-yellow-500/40 bg-yellow-500/5",
  LOW: "border-muted",
};

export function SmartCampusCommandCenter() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CampusCommandCenter | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [overview, ai] = await Promise.all([
        campusCommandCenterApi.getOverview(token),
        campusCommandCenterApi.getAiInsight(token, "DAILY_BRIEF"),
      ]);
      setData(overview.commandCenter);
      setAiInsight(ai.insight?.observation || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campus command center");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !data) return <RouteLoading label="Loading campus command center" />;

  const placement = data?.placementCommandCenter?.overview;
  const brief = data?.dailyBrief;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Institution platform"
        title={data?.institution?.name ? `${data.institution.name}` : "Smart Campus Command Center"}
        description="Campus ecosystem intelligence, placement command center, skill gaps, and actionable insights — aggregate authorized data only."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={INSTITUTION_ROUTES.placements}>
              Placements
            </Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={INSTITUTION_ROUTES.placementIntelligence}>
              Intelligence
            </Link>
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {data ? (
        <>
          <section className="flex flex-wrap items-center gap-3">
            <Badge variant={HEALTH_VARIANT[data.health.state] || "outline"}>
              {data.health.state.replace(/_/g, " ")}
            </Badge>
            <span className="text-muted-foreground text-sm">{data.health.explanation}</span>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SmartStatCard label="Students" value={String(data.campusOverview.students)} hint="Total" />
            <SmartStatCard label="Programs" value={String(data.campusOverview.programs)} hint="Registered" />
            <SmartStatCard label="Open opportunities" value={String(data.campusOverview.openOpportunities)} hint="Active" />
            <SmartStatCard label="Active companies" value={String(data.campusOverview.activeCompanies)} hint="Partnerships" />
          </section>

          {brief ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="size-4" />
                  Today&apos;s Placement Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div><p className="text-muted-foreground text-xs">Today&apos;s drives</p><p className="text-2xl font-semibold">{brief.todaysDrives}</p></div>
                <div><p className="text-muted-foreground text-xs">Applications closing</p><p className="text-2xl font-semibold">{brief.applicationsClosing}</p></div>
                <div><p className="text-muted-foreground text-xs">Interviews today</p><p className="text-2xl font-semibold">{brief.interviewsToday}</p></div>
                <div><p className="text-muted-foreground text-xs">Pending actions</p><p className="text-2xl font-semibold">{brief.pendingActions}</p></div>
                <div><p className="text-muted-foreground text-xs">Top skill gap</p><p className="text-lg font-medium">{brief.topSkillGap || "—"}</p></div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="size-4" />
                  Placement Command Center
                </CardTitle>
                <CardDescription>Pipeline from eligible students through offers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Eligible", placement?.eligible],
                    ["Applications", placement?.applications],
                    ["Shortlisted", placement?.shortlisted],
                    ["Interviews", placement?.interviews],
                    ["Selections", placement?.selections],
                    ["Offers", placement?.offers],
                    ["Accepted", placement?.offersAccepted],
                    ["Placed", placement?.placed],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="text-xl font-semibold">{value ?? 0}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4" />
                  Student Readiness
                </CardTitle>
                <CardDescription>Aggregate readiness — not placement predictions</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {Object.entries(data.readiness).map(([key, val]) => (
                  <div key={key} className="rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">{key.replace(/_/g, " ")}</p>
                    <p className="text-xl font-semibold">{val}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill intelligence</CardTitle>
                <CardDescription>{data.skillIntelligence.sourceNote}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Top gaps</p>
                  <div className="flex flex-wrap gap-2">
                    {data.skillIntelligence.gaps.length ? (
                      data.skillIntelligence.gaps.map((g) => (
                        <Badge key={g.skill} variant="secondary">{g.skill}</Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No gaps detected or insufficient data.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Industry demand</p>
                  <div className="flex flex-wrap gap-2">
                    {data.skillIntelligence.industryDemand.slice(0, 8).map((d) => (
                      <Badge key={d.skill} variant="outline">{d.skill}</Badge>
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  Curriculum alignment: {data.curriculumAlignment.level.replace(/_/g, " ")} — {data.curriculumAlignment.explanation}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4" />
                  Important alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.alerts.length ? (
                  data.alerts.slice(0, 6).map((a) => (
                    <div key={a.id} className={cn("rounded-lg border p-3", PRIORITY_CLASS[a.priority] || PRIORITY_CLASS.LOW)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge variant="outline" className="text-[10px]">{a.priority}</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">{a.detail}</p>
                      <Link href={a.actionRoute} className="text-primary mt-2 inline-block text-xs underline-offset-2 hover:underline">
                        View
                      </Link>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No alerts" description="No meaningful alerts at this time." />
                )}
              </CardContent>
            </Card>
          </div>

          {data.recommendations.training.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4" />
                  Training recommendations
                </CardTitle>
                <CardDescription>Advisory — does not auto-enroll students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recommendations.training.slice(0, 5).map((r, i) => (
                  <p key={i} className="text-sm">{r.recommendation}</p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {aiInsight ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI insight — what needs attention today?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{aiInsight}</p>
                <p className="text-muted-foreground mt-2 text-xs">Advisory only. Human administrators remain responsible for decisions.</p>
              </CardContent>
            </Card>
          ) : null}

          {data.dataLimitations.length ? (
            <Alert variant="warning">
              <p className="text-sm font-medium">Data limitations</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {data.dataLimitations.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {data.disclaimer ? (
            <p className="text-muted-foreground text-xs">{data.disclaimer}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

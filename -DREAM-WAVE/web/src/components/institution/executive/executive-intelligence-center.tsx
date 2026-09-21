"use client";

import {
  AlertTriangle,
  BarChart3,
  Building2,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionBarChart, InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import {
  executiveIntelligenceApi,
  type ExecutiveInsight,
  type ExecutiveOverview,
} from "@/lib/api/executive-intelligence";

const FUNNEL_LABELS: Record<string, string> = {
  applications: "Applications",
  screening: "Screening",
  shortlisted: "Shortlisted",
  interview: "Interviews",
  offer: "Offers",
  placement: "Placements",
};

export function ExecutiveIntelligenceCenter() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [insights, setInsights] = useState<ExecutiveInsight[]>([]);
  const [dataQuality, setDataQuality] = useState<{ hasIssues: boolean; issues: Array<{ type: string; count?: number; recommendedAction?: string }> } | null>(null);
  const [question, setQuestion] = useState("");
  const [decisionInsight, setDecisionInsight] = useState<ExecutiveInsight | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [ov, ins, dq] = await Promise.all([
        executiveIntelligenceApi.getOverview(token),
        executiveIntelligenceApi.getInsights(token),
        executiveIntelligenceApi.getDataQuality(token),
      ]);
      setOverview(ov.executive);
      setInsights(ins.insights);
      setDataQuality(dq.dataQuality);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load executive intelligence");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const askQuestion = async () => {
    if (!token || !question.trim()) return;
    setBusy(true);
    try {
      const res = await executiveIntelligenceApi.askDecisionSupport(token, question.trim());
      setDecisionInsight(res.insight);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision support failed");
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !overview) return <RouteLoading label="Loading executive intelligence" />;

  const summary = overview?.summary || {};
  const funnel = overview?.placementFunnel?.counts || {};

  const funnelChart = Object.entries(FUNNEL_LABELS).map(([key, label]) => ({
    label,
    value: funnel[key] ?? 0,
  }));

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Institution platform"
        title="Executive Intelligence Center"
        description="Evidence-based analytics → metrics → trends → insights → decision support. All figures from authorized canonical records — INSUFFICIENT_DATA when evidence is missing."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={INSTITUTION_ROUTES.commandCenter}>
              Command Center
            </Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={INSTITUTION_ROUTES.commandCenterReports}>
              Reports
            </Link>
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {overview?.dataLimitations?.length ? (
        <Alert variant="warning">
          Data limitations: {overview.dataLimitations.join("; ")}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <InstitutionMetricCard icon={Users} label="Students" value={summary.totalStudents ?? "—"} hint="Active student records" />
        <InstitutionMetricCard icon={GraduationCap} label="Programs" value={summary.activePrograms ?? "—"} hint="Active programs" />
        <InstitutionMetricCard icon={Building2} label="Partnerships" value={summary.activePartnerships ?? "—"} hint="Active partnerships" />
        <InstitutionMetricCard icon={Target} label="Opportunities" value={summary.openOpportunities ?? "—"} hint="Published opportunities" />
        <InstitutionMetricCard icon={BarChart3} label="Applications" value={summary.applicationsSubmitted ?? "—"} hint="Application records" />
        <InstitutionMetricCard icon={TrendingUp} label="Placements" value={summary.placements ?? "—"} hint="Placed students" />
      </div>

      <p className="text-muted-foreground text-xs">
        Last updated: {overview?.generatedAt ? new Date(overview.generatedAt).toLocaleString() : "—"} · Freshness: {overview?.freshness || "RECENT"} · Period: {overview?.period || "all time"}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key changes</CardTitle>
            <CardDescription>What changed recently — based on available records.</CardDescription>
          </CardHeader>
          <CardContent>
            {overview?.keyChanges?.length ? (
              <ul className="space-y-3 text-sm">
                {overview.keyChanges.map((c) => (
                  <li key={c.title} className="rounded-md border p-3">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-muted-foreground">{c.whatChanged}</p>
                    <p className="text-muted-foreground mt-1 text-xs">Basis: {c.dataBasis}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="INSUFFICIENT_DATA" description="Not enough historical records to detect key changes." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Attention required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.attentionRequired?.length ? (
              <ul className="space-y-2 text-sm">
                {overview.attentionRequired.map((a) => (
                  <li key={a.label} className="flex items-start justify-between gap-2 rounded-md border p-3">
                    <div>
                      <Badge variant="outline" className="mb-1">{a.type.replace(/_/g, " ")}</Badge>
                      <p>{a.label}</p>
                      <p className="text-muted-foreground text-xs">{a.nextStep}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No urgent items" description="No attention flags from current analytics thresholds." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Placement funnel</CardTitle>
          <CardDescription>Applications → screening → shortlist → interview → offer → placement. Counts from actual status records.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview?.placementFunnel?.hasData ? (
            <InstitutionBarChart
              title="Placement funnel"
              description="Stage counts from application status records"
              labels={funnelChart.map((r) => r.label)}
              values={funnelChart.map((r) => r.value)}
            />
          ) : (
            <EmptyState title="INSUFFICIENT_DATA" description="No application records in scope for funnel visualization." />
          )}
          <table className="mt-4 w-full text-sm sr-only focus:not-sr-only" aria-label="Placement funnel table fallback">
            <caption>Placement funnel data table</caption>
            <thead><tr><th>Stage</th><th>Count</th></tr></thead>
            <tbody>
              {funnelChart.map((row) => (
                <tr key={row.label}><td>{row.label}</td><td>{row.value}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Industry skill demand</CardTitle>
            <CardDescription>From available opportunity requirements — not global industry truth.</CardDescription>
          </CardHeader>
          <CardContent>
            {overview?.industryDemand?.length ? (
              <ul className="space-y-1 text-sm">
                {overview.industryDemand.map((d) => (
                  <li key={d.skill} className="flex justify-between">
                    <span>{d.skill}</span>
                    <Badge variant="secondary">{d.count ?? 0}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="INSUFFICIENT_DATA" description="No skill demand data from opportunities in scope." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data quality center</CardTitle>
          </CardHeader>
          <CardContent>
            {dataQuality?.hasIssues ? (
              <ul className="space-y-2 text-sm">
                {dataQuality.issues.map((issue) => (
                  <li key={issue.type} className="rounded-md border p-2">
                    <p className="font-medium">{issue.type.replace(/_/g, " ")}</p>
                    {issue.count != null ? <p>Count: {issue.count}</p> : null}
                    <p className="text-muted-foreground text-xs">{issue.recommendedAction || "Review source records."}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No issues detected" description="Data quality checks passed for current records." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI insights
          </CardTitle>
          <CardDescription>Evidence-based recommendations — causation not inferred.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.length ? insights.map((ins) => (
            <div key={ins.title} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{ins.title}</p>
              <p className="text-muted-foreground mt-1"><strong>What changed:</strong> {ins.whatChanged}</p>
              <p className="text-muted-foreground"><strong>Why it matters:</strong> {ins.whyItMatters}</p>
              <p className="text-muted-foreground"><strong>Data basis:</strong> {ins.dataBasis}</p>
              <p className="text-muted-foreground"><strong>Next step:</strong> {ins.recommendedNextStep}</p>
              {ins.limitation ? <p className="text-muted-foreground mt-1 text-xs">{ins.limitation}</p> : null}
            </div>
          )) : (
            <EmptyState title="INSUFFICIENT_DATA" description="Not enough data for AI insights." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI decision support</CardTitle>
          <CardDescription>Ask: What needs attention? Which skills appear most often? Where are placement bottlenecks?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What needs attention?"
              className="max-w-md"
              onKeyDown={(e) => e.key === "Enter" && void askQuestion()}
            />
            <Button onClick={() => void askQuestion()} disabled={busy || !question.trim()}>
              Ask
            </Button>
          </div>
          {decisionInsight ? (
            <div className="rounded-md border bg-muted/30 p-4 text-sm">
              <p className="font-medium">{decisionInsight.title}</p>
              <p className="mt-2">{decisionInsight.whatChanged}</p>
              <p className="text-muted-foreground mt-1">{decisionInsight.recommendedNextStep}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

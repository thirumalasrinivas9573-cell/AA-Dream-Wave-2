"use client";

import { Briefcase, GraduationCap, TrendingUp, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { AiInsightCard, AnalyticsSection } from "@/components/institution/analytics/analytics-ui";
import {
  InstitutionBarChart,
  InstitutionMetricCard,
} from "@/components/institution/institution-dashboard-ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BI_PERIOD_OPTIONS,
  institutionBiApi,
  type BiInsightContract,
  type InstitutionBiDashboard,
} from "@/lib/api/business-intelligence";

const BI_INTENT_OPTIONS = [
  { label: "Overview", intent: "INSTITUTION_OVERVIEW" },
  { label: "Application trend", intent: "APPLICATION_TREND" },
  { label: "Skill gaps", intent: "SKILL_GAP" },
  { label: "Placement funnel", intent: "PLACEMENT_FUNNEL" },
  { label: "Data quality", intent: "DATA_QUALITY" },
] as const;

type Props = {
  token: string;
  department?: string;
};

export function InstitutionBiPanel({ token, department }: Props) {
  const [dashboard, setDashboard] = useState<InstitutionBiDashboard | null>(null);
  const [insight, setInsight] = useState<BiInsightContract | null>(null);
  const [period, setPeriod] = useState("all");
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await institutionBiApi.getDashboard(token, {
        period: period === "all" ? undefined : period,
        department,
      });
      setDashboard(res.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load business intelligence");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [token, period, department]);

  const loadInsight = useCallback(
    async (intent: string) => {
      setInsightLoading(true);
      try {
        const res = await institutionBiApi.getAiInsights(token, intent, {
          period: period === "all" ? undefined : period,
          department,
        });
        setInsight(res.insights.insight);
      } catch {
        setInsight(null);
      } finally {
        setInsightLoading(false);
      }
    },
    [token, period, department],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadInsight("INSTITUTION_OVERVIEW");
  }, [loadInsight]);

  if (loading) return <RouteLoading label="Loading institution analytics" />;

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!dashboard) {
    return (
      <EmptyState
        title="No analytics data"
        description="Institution business intelligence will appear when student, placement, or research records exist."
      />
    );
  }

  const appTrend = dashboard.trends.applications;
  const skillGaps = dashboard.skills.gaps.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Period:</span>
        {BI_PERIOD_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={period === opt.value ? "default" : "outline"}
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <AnalyticsSection
        title="Institution overview"
        description={`Real data · scope: institution · period: ${dashboard.period}`}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InstitutionMetricCard label="Students" value={dashboard.overview.students} hint="Total enrolled" icon={Users} />
          <InstitutionMetricCard label="Programs" value={dashboard.overview.programs} hint="Configured programs" icon={GraduationCap} />
          <InstitutionMetricCard label="Faculty" value={dashboard.overview.faculty} hint="Institution members" icon={Users} />
          <InstitutionMetricCard label="Admissions" value={dashboard.overview.admissionsEnrolled} hint="Enrolled records" icon={TrendingUp} />
        </div>
      </AnalyticsSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsSection title="Academic" description="Enrollment and program activity from institution records.">
          <InstitutionMetricCard label="Enrollment" value={dashboard.academic.enrollment} hint="Student records" icon={Users} />
          {dashboard.academic.programActivity.length > 0 ? (
            <InstitutionBarChart
              title="Top departments"
              description="Students by department."
              labels={dashboard.academic.programActivity.map((d) => d.name)}
              values={dashboard.academic.programActivity.map((d) => d.studentCount)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No program activity data for selected period.</p>
          )}
        </AnalyticsSection>

        <AnalyticsSection title="Career" description="Applications, offers, and placements from recruitment records.">
          <div className="grid gap-3 sm:grid-cols-2">
            <InstitutionMetricCard label="Applications" value={dashboard.career.applications} hint="Submitted" icon={Briefcase} />
            <InstitutionMetricCard label="Interviews" value={dashboard.career.interviews} hint="Scheduled" icon={Users} />
            <InstitutionMetricCard label="Offers" value={dashboard.career.offers} hint="Released" icon={TrendingUp} />
            <InstitutionMetricCard label="Placements" value={dashboard.career.placements} hint="Confirmed" icon={GraduationCap} />
          </div>
          {dashboard.career.placementRate !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Placement rate: {dashboard.career.placementRate}% — {dashboard.career.placementRateDefinition}
            </p>
          )}
        </AnalyticsSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Applications over time</CardTitle>
            <CardDescription>
              {appTrend.hasTrend
                ? "Monthly application counts from recruitment records."
                : appTrend.message || "Not enough historical data."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appTrend.hasTrend && appTrend.points.length > 0 ? (
              <InstitutionBarChart
                title="Applications"
                description="Monthly application counts."
                labels={appTrend.points.map((p) => p.period)}
                values={appTrend.points.map((p) => p.count)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{appTrend.message || "No trend data."}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill demand vs supply</CardTitle>
            <CardDescription>Aggregate institution-level skill comparison.</CardDescription>
          </CardHeader>
          <CardContent>
            {skillGaps.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {skillGaps.map((g) => (
                  <li key={g.skill}>
                    Gap: <span className="font-medium capitalize">{g.skill}</span> (demand count: {g.count})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {dashboard.skills.hasData
                  ? "No aggregate skill gaps detected."
                  : "Insufficient skill data for comparison."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {dashboard.dataQuality.hasIssues && (
        <Alert>
          Data quality: {dashboard.dataQuality.warnings.length} warning(s) detected. Review records before
          relying on derived metrics.
        </Alert>
      )}

      <AnalyticsSection title="Explainable insights" description="Evidence-based analytics assistant.">
        <div className="flex flex-wrap gap-2">
          {BI_INTENT_OPTIONS.map((q) => (
            <Button
              key={q.intent}
              type="button"
              size="sm"
              variant="outline"
              disabled={insightLoading}
              onClick={() => void loadInsight(q.intent)}
            >
              {q.label}
            </Button>
          ))}
        </div>
        {insight && (
          <AiInsightCard
            title="Analytics insight"
            description="Evidence-based observation from authorized institution data."
            points={[
              `Observation: ${insight.observation}`,
              `Interpretation: ${insight.interpretation}`,
              `Limitation: ${insight.limitation}`,
            ]}
          />
        )}
      </AnalyticsSection>
    </div>
  );
}

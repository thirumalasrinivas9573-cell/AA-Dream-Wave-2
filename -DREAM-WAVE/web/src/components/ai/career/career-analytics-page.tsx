"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AiPageHeader } from "@/components/ai/ai-shared";
import { CareerIntelNav } from "@/components/ai/career/career-nav";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import {
  MiniBarChart,
  ProgressBar,
  SmartStatCard,
} from "@/components/dashboard/dashboard-ui";
import { AiInsightCard } from "@/components/institution/analytics/analytics-ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/components/providers/auth-provider";
import {
  studentBiApi,
  type StudentCareerAnalytics,
} from "@/lib/api/business-intelligence";

export function CareerAnalyticsPage() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<StudentCareerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await studentBiApi.getCareerAnalytics(token);
      setAnalytics(res.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load career analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const stageValues = useMemo(() => {
    if (!analytics?.byStage) return [];
    return Object.values(analytics.byStage);
  }, [analytics?.byStage]);

  const stageLabels = useMemo(() => {
    if (!analytics?.byStage) return [];
    return Object.keys(analytics.byStage).map((s) => s.replace(/_/g, " "));
  }, [analytics?.byStage]);

  const skillCoverage = useMemo(() => {
    if (!analytics?.skills?.count) return 0;
    return Math.min(100, analytics.skills.count * 10);
  }, [analytics?.skills?.count]);

  if (!token || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading career analytics" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <AiPageHeader
        title="Career analytics"
        description="Your applications, interviews, offers, skills, and learning activity from live records."
      />
      <CareerIntelNav />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {!analytics?.hasData ? (
        <EmptyState
          title="No career activity yet"
          description="Apply to opportunities and build your profile to populate career analytics."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SmartStatCard
              label="Applications"
              value={String(analytics.applications)}
              hint="Submitted applications"
            />
            <SmartStatCard
              label="Interviews"
              value={String(analytics.interviews)}
              hint="Upcoming interviews"
            />
            <SmartStatCard
              label="Offers"
              value={String(analytics.offers)}
              hint="Active offers"
            />
            <SmartStatCard
              label="Open opportunities"
              value={String(analytics.openOpportunities)}
              hint={analytics.hasInstitutionLink ? "Institution-linked" : "Browse all"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Application pipeline</CardTitle>
                <CardDescription>
                  Counts by stage from your application records · period: {analytics.period}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stageValues.length > 0 ? (
                  <MiniBarChart values={stageValues} labels={stageLabels} />
                ) : (
                  <p className="text-sm text-muted-foreground">No applications recorded yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills & activity</CardTitle>
                <CardDescription>
                  Profile and roadmap skills · {analytics.projects.count} projects ·{" "}
                  {analytics.learning.count} learning records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProgressBar value={skillCoverage} label="Skills evidenced" />
                <ProgressBar
                  value={analytics.applications ? Math.min(100, analytics.applications * 20) : 0}
                  label="Application activity"
                />
                <ProgressBar
                  value={analytics.offers ? Math.min(100, analytics.offers * 50) : 0}
                  label="Offer progress"
                />
                {analytics.skills.profile.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Skills: {analytics.skills.profile.slice(0, 8).join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <AiInsightCard
            title="Your career summary"
            description="Summary from your authorized application and profile records."
            points={[
              `${analytics.applications} application(s) on record.`,
              `${analytics.interviews} upcoming interview(s).`,
              `${analytics.offers} active offer(s).`,
              "Private career reasoning is not exposed in analytics.",
            ]}
          />
        </>
      )}
    </div>
  );
}

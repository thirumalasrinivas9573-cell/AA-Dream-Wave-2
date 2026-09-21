"use client";

import Link from "next/link";
import { useEffect } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { MiniBarChart, SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { useRecruitmentStore } from "@/store/recruitment-store";

export function RecruitmentCommandCenter() {
  const { token } = useAuth();
  const fetchOverview = useRecruitmentStore((s) => s.fetchOverview);
  const hydrated = useRecruitmentStore((s) => s.hydrated);
  const loading = useRecruitmentStore((s) => s.loading);
  const error = useRecruitmentStore((s) => s.error);
  const stats = useRecruitmentStore((s) => s.stats);
  const funnel = useRecruitmentStore((s) => s.funnel);

  useEffect(() => {
    if (token) void fetchOverview(token);
  }, [token, fetchOverview]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (!hydrated && loading) return <RouteLoading label="Loading ATS" />;

  const funnelData = funnel
    ? [
        { label: "Applicants", value: funnel.applicants },
        { label: "Reviewed", value: funnel.reviewed },
        { label: "Shortlisted", value: funnel.shortlisted },
        { label: "Assessed", value: funnel.assessed },
        { label: "Interviewed", value: funnel.interviewed },
        { label: "Selected", value: funnel.selected },
        { label: "Offered", value: funnel.offered },
        { label: "Hired", value: funnel.hired },
      ]
    : [];

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Company ATS"
        title="Recruitment Workspace"
        description="Enterprise recruitment pipeline with jobs, internships, applicant directory, and shortlist management."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={COMPANY_ROUTES.applications} className={buttonVariants({ variant: "outline" })}>
              Applications
            </Link>
            <Link href={COMPANY_ROUTES.pipeline} className={buttonVariants()}>
              Pipeline
            </Link>
          </div>
        }
      />

      <RecruitmentNav />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SmartStatCard label="Total Applicants" value={String(stats.totalApplicants)} hint="All time" />
          <SmartStatCard label="New" value={String(stats.newApplicants)} hint="Applied stage" />
          <SmartStatCard label="Under Review" value={String(stats.underReview)} hint="Screening & review" />
          <SmartStatCard label="Shortlisted" value={String(stats.shortlisted)} hint="Active pipeline" />
          <SmartStatCard label="Interviews" value={String(stats.interviews)} hint="Scheduled rounds" />
          <SmartStatCard label="Selected" value={String(stats.selected)} hint="Ready for offer" />
          <SmartStatCard label="Offers Pending" value={String(stats.offersPending)} hint="Awaiting response" />
          <SmartStatCard label="Hired" value={String(stats.hired)} hint={`${stats.hiredThisMonth} this month`} />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recruitment funnel</CardTitle>
          <CardDescription>Calculated from live application records.</CardDescription>
        </CardHeader>
        <CardContent>
          {funnelData.length ? (
            <MiniBarChart
              values={funnelData.map((f) => f.value)}
              labels={funnelData.map((f) => f.label)}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No applicants yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

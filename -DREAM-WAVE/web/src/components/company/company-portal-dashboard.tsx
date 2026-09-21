"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  ClipboardList,
  Handshake,
  Target,
  UserCheck,
  Users,
} from "lucide-react";

import { PartnershipMetricGrid } from "@/components/institution/partnerships/partnership-ui";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { recruitmentApi } from "@/lib/api/recruitment";
import { usePartnershipStore } from "@/store/partnership-store";
import { useRecruitmentStore } from "@/store/recruitment-store";

export function CompanyPortalDashboard() {
  const { token, user } = useAuth();
  const stats = usePartnershipStore((s) => s.stats);
  const fetchStats = usePartnershipStore((s) => s.fetchStats);
  const partnerships = usePartnershipStore((s) => s.partnerships);
  const fetchPartnerships = usePartnershipStore((s) => s.fetchPartnerships);
  const atsStats = useRecruitmentStore((s) => s.stats);
  const jobs = useRecruitmentStore((s) => s.jobs);
  const fetchAtsStats = useRecruitmentStore((s) => s.fetchOverview);
  const [activeInternships, setActiveInternships] = useState(0);

  useEffect(() => {
    if (!token) return;
    void fetchStats(token);
    void fetchPartnerships(token, { requestStatus: "pending" });
    void fetchAtsStats(token);
    void recruitmentApi.listInternships(token).then((res) => {
      setActiveInternships(res.internships.filter((item) => item.status === "open").length);
    });
  }, [token, fetchStats, fetchPartnerships, fetchAtsStats]);

  const pendingCount = partnerships.filter((p) => p.requestStatus === "pending").length;
  const activeJobs = jobs.filter((j) => j.status === "open").length;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Company platform"
        title="Company Dashboard"
        description={`Hiring pipeline and institution partnerships for ${user?.organizationName || "your organization"}.`}
        actions={
          <Link href={COMPANY_ROUTES.institutionNetwork} className={buttonVariants()}>
            Institution Network
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InstitutionMetricCard
          label="Active Jobs"
          value={activeJobs}
          hint="Open job listings"
          icon={Briefcase}
        />
        <InstitutionMetricCard
          label="Active Internships"
          value={activeInternships}
          hint="Open internship listings"
          icon={Target}
        />
        <InstitutionMetricCard
          label="Applications"
          value={atsStats?.totalApplicants ?? 0}
          hint={`${atsStats?.newApplicants ?? 0} new`}
          icon={ClipboardList}
        />
        <InstitutionMetricCard
          label="Interviews"
          value={atsStats?.interviews ?? 0}
          hint={`${atsStats?.interviewsToday ?? 0} today`}
          icon={Users}
        />
        <InstitutionMetricCard
          label="Offers Pending"
          value={atsStats?.offersPending ?? 0}
          hint="Awaiting candidate response"
          icon={Handshake}
        />
        <InstitutionMetricCard
          label="Hired"
          value={atsStats?.hired ?? 0}
          hint={`${atsStats?.hiredThisMonth ?? 0} this month`}
          icon={UserCheck}
        />
        <InstitutionMetricCard
          label="Shortlisted"
          value={atsStats?.shortlisted ?? 0}
          hint="In active pipeline"
          icon={Building2}
        />
        <InstitutionMetricCard
          label="Partnership Requests"
          value={pendingCount}
          hint="Pending institution requests"
          icon={Handshake}
        />
      </div>

      {stats ? (
        <section aria-label="Partnership overview">
          <PartnershipMetricGrid stats={stats} variant="company" />
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recruitment</CardTitle>
            <CardDescription>
              {atsStats
                ? `${atsStats.newApplicants} new applicant(s) · ${atsStats.interviewsToday} interview(s) today · ${atsStats.offersPending} offer(s) pending`
                : "Loading recruitment metrics…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={COMPANY_ROUTES.recruitment} className={buttonVariants({ variant: "outline" })}>
              Open Applicant Tracking
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Institution partnerships</CardTitle>
            <CardDescription>
              {pendingCount
                ? `${pendingCount} pending institution request(s) need review.`
                : "No pending partnership requests."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={COMPANY_ROUTES.institutionNetwork} className={buttonVariants({ variant: "outline" })}>
              Open Institution Network
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import {
  Briefcase,
  CalendarDays,
  Download,
  FileBarChart,
  GraduationCap,
  Handshake,
  Heart,
  Printer,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import {
  InstitutionBarChart,
  InstitutionDistributionChart,
  InstitutionMetricCard,
} from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { institutionAlumniApi } from "@/lib/api/institution-alumni";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import type { AlumniAnalytics, AlumniReportPreview } from "@/types/alumni-management";

function downloadFile(filename: string, content: string, mimeType = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const REPORT_DEFS = [
  { type: "alumni_directory", title: "Alumni Directory Report", icon: Users },
  { type: "mentorship", title: "Mentorship Report", icon: Handshake },
  { type: "career_referral", title: "Career Referral Report", icon: Briefcase },
  { type: "event_participation", title: "Event Participation Report", icon: CalendarDays },
  { type: "community_growth", title: "Community Growth Report", icon: UsersRound },
  { type: "donation", title: "Donation Report", icon: Heart },
  { type: "volunteer_activity", title: "Volunteer Activity Report", icon: GraduationCap },
  { type: "alumni_engagement", title: "Alumni Engagement Report", icon: TrendingUp },
] as const;

export function AlumniAnalyticsPage() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  const [analytics, setAnalytics] = useState<AlumniAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [industry, setIndustry] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionAlumniApi.getAnalytics(token, {
        department: department || undefined,
        graduationYear: graduationYear || undefined,
        industry: industry || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setAnalytics(res.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [token, useLiveApi, department, graduationYear, industry, dateFrom, dateTo]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (!useLiveApi) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Live analytics unavailable"
          description="Sign in with live institution data to view alumni analytics."
        />
      </div>
    );
  }

  if (loading && !analytics) return <RouteLoading label="Loading alumni analytics" />;

  const data = analytics;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Alumni Network"
        title="Alumni Analytics"
        description="Live alumni and community intelligence from institution records."
      />

      <nav aria-label="Alumni sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <Link href={INSTITUTION_ROUTES.alumni} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Management
        </Link>
        <span className={buttonVariants({ variant: "default", size: "sm" })}>Analytics</span>
        <Link href={INSTITUTION_ROUTES.alumniReports} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Reports
        </Link>
      </nav>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine analytics by department, graduation year, industry, or date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className="form-control"
            placeholder="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
          <input
            className="form-control"
            placeholder="Graduation year"
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
          />
          <input
            className="form-control"
            placeholder="Industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
          <input
            className="form-control"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Date from"
          />
          <input
            className="form-control"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Date to"
          />
        </CardContent>
      </Card>

      {!data?.hasData ? (
        <EmptyState
          title="No alumni data yet"
          description="Register alumni profiles, events, and community groups to populate analytics."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InstitutionMetricCard label="Total Alumni" value={data.totalAlumni} hint="All profiles" icon={Users} />
            <InstitutionMetricCard label="Verified Alumni" value={data.verifiedAlumni} hint="Verified profiles" icon={Users} />
            <InstitutionMetricCard label="Active Alumni" value={data.activeAlumni} hint="Active status" icon={TrendingUp} />
            <InstitutionMetricCard label="Community Groups" value={data.communityGroups} hint="Active groups" icon={UsersRound} />
            <InstitutionMetricCard
              label="Mentors Available"
              value={data.mentorshipParticipation.mentorsAvailable}
              hint="Open to mentor"
              icon={Handshake}
            />
            <InstitutionMetricCard
              label="Active Mentorships"
              value={data.mentorshipParticipation.activeMentorships}
              hint="Matched or active"
              icon={Handshake}
            />
            <InstitutionMetricCard
              label="Total Referrals"
              value={data.referralActivity.totalReferrals}
              hint="Career referrals"
              icon={Briefcase}
            />
            <InstitutionMetricCard
              label="Event Registrations"
              value={data.eventParticipation.totalRegistrations}
              hint="All events"
              icon={CalendarDays}
            />
            <InstitutionMetricCard
              label="Donations Approved"
              value={data.donationsContributions.approvedRecords}
              hint="Approved records"
              icon={Heart}
            />
            <InstitutionMetricCard
              label="Total Donation Amount"
              value={data.donationsContributions.totalAmount ? formatCurrency(data.donationsContributions.totalAmount) : "—"}
              hint="Approved/disbursed"
              icon={Heart}
            />
            <InstitutionMetricCard
              label="Volunteer Hours"
              value={data.volunteerEngagement.totalHours}
              hint="Total contributed"
              icon={GraduationCap}
            />
            <InstitutionMetricCard
              label="Career Applications"
              value={data.referralActivity.totalApplications}
              hint="Referral applications"
              icon={FileBarChart}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <InstitutionBarChart
              title="Alumni by Graduation Year"
              description="Distribution by graduation year."
              labels={Object.keys(data.alumniByGraduationYear)}
              values={Object.values(data.alumniByGraduationYear)}
            />
            <InstitutionBarChart
              title="Alumni by Department"
              description="Distribution by academic department."
              labels={Object.keys(data.alumniByDepartment)}
              values={Object.values(data.alumniByDepartment)}
            />
            <InstitutionDistributionChart
              title="Alumni by Industry"
              description="Distribution by industry sector."
              labels={Object.keys(data.alumniByIndustry)}
              values={Object.values(data.alumniByIndustry)}
            />
            <InstitutionBarChart
              title="Alumni by Country"
              description="Geographic distribution."
              labels={Object.keys(data.alumniByCountry)}
              values={Object.values(data.alumniByCountry)}
            />
            <InstitutionBarChart
              title="Top Companies"
              description="Alumni by current employer (top 25)."
              labels={Object.keys(data.alumniByCompany)}
              values={Object.values(data.alumniByCompany)}
            />
            <InstitutionDistributionChart
              title="Volunteer Roles"
              description="Volunteer participation by role."
              labels={Object.keys(data.volunteerEngagement.byRole)}
              values={Object.values(data.volunteerEngagement.byRole)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function AlumniReportsPage() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  const [preview, setPreview] = useState<AlumniReportPreview | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  async function runReport(type: string, nextPage = 1) {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    setActiveType(type);
    setPage(nextPage);
    try {
      const res = await institutionAlumniApi.previewReport(token, type, {
        page: nextPage,
        limit: 50,
        q: search || undefined,
        status: status || undefined,
      });
      setPreview(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(type: string, format: "csv" | "xlsx" | "pdf") {
    if (!token || !useLiveApi) return;
    try {
      const res = await institutionAlumniApi.exportReport(token, type, format, {
        q: search || undefined,
        status: status || undefined,
      });
      downloadFile(res.export.filename, res.export.content, res.export.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export report");
    }
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Alumni Network"
        title="Alumni Report Center"
        description="Preview, filter, and export alumni reports. All exports are permission-gated and audit-logged."
        actions={
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print
          </Button>
        }
      />

      <nav aria-label="Alumni sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <Link href={INSTITUTION_ROUTES.alumni} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Management
        </Link>
        <Link href={INSTITUTION_ROUTES.alumniAnalytics} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Analytics
        </Link>
        <span className={buttonVariants({ variant: "default", size: "sm" })}>Reports</span>
      </nav>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
          <CardDescription>Search, filter, and sort report data before preview or export.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <input
            className="form-control"
            placeholder="Search name or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            className="form-control"
            placeholder="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_DEFS.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.type} className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <span className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-xl">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>Server-generated from live alumni platform records.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void runReport(report.type)} disabled={loading || !useLiveApi}>
                  Preview
                </Button>
                {useLiveApi ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void exportReport(report.type, "csv")}>
                      <Download aria-hidden="true" /> CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void exportReport(report.type, "xlsx")}>
                      XLSX
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void exportReport(report.type, "pdf")}>
                      PDF
                    </Button>
                  </>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {preview && activeType ? (
        <Card>
          <CardHeader>
            <CardTitle>Report preview: {activeType.replace(/_/g, " ")}</CardTitle>
            <CardDescription>
              {preview.total} total rows · page {preview.page} of {preview.pageCount}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {preview.header.map((h) => (
                    <th key={h} className="border-b p-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="border-b p-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.pageCount > 1 ? (
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => void runReport(activeType, page - 1)}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground text-sm">
                  Page {preview.page} of {preview.pageCount}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= preview.pageCount || loading}
                  onClick={() => void runReport(activeType, page + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

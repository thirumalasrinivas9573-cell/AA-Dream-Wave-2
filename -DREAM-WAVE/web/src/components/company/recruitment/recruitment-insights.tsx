"use client";

import {
  Briefcase,
  Building2,
  CalendarDays,
  Download,
  FileBarChart,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import {
  InstitutionBarChart,
  InstitutionDistributionChart,
  InstitutionMetricCard,
} from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  recruitmentApi,
} from "@/lib/api/recruitment";
import {
  companyBiApi,
  type CompanyBiDashboard,
} from "@/lib/api/business-intelligence";
import type { RecruitmentAnalytics, RecruitmentReportPreview } from "@/types/recruitment";

function downloadFile(filename: string, content: string, mimeType = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const REPORT_DEFS = [
  { type: "job_performance", title: "Job Performance Report", icon: Briefcase },
  { type: "candidate_pipeline", title: "Candidate Pipeline Report", icon: Users },
  { type: "interview_summary", title: "Interview Summary", icon: CalendarDays },
  { type: "offer_report", title: "Offer Report", icon: FileBarChart },
  { type: "hiring_report", title: "Hiring Report", icon: TrendingUp },
  { type: "recruiter_activity", title: "Recruiter Activity Report", icon: Building2 },
  { type: "recruitment_timeline", title: "Recruitment Timeline", icon: CalendarDays },
  { type: "source_effectiveness", title: "Source Effectiveness Report", icon: FileBarChart },
] as const;

export function RecruitmentAnalyticsPage() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<RecruitmentAnalytics | null>(null);
  const [biDashboard, setBiDashboard] = useState<CompanyBiDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState("");
  const [stage, setStage] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        department: department || undefined,
        stage: stage || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      const [res, biRes] = await Promise.all([
        recruitmentApi.getAnalytics(token, params),
        companyBiApi.getDashboard(token, params),
      ]);
      setAnalytics(res.analytics);
      setBiDashboard(biRes.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [token, department, stage, dateFrom, dateTo]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !analytics) return <RouteLoading label="Loading recruitment analytics" />;

  const data = analytics;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Company ATS"
        title="Recruitment Analytics"
        description="Real-time recruitment intelligence from live company hiring records."
      />

      <RecruitmentNav />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine analytics by department, stage, or date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className="form-control" placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <input className="form-control" placeholder="Application stage" value={stage} onChange={(e) => setStage(e.target.value)} />
          <input className="form-control" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
          <input className="form-control" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
          <Button type="button" onClick={() => void loadAnalytics()} disabled={loading}>
            Apply
          </Button>
        </CardContent>
      </Card>

      {!data?.hasData ? (
        <EmptyState title="No recruitment data yet" description="Publish jobs and receive applications to populate analytics." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InstitutionMetricCard label="Total Job Openings" value={data.totalJobOpenings} hint="Jobs + internships" icon={Briefcase} />
            <InstitutionMetricCard label="Active Recruitments" value={data.activeRecruitments} hint="Published listings" icon={TrendingUp} />
            <InstitutionMetricCard label="Total Applications" value={data.totalApplications} hint="All candidates" icon={Users} />
            <InstitutionMetricCard label="Interview Success Rate" value={`${data.interviewSuccessRate}%`} hint="Positive recommendations" icon={FileBarChart} />
            <InstitutionMetricCard label="Offer Acceptance Rate" value={`${data.offerAcceptanceRate}%`} hint="Accepted vs released" icon={FileBarChart} />
            <InstitutionMetricCard label="Hiring Conversion Rate" value={`${data.hiringConversionRate}%`} hint="Hired / applications" icon={TrendingUp} />
            <InstitutionMetricCard label="Avg. Time to Hire" value={data.averageTimeToHireDays ? `${data.averageTimeToHireDays} days` : "—"} hint="Applied to hired" icon={CalendarDays} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <InstitutionBarChart
              title="Applications by Position"
              description="Top roles by application volume."
              labels={Object.keys(data.applicationsByPosition)}
              values={Object.values(data.applicationsByPosition)}
            />
            <InstitutionBarChart
              title="Applications by Department"
              description="Applications grouped by department."
              labels={Object.keys(data.applicationsByDepartment)}
              values={Object.values(data.applicationsByDepartment)}
            />
            <InstitutionDistributionChart
              title="Candidate Pipeline Distribution"
              description="Applications by pipeline stage."
              labels={Object.keys(data.candidatePipelineDistribution)}
              values={Object.values(data.candidatePipelineDistribution)}
            />
            <InstitutionBarChart
              title="Monthly Hiring Trends"
              description="Hires per month."
              labels={Object.keys(data.monthlyHiringTrends)}
              values={Object.values(data.monthlyHiringTrends)}
            />
            <InstitutionBarChart
              title="Recruitment Source Performance"
              description="Applications by source."
              labels={Object.keys(data.recruitmentSourcePerformance).map((k) => k || "Direct")}
              values={Object.values(data.recruitmentSourcePerformance).map((v) => v.applications)}
            />
            <InstitutionBarChart
              title="Source Hires"
              description="Hired candidates by source."
              labels={Object.keys(data.recruitmentSourcePerformance).map((k) => k || "Direct")}
              values={Object.values(data.recruitmentSourcePerformance).map((v) => v.hired)}
            />
          </div>

          {biDashboard?.funnel?.hasData ? (
            <Card>
              <CardHeader>
                <CardTitle>Recruitment funnel</CardTitle>
                <CardDescription>
                  {biDashboard.funnel.description} · Count type: {biDashboard.funnel.countType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InstitutionBarChart
                  title="Pipeline stages"
                  description="Unique application counts by stage."
                  labels={Object.keys(biDashboard.funnel.counts).map((k) => k.replace(/_/g, " "))}
                  values={Object.values(biDashboard.funnel.counts)}
                />
              </CardContent>
            </Card>
          ) : null}

          {biDashboard?.skills?.hasData ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <InstitutionBarChart
                title="Required skills (demand)"
                description="Skills from job and internship listings."
                labels={biDashboard.skills.demand.slice(0, 8).map((s) => s.skill)}
                values={biDashboard.skills.demand.slice(0, 8).map((s) => s.count)}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Skill gaps</CardTitle>
                  <CardDescription>
                    In-demand skills not evidenced in candidate snapshots (aggregate).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {biDashboard.skills.gaps.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {biDashboard.skills.gaps.slice(0, 10).map((g) => (
                        <li key={g.skill}>
                          <span className="font-medium capitalize">{g.skill}</span> — demand count: {g.count}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No aggregate skill gaps detected.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {biDashboard?.dataQuality?.hasIssues ? (
            <Alert>
              Data quality: {biDashboard.dataQuality.warnings.length} warning(s). Review records before
              relying on derived metrics.
            </Alert>
          ) : null}
        </>
      )}
    </div>
  );
}

export function RecruitmentReportsPage() {
  const { token } = useAuth();
  const [preview, setPreview] = useState<RecruitmentReportPreview | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [sort, setSort] = useState("appliedDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  async function runReport(type: string, nextPage = 1) {
    if (!token) return;
    setLoading(true);
    setError(null);
    setActiveType(type);
    setPage(nextPage);
    try {
      const res = await recruitmentApi.previewReport(token, type, {
        page: nextPage,
        limit: 50,
        q: search || undefined,
        department: department || undefined,
        sort,
        sortDir,
      });
      setPreview(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(type: string, format: "csv" | "xlsx" | "pdf") {
    if (!token) return;
    try {
      const res = await recruitmentApi.exportReport(token, type, format, {
        q: search || undefined,
        department: department || undefined,
      });
      downloadFile(res.export.filename, res.export.content, res.export.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  if (!token) return <RouteLoading label="Authenticating" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Company ATS"
        title="Recruitment Report Center"
        description="Preview, filter, sort, and export recruitment reports. All exports are audit-logged."
        actions={
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print
          </Button>
        }
      />

      <RecruitmentNav />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
          <CardDescription>Search, filter, and sort before preview or export.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="form-control" placeholder="Search candidates or roles…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <input className="form-control" placeholder="Department filter" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <select className="form-control" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort field">
            <option value="appliedDate">Applied date</option>
            <option value="candidateName">Candidate name</option>
            <option value="department">Department</option>
            <option value="stage">Stage</option>
            <option value="role">Role</option>
          </select>
          <select className="form-control" value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} aria-label="Sort direction">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
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
                <CardDescription>Server-generated from live recruitment records.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void runReport(report.type)} disabled={loading}>
                  Preview
                </Button>
                <Button size="sm" variant="outline" onClick={() => void exportReport(report.type, "csv")}>
                  <Download aria-hidden="true" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => void exportReport(report.type, "xlsx")}>
                  XLSX
                </Button>
                <Button size="sm" variant="outline" onClick={() => void exportReport(report.type, "pdf")}>
                  PDF
                </Button>
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
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => void runReport(activeType, page - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page >= preview.pageCount || loading} onClick={() => void runReport(activeType, page + 1)}>
                Next
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>{preview.header.map((h) => <th key={h} className="border-b p-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j} className="border-b p-2">{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

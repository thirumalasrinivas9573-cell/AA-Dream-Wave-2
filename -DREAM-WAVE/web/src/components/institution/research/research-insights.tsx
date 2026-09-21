"use client";

import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Download,
  FileBarChart,
  FlaskConical,
  Handshake,
  Lightbulb,
  Microscope,
  Printer,
  Rocket,
  TrendingUp,
  Users,
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
import { institutionResearchApi } from "@/lib/api/institution-research";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import type { InnovationAnalytics, InnovationReportPreview } from "@/types/research-management";

function downloadFile(filename: string, content: string, mimeType = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatFunding(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const REPORT_DEFS = [
  { type: "research_project", title: "Research Project Report", icon: Microscope },
  { type: "publication", title: "Publication Report", icon: BookOpen },
  { type: "startup_progress", title: "Startup Progress Report", icon: Rocket },
  { type: "incubation", title: "Incubation Report", icon: FlaskConical },
  { type: "mentor_activity", title: "Mentor Activity Report", icon: Users },
  { type: "funding", title: "Funding Report", icon: TrendingUp },
  { type: "innovation_ideas", title: "Innovation Ideas Report", icon: Lightbulb },
  { type: "event_participation", title: "Event Participation Report", icon: CalendarDays },
  { type: "collaboration", title: "Collaboration Report", icon: Handshake },
] as const;

export function ResearchAnalyticsPage() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  const [analytics, setAnalytics] = useState<InnovationAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionResearchApi.getAnalytics(token, {
        domain: domain || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setAnalytics(res.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [token, useLiveApi, domain, status, dateFrom, dateTo]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (!useLiveApi) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Live analytics unavailable"
          description="Sign in with live institution data to view research and innovation analytics."
        />
      </div>
    );
  }

  if (loading && !analytics) return <RouteLoading label="Loading research analytics" />;

  const data = analytics;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Research & Innovation"
        title="Research Analytics"
        description="Live research and innovation intelligence from institution records."
      />

      <nav aria-label="Research sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <Link href={INSTITUTION_ROUTES.research} className={buttonVariants({ variant: "ghost", size: "sm" })}>Management</Link>
        <span className={buttonVariants({ variant: "default", size: "sm" })}>Analytics</span>
        <Link href={INSTITUTION_ROUTES.researchReports} className={buttonVariants({ variant: "ghost", size: "sm" })}>Reports</Link>
      </nav>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine analytics by domain, status, or date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="form-control" placeholder="Research domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <input className="form-control" placeholder="Project status" value={status} onChange={(e) => setStatus(e.target.value)} />
          <input className="form-control" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
          <input className="form-control" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
        </CardContent>
      </Card>

      {!data?.hasData ? (
        <EmptyState
          title="No research data yet"
          description="Create research projects, register startups, or submit innovation ideas to populate analytics."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InstitutionMetricCard label="Total Research Projects" value={data.totalResearchProjects} hint="All projects" icon={Microscope} />
            <InstitutionMetricCard label="Active Projects" value={data.activeProjects} hint="In progress" icon={TrendingUp} />
            <InstitutionMetricCard label="Completed Projects" value={data.completedProjects} hint="Finished" icon={FileBarChart} />
            <InstitutionMetricCard label="Publications" value={data.totalPublications} hint="Recorded outputs" icon={BookOpen} />
            <InstitutionMetricCard label="Faculty Participation" value={data.facultyParticipation} hint="Unique faculty" icon={Users} />
            <InstitutionMetricCard label="Student Participation" value={data.studentParticipation} hint="Unique students" icon={Users} />
            <InstitutionMetricCard label="Startup Registrations" value={data.startupRegistrations} hint="Registered startups" icon={Rocket} />
            <InstitutionMetricCard label="Innovation Ideas" value={data.innovationIdeasSubmitted} hint="Submitted ideas" icon={Lightbulb} />
            <InstitutionMetricCard label="Event Participation" value={data.eventParticipation} hint="Registrations" icon={CalendarDays} />
            <InstitutionMetricCard label="Active Mentors" value={data.mentorEngagement.activeMentors} hint="Mentor directory" icon={Briefcase} />
            <InstitutionMetricCard label="Mentorship Sessions" value={data.mentorEngagement.totalSessions} hint="Scheduled sessions" icon={Handshake} />
            <InstitutionMetricCard label="Total Funding" value={data.totalFundingAmount ? formatFunding(data.totalFundingAmount) : "—"} hint="Approved/disbursed" icon={TrendingUp} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <InstitutionBarChart
              title="Research Domains"
              description="Projects by research domain."
              labels={Object.keys(data.researchDomains)}
              values={Object.values(data.researchDomains)}
            />
            <InstitutionDistributionChart
              title="Incubation Progress"
              description="Startups by incubation stage."
              labels={Object.keys(data.incubationProgress)}
              values={Object.values(data.incubationProgress)}
            />
            <InstitutionDistributionChart
              title="Innovation Ideas by Type"
              description="Submitted ideas by category."
              labels={Object.keys(data.ideasByType)}
              values={Object.values(data.ideasByType)}
            />
            <InstitutionBarChart
              title="Funding Distribution"
              description="Funding records by type (count)."
              labels={Object.keys(data.fundingDistribution)}
              values={Object.values(data.fundingDistribution).map((f) => f.count)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function ResearchReportsPage() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  const [preview, setPreview] = useState<InnovationReportPreview | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function runReport(type: string) {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    setActiveType(type);
    try {
      const res = await institutionResearchApi.previewReport(token, type, {
        page: 1,
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
    const res = await institutionResearchApi.exportReport(token, type, format, {
      q: search || undefined,
      status: status || undefined,
    });
    downloadFile(res.export.filename, res.export.content, res.export.mimeType);
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Research & Innovation"
        title="Research Report Center"
        description="Preview, filter, and export research and innovation reports. All exports are audit-logged."
        actions={
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print
          </Button>
        }
      />

      <nav aria-label="Research sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <Link href={INSTITUTION_ROUTES.research} className={buttonVariants({ variant: "ghost", size: "sm" })}>Management</Link>
        <Link href={INSTITUTION_ROUTES.researchAnalytics} className={buttonVariants({ variant: "ghost", size: "sm" })}>Analytics</Link>
        <span className={buttonVariants({ variant: "default", size: "sm" })}>Reports</span>
      </nav>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <input className="form-control" placeholder="Search title or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <input className="form-control" placeholder="Status filter" value={status} onChange={(e) => setStatus(e.target.value)} />
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
                <CardDescription>Server-generated from live research and innovation records.</CardDescription>
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

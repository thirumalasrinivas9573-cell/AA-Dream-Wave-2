"use client";

import {
  Briefcase,
  Building2,
  CalendarDays,
  Download,
  FileBarChart,
  GraduationCap,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { formatCurrency } from "@/components/institution/placements/placement-ui";
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
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import {
  institutionPlacementsApi,
  type PlacementAnalytics,
  type PlacementReportPreview,
} from "@/lib/api/institution-placements";
import { usePlacementManagementStore } from "@/store/placement-management-store";

function downloadFile(filename: string, content: string, mimeType = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const REPORT_DEFS = [
  { type: "placement_summary", title: "Placement Summary", icon: GraduationCap },
  { type: "company_hiring", title: "Company Hiring Report", icon: Building2 },
  { type: "student_placement", title: "Student Placement Report", icon: Users },
  { type: "internship", title: "Internship Report", icon: Briefcase },
  { type: "offer_acceptance", title: "Offer Acceptance Report", icon: FileBarChart },
  { type: "campus_drive", title: "Campus Drive Report", icon: CalendarDays },
  { type: "recruitment_timeline", title: "Recruitment Timeline", icon: TrendingUp },
  { type: "department_placement", title: "Department Placement", icon: FileBarChart },
  { type: "batch_placement", title: "Batch Placement", icon: GraduationCap },
] as const;

export function PlacementAnalyticsPage() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();
  const hydrated = usePlacementManagementStore((s) => s.hydrated);
  const hydrate = usePlacementManagementStore((s) => s.hydrate);

  const [analytics, setAnalytics] = useState<PlacementAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState("");
  const [stage, setStage] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionPlacementsApi.getAnalytics(token, {
        department: department || undefined,
        stage: stage || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setAnalytics(res.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [token, useLiveApi, department, stage, dateFrom, dateTo]);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (!hydrated) return <RouteLoading label="Loading placement analytics" />;

  if (!useLiveApi) {
    return (
      <div className="container-app py-8">
        <EmptyState title="Live analytics unavailable" description="Sign in with live institution data to view placement analytics." />
      </div>
    );
  }

  if (loading && !analytics) return <RouteLoading label="Loading placement analytics" />;

  const data = analytics;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Placement Management"
        title="Placement Analytics"
        description="Real-time placement intelligence from institution recruitment records."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine analytics by department, stage, or date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="form-control" placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <input className="form-control" placeholder="Application stage" value={stage} onChange={(e) => setStage(e.target.value)} />
          <input className="form-control" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
          <input className="form-control" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
        </CardContent>
      </Card>

      {!data?.hasData ? (
        <EmptyState title="No placement data yet" description="Create opportunities and accept applications to populate analytics." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InstitutionMetricCard label="Total Opportunities" value={data.totalOpportunities} hint="All listings" icon={Briefcase} />
            <InstitutionMetricCard label="Active Opportunities" value={data.activeOpportunities} hint="Open now" icon={TrendingUp} />
            <InstitutionMetricCard label="Applications" value={data.applicationsSubmitted} hint="Submitted" icon={Users} />
            <InstitutionMetricCard label="Students Eligible" value={data.studentsEligible} hint="Ready pool" icon={Users} />
            <InstitutionMetricCard label="Students Selected" value={data.studentsSelected} hint="Shortlisted/selected" icon={GraduationCap} />
            <InstitutionMetricCard label="Students Placed" value={data.studentsPlaced} hint="Hired/accepted" icon={GraduationCap} />
            <InstitutionMetricCard label="Placement %" value={`${data.placementPercentage}%`} hint="Of eligible" icon={TrendingUp} />
            <InstitutionMetricCard label="Highest Package" value={data.highestPackage ? formatCurrency(data.highestPackage) : "—"} hint="Top offer" icon={TrendingUp} />
            <InstitutionMetricCard label="Average Package" value={data.averagePackage ? formatCurrency(data.averagePackage) : "—"} hint="Mean offer" icon={TrendingUp} />
            <InstitutionMetricCard label="Internships" value={data.internshipListings} hint="Listings" icon={Briefcase} />
            <InstitutionMetricCard label="Offers Released" value={data.offersReleased} hint="Total offers" icon={FileBarChart} />
            <InstitutionMetricCard label="Offers Accepted" value={data.offersAccepted} hint="Accepted" icon={FileBarChart} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <InstitutionBarChart title="Department-wise Applications" description="Applications by department." labels={Object.keys(data.byDepartment)} values={Object.values(data.byDepartment)} />
            <InstitutionBarChart title="Department-wise Placements" description="Placed students by department." labels={Object.keys(data.byDepartmentPlaced)} values={Object.values(data.byDepartmentPlaced)} />
            <InstitutionBarChart title="Batch-wise Applications" description="Applications by graduation year/batch." labels={Object.keys(data.byBatch)} values={Object.values(data.byBatch)} />
            <InstitutionBarChart title="Company-wise Hiring" description="Applications per company." labels={Object.keys(data.byCompany)} values={Object.values(data.byCompany)} />
            <InstitutionDistributionChart title="Application Pipeline" description="Applications by stage." labels={Object.keys(data.byApplicationStage)} values={Object.values(data.byApplicationStage)} />
            <InstitutionDistributionChart title="Offer Outcomes" description="Offers by status." labels={Object.keys(data.byOfferStatus)} values={Object.values(data.byOfferStatus)} />
          </div>
        </>
      )}
    </div>
  );
}

export function PlacementReportsPage() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();
  const hydrated = usePlacementManagementStore((s) => s.hydrated);
  const hydrate = usePlacementManagementStore((s) => s.hydrate);

  const [preview, setPreview] = useState<PlacementReportPreview | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  async function runReport(type: string) {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    setActiveType(type);
    try {
      const res = await institutionPlacementsApi.previewReport(token, type, {
        page: 1,
        limit: 50,
        q: search || undefined,
        department: department || undefined,
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
    const res = await institutionPlacementsApi.exportReport(token, type, format, {
      q: search || undefined,
      department: department || undefined,
    });
    downloadFile(res.export.filename, res.export.content, res.export.mimeType);
  }

  if (!hydrated) return <RouteLoading label="Loading placement reports" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Placement Management"
        title="Placement Report Center"
        description="Preview, filter, and export placement reports. All exports are audit-logged."
        actions={
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print
          </Button>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <input className="form-control" placeholder="Search students or roles…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <input className="form-control" placeholder="Department filter" value={department} onChange={(e) => setDepartment(e.target.value)} />
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
                <CardDescription>Server-generated from live placement records.</CardDescription>
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
            <CardDescription>{preview.total} total rows · page {preview.page} of {preview.pageCount}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

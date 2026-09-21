"use client";

import {
  Award,
  BookOpen,
  Download,
  FileBarChart,
  GraduationCap,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import {
  institutionAnalyticsApi,
  type InstitutionAnalytics,
  type ReportPreview,
} from "@/lib/api/institution-analytics";
import { useStudentManagementStore } from "@/store/student-management-store";
import type { ManagedStudent } from "@/types/student-management";

function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportStudentsLocal(fileName: string, students: ManagedStudent[]) {
  const header = ["Student ID", "Roll Number", "Name", "Department", "Course", "Semester", "CGPA", "Status"];
  const rows = students.map((s) => [s.id, s.rollNumber, s.fullName, s.department, s.course, s.semester, s.cgpa, s.status]);
  const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadCsv(fileName, csv);
}

const REPORT_DEFS = [
  { type: "student_directory", title: "Student Directory", icon: Users },
  { type: "department", title: "Department Report", icon: FileBarChart },
  { type: "program", title: "Program Report", icon: BookOpen },
  { type: "placement", title: "Placement Report", icon: GraduationCap },
  { type: "skills", title: "Skills Report", icon: TrendingUp },
  { type: "projects", title: "Projects Report", icon: Award },
  { type: "certificates", title: "Certificates Report", icon: Award },
  { type: "academic_summary", title: "Academic Summary", icon: BookOpen },
  { type: "profile_completeness", title: "Profile Completeness", icon: Users },
  { type: "attendance", title: "Attendance Summary", icon: TrendingUp },
] as const;

export function StudentAnalyticsPage() {
  const { token } = useAuth();
  const hydrated = useStudentManagementStore((s) => s.hydrated);
  const hydrate = useStudentManagementStore((s) => s.hydrate);
  const students = useStudentManagementStore((s) => s.students);
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  const [analytics, setAnalytics] = useState<InstitutionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState("");
  const [program, setProgram] = useState("");
  const [batch, setBatch] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");
  const [placementStatus, setPlacementStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionAnalyticsApi.getAnalytics(token, {
        department: department || undefined,
        course: program || undefined,
        batch: batch || undefined,
        semester: semester || undefined,
        section: section || undefined,
        status: status || undefined,
        placementStatus: placementStatus || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setAnalytics(res.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [token, useLiveApi, department, program, batch, semester, section, status, placementStatus, dateFrom, dateTo]);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const localMetrics = useMemo(() => {
    if (useLiveApi || !students.length) return null;
    const departments = [...new Set(students.map((s) => s.department))];
    return {
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === "active").length,
      byDepartment: Object.fromEntries(departments.map((d) => [d, students.filter((s) => s.department === d).length])),
      bySemester: Object.fromEntries([...new Set(students.map((s) => s.semester))].map((s) => [s, students.filter((x) => x.semester === s).length])),
      byAcademicStatus: Object.fromEntries([...new Set(students.map((s) => s.status))].map((s) => [s, students.filter((x) => x.status === s).length])),
      byPlacementLifecycle: Object.fromEntries([...new Set(students.map((s) => s.placement.status))].map((s) => [s, students.filter((x) => x.placement.status === s).length])),
      byProgram: Object.fromEntries([...new Set(students.map((s) => s.course))].map((c) => [c, students.filter((s) => s.course === c).length])),
      byBatch: {},
      bySection: {},
      placementEligible: students.filter((s) => ["placement-ready", "interviewing"].includes(s.placement.status)).length,
      placedStudents: students.filter((s) => s.placement.status === "placed").length,
      withSharedProjects: students.filter((s) => s.projects.length).length,
      withVerifiedCertificates: 0,
      missingRequiredDocuments: students.filter((s) => !s.documents.length).length,
      hasData: students.length > 0,
    } as InstitutionAnalytics;
  }, [students, useLiveApi]);

  const data = useLiveApi ? analytics : localMetrics;

  if (!hydrated && !useLiveApi) return <RouteLoading label="Loading student analytics" />;
  if (loading && !data) return <RouteLoading label="Loading analytics" />;

  if (!data?.hasData) {
    return (
      <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
        <InstitutionPageHeader eyebrow="Student Management" title="Student Analytics" description="Real institution data — no fabricated metrics." />
        <EmptyState title="No analytics data yet" description="Add students to the directory to populate analytics dashboards." />
      </div>
    );
  }

  const deptLabels = Object.keys(data.byDepartment);
  const deptValues = Object.values(data.byDepartment);

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Student Management"
        title="Student Analytics"
        description="Authorized aggregated metrics from institution student records."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select className="form-control" value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Filter department">
          <option value="">All departments</option>
          {deptLabels.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="form-control" value={program} onChange={(e) => setProgram(e.target.value)} aria-label="Filter program">
          <option value="">All programs</option>
          {Object.keys(data.byProgram).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-control" value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Filter batch">
          <option value="">All batches</option>
          {Object.keys(data.byBatch).map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="form-control" value={semester} onChange={(e) => setSemester(e.target.value)} aria-label="Filter semester">
          <option value="">All semesters</option>
          {Object.keys(data.bySemester).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-control" value={section} onChange={(e) => setSection(e.target.value)} aria-label="Filter section">
          <option value="">All sections</option>
          {Object.keys(data.bySection).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter academic status">
          <option value="">All statuses</option>
          {Object.keys(data.byAcademicStatus || {}).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-control" value={placementStatus} onChange={(e) => setPlacementStatus(e.target.value)} aria-label="Filter placement status">
          <option value="">All placement statuses</option>
          {Object.keys(data.byPlacementLifecycle || {}).map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
        <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
        <Button onClick={() => void loadAnalytics()}>Apply filters</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InstitutionMetricCard label="Total Students" value={data.totalStudents} hint="Enrolled records" icon={Users} />
        <InstitutionMetricCard label="Active Students" value={data.activeStudents} hint="Currently active" icon={Users} />
        <InstitutionMetricCard label="Placement Eligible" value={data.placementEligible} hint="Ready pipeline" icon={GraduationCap} />
        <InstitutionMetricCard label="Placed" value={data.placedStudents} hint="Placed students" icon={Award} />
        <InstitutionMetricCard label="Shared Projects" value={data.withSharedProjects} hint="With projects" icon={TrendingUp} />
        <InstitutionMetricCard label="Verified Certificates" value={data.withVerifiedCertificates} hint="Verified creds" icon={Award} />
        <InstitutionMetricCard label="Missing Documents" value={data.missingRequiredDocuments} hint="Needs follow-up" icon={FileBarChart} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InstitutionBarChart title="By Department" description="Students per department." labels={deptLabels} values={deptValues} />
        <InstitutionBarChart title="By Program" description="Students per program." labels={Object.keys(data.byProgram)} values={Object.values(data.byProgram)} />
        <InstitutionBarChart title="By Semester" description="Semester distribution." labels={Object.keys(data.bySemester)} values={Object.values(data.bySemester)} />
        <InstitutionDistributionChart title="Placement Lifecycle" description="Lifecycle status distribution." labels={Object.keys(data.byPlacementLifecycle || {})} values={Object.values(data.byPlacementLifecycle || {})} />
      </div>
    </div>
  );
}

export function StudentReportsPage() {
  const { token } = useAuth();
  const hydrated = useStudentManagementStore((s) => s.hydrated);
  const hydrate = useStudentManagementStore((s) => s.hydrate);
  const students = useStudentManagementStore((s) => s.students);
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  async function runReport(type: string) {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setActiveType(type);
    try {
      const res = await institutionAnalyticsApi.previewReport(token, type, { page: 1, limit: 50 });
      setPreview(res.report);
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(type: string, format: "csv" | "xlsx" | "pdf") {
    if (!token || !useLiveApi) return;
    const res = await institutionAnalyticsApi.exportReport(token, type, format);
    downloadCsv(res.export.filename, res.export.content);
  }

  if (!hydrated && !useLiveApi) return <RouteLoading label="Loading student reports" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Student Management"
        title="Report Center"
        description="Preview, filter, and export institution reports. All exports are audit-logged."
        actions={
          <Link href={INSTITUTION_ROUTES.reports} className={buttonVariants({ variant: "outline" })}>
            Full report center
          </Link>
        }
      />

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
                <CardDescription>Server-generated from institution records.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void runReport(report.type)} disabled={loading}>
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
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => exportStudentsLocal(`${report.type}.csv`, students)}>
                    Export CSV
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer aria-hidden="true" /> Print
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

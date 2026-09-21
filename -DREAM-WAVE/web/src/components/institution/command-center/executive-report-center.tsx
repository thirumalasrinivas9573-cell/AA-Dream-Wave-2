"use client";

import {
  Briefcase,
  Building2,
  Download,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Landmark,
  Printer,
  Rocket,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
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
import { institutionCommandCenterApi } from "@/lib/api/institution-command-center";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import type { ExecutiveReportPreview } from "@/types/command-center";

function downloadFile(filename: string, content: string, mimeType = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const REPORT_DEFS = [
  { type: "executive_summary", title: "Executive Summary Report", icon: Landmark },
  { type: "academic_intelligence", title: "Academic Intelligence Report", icon: GraduationCap },
  { type: "student_success", title: "Student Success Report", icon: Users },
  { type: "placement_performance", title: "Placement Performance Report", icon: Briefcase },
  { type: "internship", title: "Internship Report", icon: Target },
  { type: "industry_collaboration", title: "Industry Collaboration Report", icon: Building2 },
  { type: "research_innovation", title: "Research & Innovation Report", icon: FlaskConical },
  { type: "startup_ecosystem", title: "Startup Ecosystem Report", icon: Rocket },
  { type: "alumni_engagement", title: "Alumni Engagement Report", icon: GraduationCap },
  { type: "institutional_health", title: "Institutional Health Report", icon: HeartPulse },
  { type: "strategic_kpi", title: "Strategic KPI Report", icon: TrendingUp },
] as const;

export function ExecutiveReportCenter() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  const [preview, setPreview] = useState<ExecutiveReportPreview | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);

  async function runReport(type: string, nextPage = 1) {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    setActiveType(type);
    setPage(nextPage);
    try {
      const res = await institutionCommandCenterApi.previewReport(token, type, {
        page: nextPage,
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
    try {
      const res = await institutionCommandCenterApi.exportReport(token, type, format, {
        q: search || undefined,
        department: department || undefined,
      });
      downloadFile(res.export.filename, res.export.content, res.export.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export report");
    }
  }

  if (!useLiveApi) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Executive reports require live data"
          description="Sign in with an institution account to access the executive report center."
        />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Institution Intelligence"
        title="Executive Report Center"
        description="Preview, filter, and export executive reports from live institutional data. All exports are permission-gated and audit-logged."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={INSTITUTION_ROUTES.commandCenter} className={buttonVariants({ variant: "outline" })}>
              Command Center
            </Link>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              Print
            </Button>
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
          <CardDescription>Search, filter, and sort report data before preview or export.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <input
            className="form-control"
            placeholder="Search name or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            className="form-control"
            placeholder="Department filter"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
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
                <CardDescription>Generated from live cross-system institutional records.</CardDescription>
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

"use client";

import { FileText, Printer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import type { ReportDocument } from "@/types/student";

const SECTION_META: Array<{ key: string; label: string }> = [
  { key: "executiveSummary", label: "Executive Summary" },
  { key: "industryOverview", label: "Industry Overview" },
  { key: "marketSize", label: "Market Size & Growth" },
  { key: "futureDemand", label: "Future Demand" },
  { key: "globalTrends", label: "Global Trends" },
  { key: "indiaTrends", label: "India Market Trends" },
  { key: "requiredSkills", label: "Required Skills" },
  { key: "learningRoadmap", label: "Learning Roadmap" },
  { key: "careerOpportunities", label: "Career Opportunities" },
  { key: "salaryAnalysis", label: "Salary Analysis" },
  { key: "topCompanies", label: "Top Companies" },
  { key: "realProjects", label: "Real Projects" },
  { key: "emergingTechnologies", label: "Emerging Technologies" },
  { key: "challenges", label: "Challenges & Risks" },
  { key: "recommendations", label: "Recommendations" },
  { key: "careerOverview", label: "Career Overview" },
  { key: "demand", label: "Market Demand" },
  { key: "skills", label: "Skills" },
  { key: "learningPath", label: "Learning Path" },
  { key: "salary", label: "Salary" },
  { key: "growth", label: "Career Growth" },
  { key: "risks", label: "Risks" },
  { key: "opportunities", label: "Opportunities" },
  { key: "finalDecision", label: "Final Recommendation" },
];

export function ReportsWorkspace() {
  const { token } = useAuth();
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await studentService.reports.list(token);
      const list = data.reports ?? [];
      setReports(list);
      setSelectedId(list[0]?._id ?? "");
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const selected = useMemo(
    () => reports.find((report) => report._id === selectedId) ?? null,
    [reports, selectedId],
  );

  const activeSections = useMemo(() => {
    if (!selected?.report) return [];
    return SECTION_META.filter((section) => {
      const value = selected.report[section.key];
      return typeof value === "string" && value.trim().length > 0;
    });
  }, [selected]);

  const totalWords = useMemo(() => {
    if (!selected?.report) return 0;
    return Object.values(selected.report).reduce((sum, value) => {
      if (typeof value !== "string") return sum;
      return sum + value.trim().split(/\s+/).filter(Boolean).length;
    }, 0);
  }, [selected]);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !goal.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await studentService.reports.generate(goal.trim(), token);
      setReports((prev) => [data.report, ...prev]);
      setSelectedId(data.report._id);
      setGoal("");
      setOpenSections({});
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Student platform</p>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Deep R&D career intelligence reports with multi-section analysis.
          </p>
        </div>
        {selected ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 print:hidden"
            onClick={printReport}
          >
            <Printer className="size-4" aria-hidden="true" />
            Print / PDF
          </Button>
        ) : null}
      </header>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Generate report</CardTitle>
          <CardDescription>
            Enter a career or role for a multi-section research report.
          </CardDescription>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={generate}>
            <Input
              className="h-10 flex-1"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="e.g. Full Stack Developer"
              disabled={generating}
            />
            <Button type="submit" className="h-10" disabled={generating}>
              <FileText className="size-4" aria-hidden="true" />
              {generating ? "Researching…" : "Generate report"}
            </Button>
          </form>
        </CardHeader>
      </Card>

      {error ? (
        <AuthAlert variant="error" title="Reports error" description={error} />
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading reports" />
        </div>
      ) : null}

      {!loading && reports.length === 0 && !generating ? (
        <EmptyState
          title="No reports yet"
          description="Generate your first R&D report to see deep career analysis here."
        />
      ) : null}

      {reports.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] xl:grid-cols-[240px_1fr]">
          <aside className="table-scroll flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0 print:hidden">
            <p className="text-muted-foreground hidden text-xs font-medium tracking-wide uppercase lg:block">
              Saved reports
            </p>
            {reports.map((report) => (
              <button
                key={report._id}
                type="button"
                className={cn(
                  "border-border w-full min-w-[12rem] shrink-0 rounded-xl border px-3 py-2 text-left text-sm transition lg:min-w-0",
                  selectedId === report._id
                    ? "bg-muted ring-ring ring-2"
                    : "hover:bg-muted/40",
                )}
                onClick={() => {
                  setSelectedId(report._id);
                  setOpenSections({});
                }}
              >
                <span className="line-clamp-2 font-medium">{report.goal}</span>
                {report.createdAt ? (
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                ) : null}
              </button>
            ))}
          </aside>

          {selected ? (
            <div className="space-y-4" id="print-report">
              <Card>
                <CardHeader>
                  <CardTitle>{selected.goal}</CardTitle>
                  <CardDescription>
                    {activeSections.length} sections · {totalWords} words
                  </CardDescription>
                </CardHeader>
              </Card>

              {activeSections.map((section, index) => {
                const content = selected.report[section.key] || "";
                const open = openSections[section.key] ?? index < 2;
                return (
                  <Card key={section.key} padding="none" className="overflow-hidden">
                    <button
                      type="button"
                      className="hover:bg-muted/30 flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                      onClick={() =>
                        setOpenSections((prev) => ({
                          ...prev,
                          [section.key]: !open,
                        }))
                      }
                      aria-expanded={open}
                    >
                      <span className="text-sm font-medium">
                        {String(index + 1).padStart(2, "0")}. {section.label}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {open ? "Hide" : "Show"}
                      </span>
                    </button>
                    {open ? (
                      <div className="border-border border-t px-5 py-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {content}
                        </p>
                      </div>
                    ) : null}
                  </Card>
                );
              })}

              {activeSections.length === 0 ? (
                <EmptyState
                  title="Empty report body"
                  description="This report has no readable sections yet."
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

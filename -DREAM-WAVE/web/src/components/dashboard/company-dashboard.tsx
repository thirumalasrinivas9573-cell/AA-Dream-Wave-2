"use client";

import { useEffect, useMemo, useState } from "react";

import { Spinner } from "@/components/common/spinner";
import {
  ActivityTimeline,
  DashboardSection,
  ExportButton,
  MiniBarChart,
  ProgressBar,
  SimplePagination,
  SmartStatCard,
} from "@/components/dashboard/dashboard-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanyStore } from "@/store/company-store";

export function CompanyDashboard({ org }: { org?: string }) {
  const hydrate = useCompanyStore((s) => s.hydrate);
  const hydrated = useCompanyStore((s) => s.hydrated);
  const jobs = useCompanyStore((s) => s.jobs);
  const applications = useCompanyStore((s) => s.applications);
  const interviews = useCompanyStore((s) => s.interviews);
  const pipeline = useCompanyStore((s) => s.pipeline);

  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const openJobs = jobs.filter((job) => job.status === "open").length;
  const totalApplicants = jobs.reduce((sum, job) => sum + job.applicants, 0);
  const hired = applications.filter((app) => app.stage === "hired").length;

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((app) => {
      if (stageFilter !== "all" && app.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        app.candidate.toLowerCase().includes(q) ||
        app.role.toLowerCase().includes(q)
      );
    });
  }, [applications, query, stageFilter]);

  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(filteredApps.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedApps = filteredApps.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const exportHiring = () => {
    const blob = new Blob(
      [JSON.stringify({ jobs, applications, interviews }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dreamwave-hiring-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading hiring dashboard" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{org || "Company"} hiring dashboard</CardTitle>
            <CardDescription>
              Jobs, applications, interviews, talent search, and analytics in one
              enterprise view.
            </CardDescription>
          </div>
          <ExportButton label="Export hiring" onClick={exportHiring} />
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmartStatCard label="Open roles" value={openJobs} hint="active requisitions" />
        <SmartStatCard label="Applicants" value={totalApplicants} trend="+12%" />
        <SmartStatCard label="Interviews" value={interviews.length} hint="scheduled" />
        <SmartStatCard label="Hired" value={hired} hint="pipeline wins" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardSection title="Job analytics" description="Applicant volume by role.">
          <Card>
            <CardContent className="pt-6">
              <MiniBarChart
                values={jobs.map((job) => job.applicants)}
                labels={jobs.map((job) => job.title.split(" ")[0] || job.title)}
              />
            </CardContent>
          </Card>
        </DashboardSection>
        <DashboardSection
          title="Company analytics"
          description="Hiring funnel from applied to hired."
        >
          <Card>
            <CardContent className="space-y-4 pt-6">
              <MiniBarChart
                values={pipeline}
                labels={["Applied", "Screen", "Interview", "Offer", "Hired", "Out"]}
              />
              <ProgressBar
                label="Offer acceptance health"
                value={Math.round((hired / Math.max(applications.length, 1)) * 100)}
              />
            </CardContent>
          </Card>
        </DashboardSection>
      </div>

      <DashboardSection title="Open jobs" description="Active and paused requisitions.">
        <div className="grid gap-4 md:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <Badge variant={job.status === "open" ? "default" : "muted"}>
                    {job.status}
                  </Badge>
                </div>
                <CardDescription>
                  {job.department} · {job.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{job.applicants} applicants</p>
                <p className="text-muted-foreground text-xs">{job.openings} openings</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection
        title="Applications"
        description="Talent search with filters and pagination."
        action={
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search talent…"
              className="h-9 w-44"
              aria-label="Search talent"
            />
            <div className="flex flex-wrap gap-1">
              {["all", "applied", "screen", "interview", "offer", "hired"].map(
                (stage) => (
                  <Button
                    key={stage}
                    type="button"
                    size="sm"
                    variant={stageFilter === stage ? "default" : "outline"}
                    onClick={() => {
                      setStageFilter(stage);
                      setPage(1);
                    }}
                  >
                    {stage}
                  </Button>
                ),
              )}
            </div>
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedApps.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium">{app.candidate}</TableCell>
                <TableCell>{app.role}</TableCell>
                <TableCell>
                  <Badge variant="outline">{app.stage}</Badge>
                </TableCell>
                <TableCell>{app.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3">
          <SimplePagination
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </div>
      </DashboardSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardSection title="Interview management" description="Upcoming conversations.">
          <Card>
            <CardContent className="space-y-3 pt-6">
              {interviews.map((item) => (
                <div
                  key={item.id}
                  className="border-border rounded-xl border px-3 py-2 text-sm"
                >
                  <p className="font-medium">
                    {item.candidate} · {item.role}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(item.when).toLocaleString()} · {item.mode} ·{" "}
                    {item.interviewer}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </DashboardSection>
        <DashboardSection title="Hiring activity" description="Recent pipeline movement.">
          <Card>
            <CardContent className="pt-6">
              <ActivityTimeline
                items={applications.slice(0, 5).map((app) => ({
                  id: app.id,
                  title: `${app.candidate} → ${app.stage}`,
                  detail: app.role,
                  time: new Date(app.updatedAt).toLocaleDateString(),
                }))}
              />
            </CardContent>
          </Card>
        </DashboardSection>
      </div>
    </div>
  );
}

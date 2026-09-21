"use client";

import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { AiInsightCard, AnalyticsSection, ScoreCard } from "@/components/institution/analytics/analytics-ui";
import {
  InstitutionBarChart,
  InstitutionDistributionChart,
  InstitutionMetricCard,
} from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { institutionCommandCenterApi } from "@/lib/api/institution-command-center";
import { institutionIntelligenceApi, type SupportSignalItem } from "@/lib/api/institution-intelligence";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { cn } from "@/lib/utils";
import type { CommandCenterOverview, ExecutiveAction, ExecutiveAnalytics, InstitutionSignal } from "@/types/command-center";
import { TIME_PERIOD_OPTIONS } from "@/types/command-center";
import { InstitutionIntelligencePanel } from "@/components/institution/command-center/institution-intelligence-panel";
import { InstitutionBiPanel } from "@/components/institution/command-center/institution-bi-panel";

type CommandTab =
  | "executive"
  | "executive-analytics"
  | "cross-system"
  | "academic"
  | "placement"
  | "industry"
  | "research"
  | "quality"
  | "outcomes"
  | "alumni"
  | "signals"
  | "insights"
  | "actions"
  | "business-intelligence"
  | "copilot";

const TABS: Array<{ id: CommandTab; label: string }> = [
  { id: "executive", label: "Executive Dashboard" },
  { id: "executive-analytics", label: "Executive Analytics" },
  { id: "cross-system", label: "Cross-System" },
  { id: "academic", label: "Academic" },
  { id: "placement", label: "Placement" },
  { id: "industry", label: "Industry" },
  { id: "research", label: "Research & Innovation" },
  { id: "quality", label: "Quality" },
  { id: "outcomes", label: "Outcomes" },
  { id: "alumni", label: "Alumni" },
  { id: "signals", label: "Signals" },
  { id: "insights", label: "Executive Insights" },
  { id: "actions", label: "Action Center" },
  { id: "business-intelligence", label: "Business Intelligence" },
  { id: "copilot", label: "AI Copilot" },
];

const MODULE_LINKS = [
  { label: "Students", href: INSTITUTION_ROUTES.students, key: "students" },
  { label: "Placements", href: INSTITUTION_ROUTES.placements, key: "placement" },
  { label: "Research", href: INSTITUTION_ROUTES.research, key: "research" },
  { label: "Alumni", href: INSTITUTION_ROUTES.alumni, key: "alumni" },
  { label: "Incubation", href: INSTITUTION_ROUTES.incubation, key: "incubation" },
  { label: "Industry", href: INSTITUTION_ROUTES.industryNetwork, key: "industry" },
] as const;

function formatFunding(amount: number) {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function severityBadge(severity: InstitutionSignal["severity"]) {
  const map = {
    high: "secondary",
    attention: "outline",
    info: "muted",
  } as const;
  return map[severity];
}

export function InstitutionCommandCenter() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  const [overview, setOverview] = useState<CommandCenterOverview | null>(null);
  const [executiveAnalytics, setExecutiveAnalytics] = useState<ExecutiveAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CommandTab>("executive");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("all");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionCommandCenterApi.getOverview(token, {
        department: department || undefined,
        period: period !== "all" ? period : undefined,
        academicYear: academicYear || undefined,
        semester: semester || undefined,
        dateFrom: period === "custom" ? dateFrom || undefined : undefined,
        dateTo: period === "custom" ? dateTo || undefined : undefined,
      });
      setOverview(res.overview);
      const analyticsRes = await institutionCommandCenterApi.getAnalytics(token, {
        department: department || undefined,
        period: period !== "all" ? period : undefined,
        academicYear: academicYear || undefined,
        semester: semester || undefined,
      });
      setExecutiveAnalytics(analyticsRes.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load command center");
    } finally {
      setLoading(false);
    }
  }, [token, useLiveApi, department, period, academicYear, semester, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!useLiveApi) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Command center requires live data"
          description="Sign in with an institution account using live MongoDB data to access cross-system intelligence."
        />
      </div>
    );
  }

  if (loading && !overview) return <RouteLoading label="Loading institution intelligence" />;

  const exec = overview?.executive;
  const modules = overview?.modules;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Institution Intelligence"
        title="Command Center"
        description="Unified executive intelligence across students, placements, research, alumni, and industry — derived from live platform records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={INSTITUTION_ROUTES.commandCenterReports} className={buttonVariants({ variant: "outline" })}>
              Report Center
            </Link>
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Institution-wide filters</CardTitle>
          <CardDescription>
            {overview?.timeFilter?.periodLabel
              ? `Active period: ${overview.timeFilter.periodLabel}`
              : "Scope cross-system analytics by time period, department, or academic cohort."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <select
            className="form-control"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Time period"
          >
            {TIME_PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="form-control"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            aria-label="Academic year"
          >
            <option value="">All academic years</option>
            {(overview?.filterOptions?.academicYears ?? []).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="form-control"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            aria-label="Semester"
          >
            <option value="">All semesters</option>
            {(overview?.filterOptions?.semesters ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="form-control"
            placeholder="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            list="cmd-departments"
          />
          <datalist id="cmd-departments">
            {(overview?.filterOptions?.departments ?? []).map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          {period === "custom" ? (
            <>
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
            </>
          ) : null}
          <div className="flex items-end gap-2 xl:col-span-2">
            <Button type="button" onClick={() => void load()} disabled={loading}>
              Apply
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDepartment("");
                setPeriod("all");
                setAcademicYear("");
                setSemester("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {!overview?.hasData ? (
        <EmptyState
          title="No cross-system data yet"
          description="Populate student, placement, research, or alumni modules to activate institution intelligence."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InstitutionMetricCard
              label="Institution Health"
              value={exec?.healthScore ?? 0}
              hint="Composite score from live modules"
              icon={HeartPulse}
            />
            <InstitutionMetricCard
              label="Total Students"
              value={exec?.totalStudents ?? 0}
              hint={`${exec?.activeStudents ?? 0} active`}
              icon={Users}
            />
            <InstitutionMetricCard
              label="Placement Rate"
              value={`${exec?.placementRate ?? 0}%`}
              hint={`${exec?.placedStudents ?? 0} placed`}
              icon={Briefcase}
            />
            <InstitutionMetricCard
              label="Industry Partnerships"
              value={exec?.activePartnerships ?? 0}
              hint="Active company partnerships"
              icon={Building2}
            />
            <InstitutionMetricCard
              label="Research Projects"
              value={exec?.totalResearchProjects ?? 0}
              hint={`${exec?.totalPublications ?? 0} publications`}
              icon={FlaskConical}
            />
            <InstitutionMetricCard
              label="Startup Portfolio"
              value={exec?.startupRegistrations ?? 0}
              hint={`${exec?.activeStartups ?? 0} active in incubation`}
              icon={Rocket}
            />
            <InstitutionMetricCard
              label="Alumni Network"
              value={exec?.totalAlumni ?? 0}
              hint={`${exec?.verifiedAlumni ?? 0} verified`}
              icon={GraduationCap}
            />
            <InstitutionMetricCard
              label="Event Registrations"
              value={exec?.eventRegistrations ?? 0}
              hint="Alumni + innovation events"
              icon={CalendarDays}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {MODULE_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  overview.moduleAvailability[link.key] ? "" : "opacity-60",
                )}
              >
                {link.label}
                {overview.moduleAvailability[link.key] ? (
                  <Badge variant="secondary" className="ml-1">
                    Live
                  </Badge>
                ) : null}
              </Link>
            ))}
          </div>

          <div role="tablist" aria-label="Command center sections" className="flex flex-wrap gap-1 border-b pb-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2",
                  tab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "executive" && exec && overview ? (
            <ExecutiveTab exec={exec} overview={overview} comparisons={overview.comparisons} />
          ) : null}
          {tab === "executive-analytics" && executiveAnalytics ? (
            <ExecutiveAnalyticsTab analytics={executiveAnalytics} />
          ) : null}
          {tab === "cross-system" && modules ? <CrossSystemTab overview={overview} /> : null}
          {tab === "academic" && modules && token ? (
            <AcademicIntelligenceTab
              token={token}
              students={modules.students}
              {...(department ? { department } : {})}
              {...(academicYear ? { academicYear } : {})}
            />
          ) : null}
          {tab === "placement" && modules ? <PlacementTab placement={modules.placement} /> : null}
          {tab === "industry" && overview ? <IndustryTab industry={overview.industryIntelligence} /> : null}
          {tab === "research" && overview ? (
            <ResearchTab research={overview.researchIntelligence} />
          ) : null}
          {tab === "quality" && overview ? <QualityTab quality={overview.qualityIntelligence} /> : null}
          {tab === "outcomes" && overview ? <OutcomesTab outcomes={overview.outcomeIntelligence} /> : null}
          {tab === "alumni" && modules ? <AlumniTab alumni={modules.alumni} engagement={modules.engagement} /> : null}
          {tab === "signals" && overview ? <SignalsTab signals={overview.signals} /> : null}
          {tab === "insights" && overview ? <InsightsTab insights={overview.executiveInsights} /> : null}
          {tab === "actions" && overview ? <ActionsTab actions={overview.actions} /> : null}
          {tab === "business-intelligence" && token ? (
            <InstitutionBiPanel
              token={token}
              {...(department ? { department } : {})}
            />
          ) : null}
          {tab === "copilot" && overview && token ? (
            <div className="space-y-8">
              <CopilotTab insights={overview.copilotInsights} />
              <InstitutionIntelligencePanel
                token={token}
                {...(department ? { department } : {})}
                {...(academicYear ? { academicYear } : {})}
              />
            </div>
          ) : null}
        </>
      )}

      {overview?.generatedAt ? (
        <p className="text-muted-foreground text-xs">
          Last updated: {new Date(overview.generatedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

function ExecutiveTab({
  exec,
  overview,
  comparisons,
}: {
  exec: NonNullable<CommandCenterOverview["executive"]>;
  overview: CommandCenterOverview;
  comparisons: CommandCenterOverview["comparisons"];
}) {
  return (
    <div className="space-y-6">
      <AnalyticsSection title="Overall institution performance" description="Executive KPIs from live module data.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard
            title="Institution Health"
            score={exec.healthScore}
            description="Weighted composite from student, placement, research, and alumni metrics."
          />
          <ScoreCard
            title="Student Success"
            score={exec.placementEligible ? exec.placementRate : 0}
            description={`${exec.placedStudents} placed of ${exec.placementEligible} eligible.`}
          />
          <ScoreCard
            title="Academic Performance"
            score={exec.avgCgpa ? Math.min(100, Math.round((exec.avgCgpa / 10) * 100)) : 0}
            description={`Average CGPA ${exec.avgCgpa || "—"}; attendance ${exec.avgAttendance || "—"}%.`}
          />
          <ScoreCard
            title="Innovation Index"
            score={
              exec.totalResearchProjects
                ? Math.min(100, exec.totalResearchProjects * 5 + exec.startupRegistrations * 3)
                : 0
            }
            description={`${exec.totalResearchProjects} projects; ${exec.startupRegistrations} startups.`}
          />
        </div>
      </AnalyticsSection>

      {comparisons.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Period comparison</CardTitle>
            <CardDescription>Current vs previous compatible period — derived from the same metric definitions.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">Metric</th>
                  <th className="p-2 text-right">Current</th>
                  <th className="p-2 text-right">Previous</th>
                  <th className="p-2 text-right">Change</th>
                  <th className="p-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row) => (
                  <tr key={row.label}>
                    <td className="border-t p-2">{row.label}</td>
                    <td className="border-t p-2 text-right">{row.current}</td>
                    <td className="border-t p-2 text-right">{row.previous}</td>
                    <td className="border-t p-2 text-right">
                      {row.absoluteChange >= 0 ? "+" : ""}
                      {row.absoluteChange}
                    </td>
                    <td className="border-t p-2 text-right">
                      {row.percentageChange >= 0 ? "+" : ""}
                      {row.percentageChange}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionBarChart
          title="Module availability"
          description="Data sources contributing to this overview."
          labels={Object.keys(overview.moduleAvailability)}
          values={Object.values(overview.moduleAvailability).map((v) => (v ? 1 : 0))}
        />
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Executive summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {overview.copilotInsights[0]?.points.map((point, i) => (
              <p key={i}>{point}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CrossSystemTab({ overview }: { overview: CommandCenterOverview }) {
  const { modules } = overview;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InstitutionBarChart
        title="Students by department"
        description="From student intelligence module."
        labels={Object.keys(modules.students.byDepartment).slice(0, 8)}
        values={Object.values(modules.students.byDepartment).slice(0, 8)}
      />
      <InstitutionBarChart
        title="Placement by department"
        description="Applications from placement module."
        labels={Object.keys(modules.placement.byDepartment).slice(0, 8)}
        values={Object.values(modules.placement.byDepartment).slice(0, 8)}
      />
      <InstitutionDistributionChart
        title="Research domains"
        description="Active research projects by domain."
        labels={Object.keys(modules.research.researchDomains).slice(0, 6)}
        values={Object.values(modules.research.researchDomains).slice(0, 6)}
      />
      <InstitutionBarChart
        title="Alumni by industry"
        description="Alumni directory distribution."
        labels={Object.keys(modules.alumni.alumniByIndustry).slice(0, 6)}
        values={Object.values(modules.alumni.alumniByIndustry).slice(0, 6)}
      />
    </div>
  );
}

function AcademicIntelligenceTab({
  token,
  students,
  department,
  academicYear,
}: {
  token: string;
  students: CommandCenterOverview["modules"]["students"];
  department?: string;
  academicYear?: string;
}) {
  const [supportItems, setSupportItems] = useState<SupportSignalItem[]>([]);
  const [programCount, setProgramCount] = useState(0);

  useEffect(() => {
    void Promise.all([
      institutionIntelligenceApi.getSupportSignals(token, { department, academicYear, limit: "8" }),
      institutionIntelligenceApi.getPrograms(token, { department, academicYear }),
    ]).then(([supportRes, programRes]) => {
      setSupportItems(supportRes.support.items || []);
      setProgramCount(programRes.programs.departments?.length || 0);
    }).catch(() => {
      setSupportItems([]);
      setProgramCount(0);
    });
  }, [token, department, academicYear]);

  if (!students.hasData) {
    return <EmptyState title="No student data" description="Register students to populate academic intelligence." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InstitutionMetricCard label="Total Students" value={students.totalStudents} hint="Enrolled" icon={Users} />
        <InstitutionMetricCard label="Active Students" value={students.activeStudents} hint="Active status" icon={Activity} />
        <InstitutionMetricCard label="Average CGPA" value={students.avgCgpa || "—"} hint="Institution average" icon={Award} />
        <InstitutionMetricCard label="Average Attendance" value={`${students.avgAttendance}%`} hint="Institution average" icon={CalendarDays} />
        <InstitutionMetricCard label="Placement Eligible" value={students.placementEligible} hint="Ready to apply" icon={Target} />
        <InstitutionMetricCard label="Placed Students" value={students.placedStudents} hint="Confirmed placements" icon={Briefcase} />
        <InstitutionMetricCard label="Departments Tracked" value={programCount} hint="Program intelligence" icon={BookOpen} />
        <InstitutionMetricCard label="Support Signals" value={supportItems.length} hint="May require review" icon={HeartPulse} />
      </div>

      {supportItems.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Academic support signals</CardTitle>
            <CardDescription>
              Advisory indicators based on configured thresholds — not automatic judgments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {supportItems.slice(0, 8).map((item) => (
              <div key={item.studentId} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.studentName}</p>
                  <Badge variant="outline">{item.department || "—"}</Badge>
                </div>
                <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
                  {item.signals.map((signal) => (
                    <li key={`${item.studentId}-${signal.type}`}>
                      {signal.label}: {signal.detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No support signals"
          description="Students are within configured academic thresholds or insufficient attendance/performance data exists."
        />
      )}
    </div>
  );
}

function PlacementTab({ placement }: { placement: CommandCenterOverview["modules"]["placement"] }) {
  if (!placement.hasData) {
    return <EmptyState title="No placement data" description="Create campus drives or partnerships to populate placement intelligence." />;
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InstitutionMetricCard label="Placement Rate" value={`${placement.placementPercentage}%`} hint="Of eligible students" icon={TrendingUp} />
        <InstitutionMetricCard label="Students Placed" value={placement.studentsPlaced} hint="Confirmed hires" icon={Briefcase} />
        <InstitutionMetricCard label="Eligible Students" value={placement.studentsEligible} hint="Placement pool" icon={Users} />
        <InstitutionMetricCard label="Internships" value={placement.internshipListings} hint="Active listings" icon={GraduationCap} />
        <InstitutionMetricCard
          label="Highest Package"
          value={placement.highestPackage ? formatFunding(placement.highestPackage) : "—"}
          hint="Top offer"
          icon={Award}
        />
        <InstitutionMetricCard
          label="Average Package"
          value={placement.averagePackage ? formatFunding(placement.averagePackage) : "—"}
          hint="Mean CTC"
          icon={BarChart3}
        />
        <InstitutionMetricCard label="Applications" value={placement.applicationsSubmitted} hint="Submitted" icon={Activity} />
        <InstitutionMetricCard label="Campus Drives" value={placement.campusDrives} hint="Recorded drives" icon={Building2} />
      </div>
      <InstitutionBarChart
        title="Placements by department"
        description="Selected/placed students per department."
        labels={Object.keys(placement.byDepartmentPlaced).slice(0, 8)}
        values={Object.values(placement.byDepartmentPlaced).slice(0, 8)}
      />
    </div>
  );
}

function IndustryTab({ industry }: { industry: CommandCenterOverview["industryIntelligence"] }) {
  if (!industry.hasData) {
    return (
      <EmptyState
        title="No industry data"
        description="Establish company partnerships to populate industry intelligence."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InstitutionMetricCard label="Active Partners" value={industry.activeIndustryPartners} hint="Active partnerships" icon={Building2} />
        <InstitutionMetricCard label="Hiring Organizations" value={industry.hiringOrganizations} hint="Linked companies" icon={Briefcase} />
        <InstitutionMetricCard label="Campus Drives" value={industry.campusRecruitmentDrives} hint="Recruitment drives" icon={Target} />
        <InstitutionMetricCard label="Internships" value={industry.internshipOpportunities} hint="Open opportunities" icon={GraduationCap} />
        <InstitutionMetricCard label="Recruitment Partners" value={industry.recruitmentPartners} hint="By relationship type" icon={Users} />
        <InstitutionMetricCard label="Research Partners" value={industry.researchPartners} hint="Collaboration partners" icon={FlaskConical} />
        <InstitutionMetricCard label="Applications" value={industry.applicationsSubmitted} hint="Pipeline volume" icon={Activity} />
        <InstitutionMetricCard label="Offer Acceptance" value={`${industry.offerAcceptanceRate}%`} hint="Accepted offers" icon={TrendingUp} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionBarChart
          title="Department-wise industry participation"
          description="Applications by department."
          labels={Object.keys(industry.byDepartment).slice(0, 8)}
          values={Object.values(industry.byDepartment).slice(0, 8)}
        />
        <InstitutionBarChart
          title="Top hiring organizations"
          description="Applications by company."
          labels={Object.keys(industry.byCompany).slice(0, 8)}
          values={Object.values(industry.byCompany).slice(0, 8)}
        />
      </div>
    </div>
  );
}

function ResearchTab({ research }: { research: CommandCenterOverview["researchIntelligence"] }) {
  if (!research.hasData) {
    return (
      <EmptyState
        title="No research data"
        description="Create research projects or register startups to populate innovation intelligence."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InstitutionMetricCard label="Active Projects" value={research.activeResearchProjects} hint="In progress" icon={FlaskConical} />
        <InstitutionMetricCard label="Publications" value={research.publications} hint="Recorded outputs" icon={BookOpen} />
        <InstitutionMetricCard label="Collaborations" value={research.researchCollaborations} hint="Partnership items" icon={Users} />
        <InstitutionMetricCard label="Innovation Ideas" value={research.innovationIdeas} hint="Submitted ideas" icon={Lightbulb} />
        <InstitutionMetricCard label="Startup Incubation" value={research.startupIncubation} hint="Registered startups" icon={Rocket} />
        <InstitutionMetricCard label="Active Startups" value={research.activeStartups} hint="In incubation" icon={Sparkles} />
        <InstitutionMetricCard label="Mentor Participation" value={research.mentorParticipation} hint="Active mentors" icon={Users} />
        <InstitutionMetricCard label="Funding" value={formatFunding(research.fundingActivities)} hint="Approved/disbursed" icon={TrendingUp} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionDistributionChart
          title="Startup progress"
          description="Startups by incubation stage."
          labels={Object.keys(research.startupProgress).slice(0, 6)}
          values={Object.values(research.startupProgress).slice(0, 6)}
        />
        <InstitutionBarChart
          title="Research domains"
          description="Projects by research domain."
          labels={Object.keys(research.researchDomains).slice(0, 6)}
          values={Object.values(research.researchDomains).slice(0, 6)}
        />
      </div>
    </div>
  );
}

function QualityTab({ quality }: { quality: CommandCenterOverview["qualityIntelligence"] }) {
  if (!quality.hasData) {
    return (
      <EmptyState
        title="No quality records"
        description="Student profiles and partnership documents populate quality intelligence."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InstitutionMetricCard label="Evidence Coverage" value={`${quality.qualityEvidenceCoverage}%`} hint="Documentation complete" icon={BookOpen} />
        <InstitutionMetricCard label="Profile Completeness" value={`${quality.profileCompleteness}%`} hint="Complete profiles" icon={Users} />
        <InstitutionMetricCard label="Certificate Coverage" value={`${quality.certificateCoverage}%`} hint="Verified certificates" icon={Award} />
        <InstitutionMetricCard label="Pending Actions" value={quality.pendingQualityActions} hint="Requires review" icon={Target} />
        <InstitutionMetricCard label="Missing Documents" value={quality.missingStudentDocuments} hint="Student records" icon={BookOpen} />
        <InstitutionMetricCard label="Pending Verifications" value={quality.pendingVerifications} hint="Certs & achievements" icon={Activity} />
        <InstitutionMetricCard label="Partnership Docs" value={quality.partnershipDocuments} hint="Legal documents" icon={Building2} />
        <InstitutionMetricCard label="Expiring Soon" value={quality.expiringPartnershipDocuments} hint="Within 90 days" icon={CalendarDays} />
      </div>
      <InstitutionBarChart
        title="Department compliance"
        description="Student count by department (quality scope)."
        labels={Object.keys(quality.departmentCompliance).slice(0, 8)}
        values={Object.values(quality.departmentCompliance).slice(0, 8)}
      />
    </div>
  );
}

function OutcomesTab({ outcomes }: { outcomes: CommandCenterOverview["outcomeIntelligence"] }) {
  if (!outcomes.hasData) {
    return <EmptyState title="No outcome data" description="Populate student, placement, and alumni modules to measure outcomes." />;
  }

  const sections = [
    { title: "Student Success", data: outcomes.studentSuccess },
    { title: "Placement Outcomes", data: outcomes.placementOutcomes },
    { title: "Internship Activity", data: outcomes.internshipCompletion },
    { title: "Research Output", data: outcomes.researchOutput },
    { title: "Startup Growth", data: outcomes.startupGrowth },
    { title: "Industry Participation", data: outcomes.industryParticipation },
    { title: "Alumni Engagement", data: outcomes.alumniEngagement },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {Object.entries(section.data).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="font-medium">{typeof value === "number" && key.toLowerCase().includes("package") ? formatFunding(value) : String(value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AlumniTab({
  alumni,
  engagement,
}: {
  alumni: CommandCenterOverview["modules"]["alumni"];
  engagement: CommandCenterOverview["modules"]["engagement"];
}) {
  if (!alumni.hasData) {
    return <EmptyState title="No alumni data" description="Register alumni profiles to populate community intelligence." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InstitutionMetricCard label="Total Alumni" value={alumni.totalAlumni} hint="Directory profiles" icon={Users} />
        <InstitutionMetricCard label="Verified" value={alumni.verifiedAlumni} hint="Verified profiles" icon={Award} />
        <InstitutionMetricCard label="Active Mentorships" value={alumni.mentorshipParticipation.activeMentorships} hint="Matched or active" icon={GraduationCap} />
        <InstitutionMetricCard label="Career Referrals" value={alumni.referralActivity.totalReferrals} hint="Published referrals" icon={Briefcase} />
        <InstitutionMetricCard label="Community Groups" value={alumni.communityGroups} hint="Active groups" icon={Building2} />
        <InstitutionMetricCard label="Volunteer Hours" value={alumni.volunteerEngagement.totalHours} hint="Total contributed" icon={HeartPulse} />
        <InstitutionMetricCard label="Event Registrations" value={alumni.eventParticipation.totalRegistrations} hint="Alumni events" icon={CalendarDays} />
        <InstitutionMetricCard label="Donations Approved" value={alumni.donationsContributions.approvedRecords} hint="Approved records" icon={TrendingUp} />
      </div>
      {engagement?.hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>30-day engagement</CardTitle>
            <CardDescription>Recent alumni community activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
            <p>New registrations: {engagement.newRegistrations}</p>
            <p>Discussion posts: {engagement.discussionPosts}</p>
            <p>Career applications: {engagement.careerApplications}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SignalsTab({ signals }: { signals: CommandCenterOverview["signals"] }) {
  if (!signals.length) {
    return (
      <EmptyState
        title="No institution signals"
        description="All monitored dimensions are within normal parameters based on available data."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {signals.map((signal, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityBadge(signal.severity)}>{signal.severity}</Badge>
              <Badge variant="outline">{signal.category}</Badge>
              <CardTitle className="text-base">{signal.title}</CardTitle>
            </div>
            <CardDescription>{signal.timePeriod}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Trigger:</span> {signal.trigger}
            </p>
            <p>
              <span className="font-medium">Supporting records:</span> {signal.supportingRecords}
            </p>
            <p>
              <span className="font-medium">Suggested action:</span> {signal.suggestedAction}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InsightsTab({ insights }: { insights: CommandCenterOverview["executiveInsights"] }) {
  if (!insights.length) {
    return <EmptyState title="No executive insights" description="Insufficient cross-module data for deterministic insights." />;
  }

  return (
    <div className="grid gap-4">
      {insights.map((insight, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{insight.category}</Badge>
              <CardTitle className="text-base">{insight.title}</CardTitle>
            </div>
            <CardDescription>{insight.timePeriod}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="font-medium">What happened:</span> {insight.whatHappened}
            </p>
            <p>
              <span className="font-medium">Why it matters:</span> {insight.whyItMatters}
            </p>
            <p>
              <span className="font-medium">Supporting data:</span> {insight.supportingData}
            </p>
            <ul className="list-disc pl-5">
              {insight.suggestedActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActionsTab({ actions }: { actions: ExecutiveAction[] }) {
  if (!actions.length) {
    return <EmptyState title="No actions recommended" description="No executive actions identified from current institution data." />;
  }

  return (
    <div className="grid gap-3">
      {actions.map((action, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge variant={action.priority === "high" ? "secondary" : action.priority === "medium" ? "outline" : "muted"}>
                {action.priority}
              </Badge>
              <CardTitle className="text-base">{action.title}</CardTitle>
            </div>
            <CardDescription>
              {action.domain} · {action.source}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p>{action.rationale}</p>
            <Link href={action.route} className={buttonVariants({ size: "sm" })}>
              Open module
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExecutiveAnalyticsTab({ analytics }: { analytics: ExecutiveAnalytics }) {
  const formatMetricValue = (key: string, value: unknown) => {
    if (typeof value !== "number") return String(value ?? "—");
    if (key.toLowerCase().includes("package") || key.toLowerCase().includes("funding")) return formatFunding(value);
    if (key.toLowerCase().includes("rate") || key.toLowerCase().includes("attendance") || key.toLowerCase().includes("coverage")) {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  const metricSections = [
    { title: "Overall Institutional Performance", data: analytics.overallInstitutionalPerformance, icon: Building2 },
    { title: "Academic Performance", data: analytics.academicPerformance as Record<string, unknown>, icon: GraduationCap },
    { title: "Student Success Metrics", data: analytics.studentSuccessMetrics, icon: Users },
    { title: "Faculty Performance", data: analytics.facultyPerformance, icon: BookOpen },
    { title: "Placement Statistics", data: analytics.placementStatistics as Record<string, unknown>, icon: Briefcase },
    { title: "Internship Statistics", data: analytics.internshipStatistics, icon: Target },
    { title: "Research Productivity", data: analytics.researchProductivity, icon: FlaskConical },
    { title: "Innovation Performance", data: analytics.innovationPerformance, icon: Lightbulb },
    { title: "Startup Growth", data: analytics.startupGrowth, icon: Rocket },
    { title: "Alumni Engagement", data: analytics.alumniEngagement, icon: GraduationCap },
  ] as const;

  if (!analytics.hasData) {
    return (
      <EmptyState
        title="No executive analytics data"
        description="Populate institution modules to generate executive analytics from live records."
      />
    );
  }

  const deptLabels = Object.keys(analytics.departmentWisePerformance).slice(0, 10);
  const deptPlacementRates = deptLabels.map((d) => analytics.departmentWisePerformance[d]?.placementRate ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          title="Institutional Health Score"
          score={analytics.institutionalHealthScore}
          description="Composite score from live cross-system records"
        />
        <InstitutionMetricCard
          label="Strategic KPIs"
          value={analytics.strategicKPIs.length}
          hint="Tracked executive indicators"
          icon={TrendingUp}
        />
        <InstitutionMetricCard
          label="Departments"
          value={deptLabels.length}
          hint="With performance data"
          icon={Building2}
        />
        <InstitutionMetricCard
          label="Active Signals"
          value={analytics.signals.length}
          hint="Requires attention"
          icon={Activity}
        />
      </div>

      <AnalyticsSection
        title="Strategic KPIs"
        description="Executive key performance indicators with period-over-period comparison where available."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {analytics.strategicKPIs.map((kpi) => (
            <Card key={kpi.id}>
              <CardHeader className="pb-2">
                <Badge variant="outline" className="w-fit">
                  {kpi.category}
                </Badge>
                <CardTitle className="text-base">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-2xl font-semibold">
                  {kpi.unit === "currency"
                    ? formatFunding(kpi.value)
                    : kpi.unit === "percent"
                      ? `${kpi.value}%`
                      : kpi.value.toLocaleString()}
                </p>
                {kpi.percentageChange !== undefined ? (
                  <p className={cn("text-xs", kpi.percentageChange >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {kpi.percentageChange >= 0 ? "+" : ""}
                    {kpi.percentageChange}% vs previous period
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </AnalyticsSection>

      <div className="grid gap-4 lg:grid-cols-2">
        {metricSections.map((section) => {
          const Icon = section.icon;
          const entries = Object.entries(section.data || {}).filter(
            ([key]) => !["byDepartment", "bySemester", "byProgram", "byDepartmentPlaced"].includes(key),
          );
          if (!entries.length) return null;
          return (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="text-primary size-5" aria-hidden="true" />
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {entries.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    <span className="font-medium">{formatMetricValue(key, value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Industry Engagement</CardTitle>
          <CardDescription>Live industry partnership and recruitment intelligence.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InstitutionMetricCard
            label="Active Partners"
            value={analytics.industryEngagement.activeIndustryPartners}
            hint="Industry partnerships"
            icon={Building2}
          />
          <InstitutionMetricCard
            label="Applications"
            value={analytics.industryEngagement.applicationsSubmitted}
            hint="Recruitment applications"
            icon={Briefcase}
          />
          <InstitutionMetricCard
            label="Students Placed"
            value={analytics.industryEngagement.studentsPlaced}
            hint="Via industry network"
            icon={Users}
          />
          <InstitutionMetricCard
            label="Open Jobs"
            value={analytics.industryEngagement.openJobs}
            hint="Active opportunities"
            icon={Target}
          />
        </CardContent>
      </Card>

      {deptLabels.length ? (
        <InstitutionBarChart
          title="Department-wise placement rate"
          description="Placement rate by department from live student and placement records."
          labels={deptLabels}
          values={deptPlacementRates}
        />
      ) : null}

      {deptLabels.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department-wise performance</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="border-b p-2 text-left">Department</th>
                  <th className="border-b p-2 text-right">Enrolled</th>
                  <th className="border-b p-2 text-right">Placed</th>
                  <th className="border-b p-2 text-right">Applications</th>
                  <th className="border-b p-2 text-right">Placement Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.departmentWisePerformance).map(([dept, row]) => (
                  <tr key={dept}>
                    <td className="border-b p-2">{dept}</td>
                    <td className="border-b p-2 text-right">{row.enrolled}</td>
                    <td className="border-b p-2 text-right">{row.placed}</td>
                    <td className="border-b p-2 text-right">{row.applications}</td>
                    <td className="border-b p-2 text-right">{row.placementRate}%</td>
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

function CopilotTab({ insights }: { insights: CommandCenterOverview["copilotInsights"] }) {
  return (
    <AnalyticsSection
      title="AI Executive Copilot"
      description="Rule-based executive briefings derived exclusively from live platform records — no estimated statistics."
    >
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <AiInsightCard
            key={insight.title}
            title={insight.title}
            description={`${insight.type} intelligence`}
            badge={insight.type}
            points={insight.points}
          />
        ))}
      </div>
    </AnalyticsSection>
  );
}

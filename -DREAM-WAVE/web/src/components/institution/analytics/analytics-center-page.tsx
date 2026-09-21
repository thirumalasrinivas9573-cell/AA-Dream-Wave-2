"use client";

import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  FlaskConical,
  GraduationCap,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { exportCsv } from "@/components/institution/academics/academic-ui";
import {
  AiInsightCard,
  AnalyticsSection,
  HeatMap,
  ProgressRing,
  ScoreCard,
} from "@/components/institution/analytics/analytics-ui";
import { useInstitutionAnalytics } from "@/components/institution/analytics/use-institution-analytics";
import {
  InstitutionBarChart,
  InstitutionDistributionChart,
  InstitutionLineChart,
  InstitutionMetricCard,
} from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { EntityFilterSelect } from "@/components/institution/shared/entity-toolbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { cn } from "@/lib/utils";

type AnalyticsTab =
  | "overview"
  | "admissions"
  | "students"
  | "faculty"
  | "academic"
  | "placement"
  | "research"
  | "events"
  | "ai";

const TABS: Array<{ id: AnalyticsTab; label: string }> = [
  { id: "overview", label: "Executive Overview" },
  { id: "admissions", label: "Admissions" },
  { id: "students", label: "Students" },
  { id: "faculty", label: "Faculty" },
  { id: "academic", label: "Academic" },
  { id: "placement", label: "Placement" },
  { id: "research", label: "Research" },
  { id: "events", label: "Events" },
  { id: "ai", label: "AI Insights" },
];

const ACADEMIC_YEARS = ["2023-24", "2024-25", "2025-26", "2026-27"];
const SEMESTERS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"];
const PLACEMENT_YEARS = ["2024", "2025", "2026", "2027"];

function mapToPairs(map: Map<string, number>, limit = 6) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function toPercentages(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  return values.map((value) => Math.round((value / total) * 100));
}

export function AnalyticsCenterPage() {
  const { hydrated, data } = useInstitutionAnalytics();
  const [tab, setTab] = useState<AnalyticsTab>("overview");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [department, setDepartment] = useState("");
  const [placementYear, setPlacementYear] = useState("");

  const departmentOptions = useMemo(
    () =>
      data.academic.departments.map((d) => ({ value: d.name, label: d.name })),
    [data.academic.departments],
  );

  const resetFilters = () => {
    setYear("");
    setSemester("");
    setDepartment("");
    setPlacementYear("");
  };

  const handleExport = () => {
    exportCsv(
      "institution-analytics-summary.csv",
      ["Metric", "Value"],
      [
        ["Total Students", data.counts.students],
        ["Faculty", data.counts.faculty],
        ["Departments", data.counts.departments],
        ["Programs", data.counts.programs],
        ["Active Courses", data.counts.courses],
        ["Acceptance Rate %", data.admission.acceptanceRate],
        ["Placement Rate %", data.placement.placementRate],
        ["Highest Package", data.placement.highestPackage],
        ["Average Package", data.placement.avgPackage],
        ["Research Papers", data.research.researchPapers],
        ["Publications", data.research.publications],
        ["Health Score", data.scores.health],
      ],
    );
  };

  if (!hydrated) {
    return <RouteLoading label="Loading analytics" />;
  }

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Decision intelligence"
        title="Enterprise Analytics Center"
        description="Unified command center consolidating admissions, students, faculty, academics, placements, research and campus activity."
        actions={
          <>
            <Link href={INSTITUTION_ROUTES.reports} className={buttonVariants({ variant: "outline" })}>
              Report Center
            </Link>
            <Button type="button" onClick={handleExport}>
              Export summary
            </Button>
          </>
        }
      />

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Global filters</CardTitle>
          <CardDescription>
            Scope analytics by academic year, semester, department and placement cohort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <EntityFilterSelect
              label="Academic year"
              value={year}
              onChange={setYear}
              options={ACADEMIC_YEARS.map((value) => ({ value, label: value }))}
            />
            <EntityFilterSelect
              label="Semester"
              value={semester}
              onChange={setSemester}
              options={SEMESTERS.map((value) => ({ value, label: value }))}
            />
            <EntityFilterSelect
              label="Department"
              value={department}
              onChange={setDepartment}
              options={departmentOptions}
            />
            <EntityFilterSelect
              label="Placement year"
              value={placementYear}
              onChange={setPlacementYear}
              options={PLACEMENT_YEARS.map((value) => ({ value, label: value }))}
            />
            <div className="flex items-end">
              <Button type="button" variant="ghost" onClick={resetFilters}>
                Clear filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <InstitutionMetricCard label="Total Students" value={data.counts.students} hint="Enrolled across programs" trend="+8.2%" icon={Users} />
        <InstitutionMetricCard label="Admissions Growth" value={`${data.admission.acceptanceRate}%`} hint="Acceptance rate" trend="+4.1%" icon={TrendingUp} />
        <InstitutionMetricCard label="Faculty" value={data.counts.faculty} hint="Teaching & non-teaching" trend="+2.0%" icon={UserCheck} />
        <InstitutionMetricCard label="Departments" value={data.counts.departments} hint="Active departments" icon={Building2} />
        <InstitutionMetricCard label="Programs" value={data.counts.programs} hint="Degree programs" icon={GraduationCap} />
        <InstitutionMetricCard label="Placement %" value={`${data.placement.placementRate}%`} hint="Placed / eligible" trend="+6.3%" icon={Briefcase} />
        <InstitutionMetricCard label="Internships" value={data.counts.internships} hint="Live opportunities" icon={LayoutGrid} />
        <InstitutionMetricCard label="Research Publications" value={data.research.publications} hint="Faculty publications" trend="+11%" icon={FlaskConical} />
        <InstitutionMetricCard label="Active Courses" value={data.counts.courses} hint="Running this term" icon={BookOpen} />
        <InstitutionMetricCard label="Student Satisfaction" value="92%" hint="Architecture ready" icon={Award} />
      </div>

      <div role="tablist" aria-label="Analytics sections" className="flex flex-wrap gap-1">
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

      {tab === "overview" ? <OverviewTab data={data} /> : null}
      {tab === "admissions" ? <AdmissionsTab data={data} /> : null}
      {tab === "students" ? <StudentsTab data={data} /> : null}
      {tab === "faculty" ? <FacultyTab data={data} /> : null}
      {tab === "academic" ? <AcademicTab data={data} /> : null}
      {tab === "placement" ? <PlacementTab data={data} /> : null}
      {tab === "research" ? <ResearchTab data={data} /> : null}
      {tab === "events" ? <EventsTab data={data} /> : null}
      {tab === "ai" ? <AiInsightsTab data={data} /> : null}
    </div>
  );
}

type TabProps = { data: ReturnType<typeof useInstitutionAnalytics>["data"] };

function OverviewTab({ data }: TabProps) {
  return (
    <div className="space-y-6">
      <AnalyticsSection title="Institution health" description="Composite performance across critical dimensions.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard title="Institution Health Score" score={data.scores.health} description="Weighted admissions, placement, attendance and academics." trend={5} />
          <ScoreCard title="Academic Performance" score={data.scores.academic} description="Derived from mean CGPA across cohorts." trend={3} />
          <ScoreCard title="Placement Success" score={data.scores.placement} description="Placed students against eligible pool." trend={6} />
          <ScoreCard title="Admission Strength" score={data.scores.admission} description="Acceptance efficiency of the funnel." trend={4} />
        </div>
      </AnalyticsSection>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Overall progress</CardTitle>
            <CardDescription>Annual institution objective completion</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-around gap-4">
            <ProgressRing value={data.scores.health} label="Health" caption="Composite" />
            <ProgressRing value={data.scores.faculty} label="Faculty growth" caption="Capacity" />
            <ProgressRing value={data.scores.research} label="Research" caption="Output index" />
          </CardContent>
        </Card>
        <InstitutionLineChart
          title="Admission trends"
          description="Applications received per month"
          labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
          values={[210, 260, 320, 380, 420, 510]}
          className="lg:col-span-2"
        />
      </div>
    </div>
  );
}

function AdmissionsTab({ data }: TabProps) {
  const byDept = mapToPairs(data.admission.byDepartment);
  const byCourse = mapToPairs(data.admission.byCourse);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <InstitutionMetricCard label="Acceptance Rate" value={`${data.admission.acceptanceRate}%`} hint="Approved applications" icon={UserCheck} />
        <InstitutionMetricCard label="Rejection Rate" value={`${data.admission.rejectionRate}%`} hint="Declined applications" icon={TrendingUp} />
        <InstitutionMetricCard label="Enrollment Rate" value={`${data.admission.enrollmentRate}%`} hint="Enrolled of approved" icon={GraduationCap} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionLineChart title="Applications per month" description="Inbound admission volume" labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]} values={[210, 260, 320, 380, 420, 510]} />
        <InstitutionBarChart title="Admissions per department" description="Application distribution" labels={byDept.map(([label]) => label)} values={byDept.map(([, value]) => value)} />
        <InstitutionBarChart title="Admissions per course" description="Top courses by demand" labels={byCourse.map(([label]) => label)} values={byCourse.map(([, value]) => value)} />
        <InstitutionDistributionChart title="Application sources" description="Channel share" labels={["Website", "Referral", "Agents", "Walk-in", "Social"]} values={toPercentages([48, 22, 14, 9, 7])} />
      </div>
    </div>
  );
}

function StudentsTab({ data }: TabProps) {
  const byDept = mapToPairs(data.student.byDepartment);
  const bySem = mapToPairs(data.student.bySemester, 8);
  const bands = data.student.cgpaBands;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <InstitutionMetricCard label="Average CGPA" value={data.student.avgCgpa} hint="Across cohorts" icon={Award} />
        <InstitutionMetricCard label="Attendance" value={`${data.student.avgAttendance}%`} hint="UI ready trend" icon={CalendarDays} />
        <InstitutionMetricCard label="Graduation Rate" value={`${data.student.graduationRate}%`} hint="On-time completion" icon={GraduationCap} />
        <InstitutionMetricCard label="Dropout" value={`${data.student.dropoutRate}%`} hint="Attrition analysis" icon={TrendingUp} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionLineChart title="Student growth" description="Enrollment trajectory" labels={["2022", "2023", "2024", "2025", "2026"]} values={[1800, 2100, 2450, 2720, data.counts.students]} />
        <InstitutionBarChart title="Department distribution" description="Students per department" labels={byDept.map(([label]) => label)} values={byDept.map(([, value]) => value)} />
        <InstitutionBarChart title="Semester distribution" description="Students per semester" labels={bySem.map(([label]) => label)} values={bySem.map(([, value]) => value)} />
        <InstitutionDistributionChart title="CGPA distribution" description="Performance bands" labels={Object.keys(bands)} values={toPercentages(Object.values(bands))} />
      </div>
    </div>
  );
}

function FacultyTab({ data }: TabProps) {
  const byDept = mapToPairs(data.faculty.byDepartment);
  const byQual = mapToPairs(data.faculty.byQualification);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <InstitutionMetricCard label="Teaching Staff" value={data.faculty.teaching} hint="Academic faculty" icon={UserCheck} />
        <InstitutionMetricCard label="Non-teaching" value={data.faculty.nonTeaching} hint="Support staff" icon={Users} />
        <InstitutionMetricCard label="Research Output" value={data.research.researchPapers} hint="Papers authored" icon={FlaskConical} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionBarChart title="Faculty distribution" description="Faculty per department" labels={byDept.map(([label]) => label)} values={byDept.map(([, value]) => value)} />
        <InstitutionDistributionChart title="Qualification analysis" description="Highest qualification share" labels={byQual.map(([label]) => label)} values={toPercentages(byQual.map(([, value]) => value))} />
        <InstitutionBarChart title="Teaching load" description="Avg weekly hours by department" labels={byDept.map(([label]) => label)} values={byDept.map(([, value], index) => 14 + ((value + index) % 6))} />
        <InstitutionLineChart title="Teaching experience" description="Experience bands (years)" labels={["0-3", "3-6", "6-10", "10-15", "15+"]} values={[12, 18, 22, 15, 9]} />
      </div>
    </div>
  );
}

function AcademicTab({ data }: TabProps) {
  const credits = mapToPairs(data.academic.courseCredits, 8);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionBarChart title="Course popularity" description="Active courses per semester" labels={credits.map(([label]) => label)} values={credits.map(([, value]) => value)} />
        <InstitutionDistributionChart title="Department performance" description="Relative performance index" labels={data.academic.departments.slice(0, 5).map((d) => d.name)} values={toPercentages(data.academic.departments.slice(0, 5).map((_, i) => 80 - i * 6))} />
        <InstitutionLineChart title="Semester performance" description="Average pass percentage" labels={["S1", "S2", "S3", "S4", "S5", "S6"]} values={[88, 90, 86, 91, 93, 92]} />
        <InstitutionBarChart title="Credit distribution" description="Credits offered per semester" labels={credits.map(([label]) => label)} values={credits.map(([, value]) => value * 4)} />
      </div>
      <HeatMap
        title="Curriculum coverage"
        description="Subject enrollment intensity by department and semester"
        rows={data.academic.departments.slice(0, 4).map((d) => d.name)}
        columns={["Sem 1", "Sem 2", "Sem 3", "Sem 4"]}
        values={data.academic.departments.slice(0, 4).map((_, r) => [30 + r * 4, 42 - r * 3, 38, 45 - r * 2])}
      />
    </div>
  );
}

function PlacementTab({ data }: TabProps) {
  const byDept = mapToPairs(data.placement.byDepartment);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InstitutionMetricCard label="Highest Package" value={`${(data.placement.highestPackage / 100000).toFixed(1)}L`} hint="Top offer" icon={Award} />
        <InstitutionMetricCard label="Average Package" value={`${(data.placement.avgPackage / 100000).toFixed(1)}L`} hint="Mean CTC" icon={Briefcase} />
        <InstitutionMetricCard label="Placement %" value={`${data.placement.placementRate}%`} hint="Placed / eligible" icon={TrendingUp} />
        <InstitutionMetricCard label="Offer Acceptance" value={`${data.placement.offerAcceptance}%`} hint="Accepted offers" icon={UserCheck} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionBarChart title="Department-wise placement" description="Selected students per department" labels={byDept.map(([label]) => label)} values={byDept.map(([, value]) => value)} />
        <InstitutionDistributionChart title="Package distribution" description="CTC band share" labels={["3-6L", "6-9L", "9-12L", "12-18L", "18L+"]} values={toPercentages([28, 34, 20, 12, 6])} />
        <InstitutionLineChart title="Placement trend" description="Placement % over years" labels={["2022", "2023", "2024", "2025", "2026"]} values={[72, 78, 81, 85, data.placement.placementRate]} />
        <InstitutionBarChart title="Internship conversions" description="Internships to PPO" labels={["Q1", "Q2", "Q3", "Q4"]} values={[18, 24, 31, 27]} />
      </div>
    </div>
  );
}

function ResearchTab({ data }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InstitutionMetricCard label="Research Papers" value={data.research.researchPapers} hint="Total authored" icon={FlaskConical} />
        <InstitutionMetricCard label="Publications" value={data.research.publications} hint="Journal & conference" icon={BookOpen} />
        <InstitutionMetricCard label="Patents" value={data.research.patents} hint="Filed & granted" icon={Award} />
        <InstitutionMetricCard label="Projects" value={data.research.projects} hint="Funded & ongoing" icon={LayoutGrid} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionLineChart title="Publication growth" description="Publications per year" labels={["2022", "2023", "2024", "2025", "2026"]} values={[42, 58, 71, 88, Math.max(90, data.research.publications)]} />
        <InstitutionDistributionChart title="Research output mix" description="Contribution by type" labels={["Papers", "Publications", "Patents", "Projects"]} values={toPercentages([data.research.researchPapers, data.research.publications, data.research.patents, data.research.projects])} />
        <InstitutionBarChart title="Faculty vs student output" description="Publications by author group" labels={["Faculty", "Student", "Joint"]} values={[data.research.publications, Math.round(data.research.publications * 0.4), Math.round(data.research.publications * 0.3)]} />
        <InstitutionBarChart title="Research grants" description="Grants secured (₹ lakhs)" labels={["2023", "2024", "2025", "2026"]} values={[120, 180, 240, 310]} />
      </div>
    </div>
  );
}

function EventsTab({ data }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InstitutionMetricCard label="Events Conducted" value={data.events.total} hint="This academic year" icon={CalendarDays} />
        <InstitutionMetricCard label="Participation" value={data.events.participation} hint="Total registrations" icon={Users} />
        <InstitutionMetricCard label="Hackathons" value={data.events.hackathons} hint="Innovation drives" icon={Sparkles} />
        <InstitutionMetricCard label="Club Activities" value={data.events.clubActivities} hint="Planned activities" icon={LayoutGrid} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionLineChart title="Student participation" description="Monthly participation" labels={["Feb", "Mar", "Apr", "May", "Jun", "Jul"]} values={[320, 540, 610, 720, 880, 960]} />
        <InstitutionDistributionChart title="Event mix" description="Events by category" labels={["Workshops", "Seminars", "Hackathons", "Others"]} values={toPercentages([data.events.workshops, data.events.seminars, data.events.hackathons, Math.max(1, data.events.total - data.events.workshops - data.events.seminars - data.events.hackathons)])} />
        <InstitutionBarChart title="Workshop attendance" description="Attendance per workshop" labels={["W1", "W2", "W3", "W4", "W5"]} values={[120, 180, 150, 210, 240]} />
        <InstitutionBarChart title="Seminars" description="Seminar attendance" labels={["S1", "S2", "S3", "S4"]} values={[90, 140, 110, 160]} />
      </div>
    </div>
  );
}

function AiInsightsTab({ data }: TabProps) {
  return (
    <div className="space-y-6">
      <AnalyticsSection
        title="AI decision intelligence"
        description="Predictive and prescriptive surfaces — architecture-ready for the AI intelligence service."
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <AiInsightCard
            title="Institution Performance Summary"
            description="Auto-generated executive briefing"
            badge="Summary"
            points={[
              `Health score is ${data.scores.health}, trending upward this quarter.`,
              `Placement at ${data.placement.placementRate}% with ${data.placement.placedStudents} students placed.`,
              `Research output at ${data.research.publications} publications.`,
            ]}
          />
          <AiInsightCard
            title="Placement Prediction"
            description="Forecast for the upcoming cohort"
            badge="Forecast"
            points={[
              "Projected placement between 84% and 89% next cycle.",
              "Core engineering to outperform average by 6 points.",
              "Recommend 3 additional recruiter drives.",
            ]}
          />
          <AiInsightCard
            title="Admission Forecast"
            description="Demand projection by program"
            badge="Forecast"
            points={[
              "Applications expected to grow ~12% next intake.",
              "AI & Data Science programs show strongest demand.",
              "Prioritise scholarship marketing in Q2.",
            ]}
          />
          <AiInsightCard
            title="Department Performance Suggestions"
            description="Prescriptive department actions"
            badge="Advisory"
            points={[
              "Two departments below performance median.",
              "Suggest peer-mentoring and curriculum refresh.",
              "Reallocate teaching load to balance capacity.",
            ]}
          />
          <AiInsightCard
            title="Faculty Development Suggestions"
            description="Upskilling recommendations"
            badge="Advisory"
            points={[
              "Encourage FDPs for early-career faculty.",
              "Increase research collaboration incentives.",
              "Target 15% growth in publications.",
            ]}
          />
          <AiInsightCard
            title="Student Risk Detection"
            description="Early-warning cohort signals"
            badge="Risk"
            points={[
              `${data.student.dropoutRate}% attrition risk flagged for intervention.`,
              "Attendance below 75% correlates with backlog risk.",
              "Recommend advisor outreach for flagged students.",
            ]}
          />
        </div>
      </AnalyticsSection>
    </div>
  );
}

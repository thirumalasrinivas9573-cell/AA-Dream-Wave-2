"use client";

import {
  Award,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileBarChart,
  GraduationCap,
  Megaphone,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPartnershipDashboardWidget } from "@/components/institution/partnerships/institution-partnership-dashboard-widget";
import { InstitutionPlacementDashboardWidget } from "@/components/institution/placements/placement-dashboard-widget";
import {
  InstitutionActivityList,
  InstitutionBarChart,
  InstitutionDistributionChart,
  InstitutionLineChart,
  InstitutionMetricCard,
  InstitutionQuickAction,
} from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import {
  INSTITUTION_ANALYTICS,
  INSTITUTION_DASHBOARD_METRICS,
  INSTITUTION_NOTICE_GROUPS,
  INSTITUTION_QUICK_ACTIONS,
  INSTITUTION_RECENT_ACTIVITY,
} from "@/constants/institution-dashboard";
import { institutionStudentsApi, type StudentStats } from "@/lib/api/institution-students";
import {
  institutionFoundationApi,
  type InstitutionFoundationDashboard,
} from "@/lib/api/institution-foundation";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { cn } from "@/lib/utils";
import { useInstitutionStore } from "@/store/institution-store";

export function InstitutionDashboardPage() {
  const { token } = useAuth();
  const hydrated = useInstitutionStore((state) => state.hydrated);
  const hydrate = useInstitutionStore((state) => state.hydrate);
  const profile = useInstitutionStore((state) => state.profile);
  const departments = useInstitutionStore((state) => state.departments);
  const courses = useInstitutionStore((state) => state.courses);
  const students = useInstitutionStore((state) => state.students);
  const teachers = useInstitutionStore((state) => state.teachers);

  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();
  const [liveStats, setLiveStats] = useState<StudentStats | null>(null);
  const [foundationDashboard, setFoundationDashboard] = useState<InstitutionFoundationDashboard | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!useLiveApi || !token) return;
    setStatsLoading(true);
    void Promise.all([
      institutionStudentsApi.getStats(token),
      institutionFoundationApi.getDashboard(token),
    ])
      .then(([statsRes, dashboardRes]) => {
        setLiveStats(statsRes.stats);
        setFoundationDashboard(dashboardRes.dashboard);
      })
      .finally(() => setStatsLoading(false));
  }, [useLiveApi, token]);

  const totals = useMemo(() => {
    const departmentStudents = departments.reduce(
      (total, department) => total + department.studentCount,
      0,
    );
    const departmentFaculty = departments.reduce(
      (total, department) => total + department.facultyCount,
      0,
    );

    return {
      students: liveStats?.total ?? Math.max(students.length, departmentStudents),
      faculty: Math.max(teachers.length, departmentFaculty),
      activeCourses: courses.filter((course) => course.status === "active").length,
    };
  }, [courses, departments, liveStats?.total, students.length, teachers.length]);

  const activityItems = useMemo(() => {
    if (liveStats?.recentActivity?.length) {
      return liveStats.recentActivity.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        detail: item.detail,
      }));
    }
    return INSTITUTION_RECENT_ACTIVITY;
  }, [liveStats?.recentActivity]);

  const departmentChart = useMemo(() => {
    if (liveStats?.byDepartment && Object.keys(liveStats.byDepartment).length) {
      const labels = Object.keys(liveStats.byDepartment);
      return {
        labels,
        values: labels.map((l) => liveStats.byDepartment[l] ?? 0),
      };
    }
    return INSTITUTION_ANALYTICS.departments;
  }, [liveStats?.byDepartment]);

  if (!hydrated) {
    return <RouteLoading label="Loading institution dashboard" />;
  }

  const metrics = [
    {
      label: "Total Students",
      value: (foundationDashboard?.students.total ?? totals.students).toLocaleString(),
      hint: useLiveApi ? "Live institution records" : "Across all active programs",
      ...(useLiveApi && foundationDashboard ? {} : liveStats ? {} : { trend: "+6.8%" }),
      icon: GraduationCap,
    },
    {
      label: "Total Faculty",
      value: (foundationDashboard?.faculty?.total ?? (useLiveApi ? 0 : totals.faculty)).toLocaleString(),
      hint: useLiveApi ? "Institution members with faculty roles" : "Academic and visiting faculty",
      ...(useLiveApi ? {} : { trend: "+4" }),
      icon: Users,
    },
    {
      label: "Departments",
      value: foundationDashboard?.organization.departments ?? departments.length,
      hint: "Academic units",
      icon: Building2,
    },
    {
      label: "Programs",
      value: foundationDashboard?.organization.programs ?? totals.activeCourses,
      hint: useLiveApi ? "Registered institution programs" : "Active programs",
      icon: BookOpen,
    },
    {
      label: "Admissions",
      value: foundationDashboard?.admissions.totalApplications ?? (useLiveApi ? 0 : INSTITUTION_DASHBOARD_METRICS.admissions),
      hint: useLiveApi ? "Enrolled student records" : "Current intake cycle",
      ...(useLiveApi ? {} : { trend: "+12.4%" }),
      icon: UserCheck,
    },
    {
      label: "Placement Rate",
      value: foundationDashboard?.students.placementRate !== undefined
        ? `${foundationDashboard.students.placementRate}%`
        : liveStats?.placedStudents && liveStats.total
          ? `${Math.round((liveStats.placedStudents / liveStats.total) * 100)}%`
          : useLiveApi
            ? "0%"
            : `${INSTITUTION_DASHBOARD_METRICS.placementRate}%`,
      hint: useLiveApi ? "From live student and placement records" : "Graduating cohort",
      ...(useLiveApi ? {} : liveStats ? {} : { trend: "+3.2%" }),
      icon: TrendingUp,
    },
    {
      label: "Internships",
      value: foundationDashboard?.placements.internships ?? (useLiveApi ? 0 : INSTITUTION_DASHBOARD_METRICS.internships),
      hint: "Active internship opportunities",
      icon: BriefcaseBusiness,
    },
    {
      label: "Research Projects",
      value: foundationDashboard?.research.activeProjects ?? (useLiveApi ? 0 : INSTITUTION_DASHBOARD_METRICS.upcomingEvents),
      hint: "Active research initiatives",
      icon: CalendarDays,
    },
    {
      label: "Active Startups",
      value: foundationDashboard?.incubation.activeStartups ?? (useLiveApi ? 0 : INSTITUTION_DASHBOARD_METRICS.announcements),
      hint: "Incubation portfolio",
      icon: Megaphone,
    },
    {
      label: "Hiring Partners",
      value: foundationDashboard?.placements.activePartnerships ?? (useLiveApi ? 0 : INSTITUTION_DASHBOARD_METRICS.activeRecruiters),
      hint: "Active company partnerships",
      icon: BellRing,
    },
  ] as const;

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Organization overview"
        title="Institution Dashboard"
        description={`Welcome back. Here is the operational pulse of ${profile.name}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={INSTITUTION_ROUTES.commandCenter}
              className={cn(buttonVariants({ variant: "default" }), "h-10")}
            >
              Command Center
            </Link>
            <Link
              href={INSTITUTION_ROUTES.reports}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Generate report
            </Link>
          </div>
        }
      />

      {useLiveApi ? (
        <section aria-labelledby="student-intelligence-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="student-intelligence-heading" className="text-lg font-semibold tracking-tight">
                Student intelligence
              </h2>
              <p className="text-muted-foreground text-sm">
                Live metrics from institution student records.
              </p>
            </div>
            <Link href={INSTITUTION_ROUTES.studentAnalytics} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open analytics
            </Link>
          </div>
          {statsLoading ? <RouteLoading label="Loading student metrics" /> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InstitutionMetricCard
              label="Placement Eligible"
              value={liveStats?.placementEligible ?? 0}
              hint="Ready pipeline"
              icon={BriefcaseBusiness}
            />
            <InstitutionMetricCard
              label="Pending Verifications"
              value={liveStats?.pendingVerifications ?? 0}
              hint="Certificates & achievements"
              icon={Award}
            />
            <InstitutionMetricCard
              label="Recently Added"
              value={liveStats?.recentlyAdded?.length ?? 0}
              hint="Latest enrollments"
              icon={UserCheck}
            />
            <InstitutionMetricCard
              label="Recent Reports"
              value={liveStats?.recentActivity?.filter((a) => a.action === "report_generated").length ?? 0}
              hint="Audit-logged exports"
              icon={FileBarChart}
            />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="institution-metrics-heading">
        <h2 id="institution-metrics-heading" className="sr-only">
          Institution metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <InstitutionMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section aria-labelledby="quick-actions-heading" className="space-y-3">
        <div>
          <h2 id="quick-actions-heading" className="text-lg font-semibold tracking-tight">
            Quick actions
          </h2>
          <p className="text-muted-foreground text-sm">
            Start frequent administrative workflows.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {INSTITUTION_QUICK_ACTIONS.map((action) => (
            <InstitutionQuickAction key={action.label} {...action} />
          ))}
        </div>
      </section>

      <InstitutionPartnershipDashboardWidget />
      <InstitutionPlacementDashboardWidget />

      <section aria-labelledby="analytics-heading" className="space-y-3">
        <div>
          <h2 id="analytics-heading" className="text-lg font-semibold tracking-tight">
            Institutional analytics
          </h2>
          <p className="text-muted-foreground text-sm">
            Typed visualization contracts ready for live reporting APIs.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <InstitutionLineChart
            title="Admissions Trend"
            description="Applications received during the current cycle."
            labels={INSTITUTION_ANALYTICS.admissions.labels}
            values={INSTITUTION_ANALYTICS.admissions.values}
          />
          <InstitutionLineChart
            title="Student Growth"
            description="Enrollment growth over six academic years."
            labels={INSTITUTION_ANALYTICS.students.labels}
            values={INSTITUTION_ANALYTICS.students.values}
          />
          <InstitutionDistributionChart
            title="Placement Statistics"
            description="Current graduating cohort placement pipeline."
            labels={INSTITUTION_ANALYTICS.placements.labels}
            values={INSTITUTION_ANALYTICS.placements.values}
          />
          <InstitutionBarChart
            title="Department Distribution"
            description={useLiveApi ? "Live student share by department." : "Student share by academic department."}
            labels={departmentChart.labels}
            values={departmentChart.values}
          />
          <InstitutionBarChart
            title="Course Popularity"
            description="Relative demand across leading courses."
            labels={INSTITUTION_ANALYTICS.courses.labels}
            values={INSTITUTION_ANALYTICS.courses.values}
          />
          <InstitutionDistributionChart
            title="Faculty Distribution"
            description="Faculty composition by appointment level."
            labels={INSTITUTION_ANALYTICS.faculty.labels}
            values={INSTITUTION_ANALYTICS.faculty.values}
          />
        </div>
      </section>

      <section
        aria-label="Institution activity and announcements"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]"
      >
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Admissions, faculty, courses, events, and communications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstitutionActivityList items={activityItems} />
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Announcements and notices</CardTitle>
                <CardDescription>
                  Priority communication for the institution.
                </CardDescription>
              </div>
              <Link
                href={INSTITUTION_ROUTES.announcements}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {INSTITUTION_NOTICE_GROUPS.map((group, index) => (
                <section key={group.title} aria-labelledby={`notice-group-${index}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3
                      id={`notice-group-${index}`}
                      className="text-sm font-semibold capitalize"
                    >
                      {group.title}
                    </h3>
                    <Badge variant="outline">{group.items.length}</Badge>
                  </div>
                  <ul className="space-y-1.5">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="border-border bg-muted/20 rounded-lg border px-3 py-2 text-sm"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

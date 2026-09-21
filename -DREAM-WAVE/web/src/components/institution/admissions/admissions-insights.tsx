"use client";

import {
  CalendarDays,
  Download,
  FileBarChart,
  GraduationCap,
  Printer,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import {
  InstitutionBarChart,
  InstitutionDistributionChart,
  InstitutionLineChart,
} from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAdmissionsStore } from "@/store/admissions-store";
import type { AdmissionApplication } from "@/types/admissions";

function downloadReport(
  fileName: string,
  applications: AdmissionApplication[],
) {
  const header = [
    "Application ID",
    "Applicant",
    "Email",
    "Department",
    "Course",
    "Status",
    "Application Date",
  ];
  const rows = applications.map((application) => [
    application.id,
    application.fullName,
    application.email,
    application.department,
    application.course,
    application.status,
    application.applicationDate,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AdmissionsAnalyticsPage() {
  const hydrated = useAdmissionsStore((state) => state.hydrated);
  const hydrate = useAdmissionsStore((state) => state.hydrate);
  const applications = useAdmissionsStore((state) => state.applications);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const analytics = useMemo(() => {
    const monthLabels = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const monthKeys = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];
    const monthValues = monthKeys.map(
      (month) =>
        applications.filter((application) =>
          application.applicationDate.startsWith(month),
        ).length,
    );

    const departments = [...new Set(applications.map((item) => item.department))];
    const departmentValues = departments.map(
      (department) =>
        applications.filter((item) => item.department === department).length,
    );
    const courses = [...new Set(applications.map((item) => item.course))];
    const courseValues = courses.map(
      (course) => applications.filter((item) => item.course === course).length,
    );
    const approved = applications.filter((item) =>
      ["approved", "enrolled"].includes(item.status),
    ).length;
    const rejected = applications.filter((item) => item.status === "rejected").length;
    const active = Math.max(applications.length - approved - rejected, 0);
    const total = Math.max(applications.length, 1);

    return {
      monthLabels,
      monthValues,
      departments,
      departmentValues,
      courses,
      courseValues,
      approvalLabels: ["Approved", "In progress", "Rejected"],
      approvalValues: [
        Math.round((approved / total) * 100),
        Math.round((active / total) * 100),
        Math.round((rejected / total) * 100),
      ],
      enrollmentValues: monthValues.map((value, index) =>
        Math.max(0, Math.round(value * (0.48 + index * 0.07))),
      ),
    };
  }, [applications]);

  if (!hydrated) return <RouteLoading label="Loading admission analytics" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Admissions"
        title="Admission Analytics"
        description="Application, approval, course demand, and enrollment intelligence."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <InstitutionLineChart
          title="Applications Per Month"
          description="Application volume across the latest admission cycle."
          labels={analytics.monthLabels}
          values={analytics.monthValues}
        />
        <InstitutionBarChart
          title="Admissions Per Department"
          description="Applicant distribution across academic departments."
          labels={analytics.departments}
          values={analytics.departmentValues}
        />
        <InstitutionDistributionChart
          title="Approval Ratio"
          description="Approved, active, and rejected application share."
          labels={analytics.approvalLabels}
          values={analytics.approvalValues}
        />
        <InstitutionBarChart
          title="Course Popularity"
          description="Relative application demand by course."
          labels={analytics.courses}
          values={analytics.courseValues}
        />
        <InstitutionLineChart
          title="Enrollment Trend"
          description="Enrollment progression from admitted applicants."
          labels={analytics.monthLabels}
          values={analytics.enrollmentValues}
          className="xl:col-span-2"
        />
      </div>
    </div>
  );
}

const REPORTS = [
  {
    title: "Daily Applications",
    description: "Applications received today.",
    icon: CalendarDays,
    filter: (application: AdmissionApplication) =>
      application.applicationDate === "2026-07-17",
  },
  {
    title: "Monthly Applications",
    description: "Applications submitted this month.",
    icon: FileBarChart,
    filter: (application: AdmissionApplication) =>
      application.applicationDate.startsWith("2026-07"),
  },
  {
    title: "Department-wise Admissions",
    description: "Admissions grouped for department review.",
    icon: GraduationCap,
    filter: () => true,
  },
  {
    title: "Course-wise Admissions",
    description: "Course demand and application records.",
    icon: FileBarChart,
    filter: () => true,
  },
  {
    title: "Approval Percentage",
    description: "Approved and enrolled application records.",
    icon: TrendingUp,
    filter: (application: AdmissionApplication) =>
      ["approved", "enrolled"].includes(application.status),
  },
  {
    title: "Rejected Applications",
    description: "Applications declined in the current cycle.",
    icon: FileBarChart,
    filter: (application: AdmissionApplication) => application.status === "rejected",
  },
  {
    title: "Enrollment Reports",
    description: "Completed enrollment records.",
    icon: GraduationCap,
    filter: (application: AdmissionApplication) => application.status === "enrolled",
  },
] as const;

export function AdmissionsReportsPage() {
  const hydrated = useAdmissionsStore((state) => state.hydrated);
  const hydrate = useAdmissionsStore((state) => state.hydrate);
  const applications = useAdmissionsStore((state) => state.applications);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  if (!hydrated) return <RouteLoading label="Loading admission reports" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Admissions"
        title="Admission Reports"
        description="Generate operational admissions and enrollment reports."
        actions={
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print report
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
          const reportApplications = applications.filter(report.filter);
          const Icon = report.icon;
          return (
            <Card key={report.title} className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <span className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-xl">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-3xl font-semibold tabular-nums">
                  {reportApplications.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      downloadReport(
                        `${report.title.toLowerCase().replaceAll(" ", "-")}.csv`,
                        reportApplications,
                      )
                    }
                  >
                    <Download aria-hidden="true" />
                    Export Excel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                  >
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

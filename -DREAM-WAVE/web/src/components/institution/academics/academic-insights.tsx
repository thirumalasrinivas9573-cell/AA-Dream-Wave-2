"use client";

import { BookOpen, Download, FileBarChart, GraduationCap, Layers, Printer } from "lucide-react";
import { useEffect, useMemo } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import {
  exportCsv,
  PROGRAM_LEVEL_OPTIONS,
} from "@/components/institution/academics/academic-ui";
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
import { useAcademicManagementStore } from "@/store/academic-management-store";

function useHydratedAcademics() {
  const hydrated = useAcademicManagementStore((s) => s.hydrated);
  const hydrate = useAcademicManagementStore((s) => s.hydrate);
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);
  return hydrated;
}

export function AcademicAnalyticsPage() {
  const hydrated = useHydratedAcademics();
  const departments = useAcademicManagementStore((s) => s.departments);
  const programs = useAcademicManagementStore((s) => s.programs);
  const courses = useAcademicManagementStore((s) => s.courses);
  const subjects = useAcademicManagementStore((s) => s.subjects);

  const analytics = useMemo(() => {
    const deptLabels = departments.map((d) => d.code);
    return {
      years: ["2021", "2022", "2023", "2024", "2025", "2026"],
      growth: [3, 3, 4, 4, 5, departments.length],
      programLevels: PROGRAM_LEVEL_OPTIONS.map((option) => option.label),
      programLevelValues: PROGRAM_LEVEL_OPTIONS.map(
        (option) => programs.filter((p) => p.level === option.value).length,
      ),
      deptLabels,
      subjectByDept: deptLabels.map(
        (code) => courses.filter((c) => departments.find((d) => d.id === c.departmentId)?.code === code).length,
      ),
      creditLabels: deptLabels,
      creditValues: deptLabels.map((code) =>
        courses
          .filter((c) => departments.find((d) => d.id === c.departmentId)?.code === code)
          .reduce((sum, c) => sum + c.credits, 0),
      ),
      coursePopularity: courses.slice(0, 6).map((c) => c.code),
      coursePopularityValues: courses.slice(0, 6).map((c) => c.credits * 12 + c.theoryHours * 3),
      facultyLabels: [...new Set(courses.map((c) => c.facultyAssigned))].slice(0, 6),
      facultyValues: [...new Set(courses.map((c) => c.facultyAssigned))]
        .slice(0, 6)
        .map((faculty) => courses.filter((c) => c.facultyAssigned === faculty).length),
      subjectTypeLabels: ["Core", "Elective", "Lab required"],
      subjectTypeValues: [
        subjects.filter((s) => !s.elective).length,
        subjects.filter((s) => s.elective).length,
        subjects.filter((s) => s.labRequired).length,
      ],
    };
  }, [courses, departments, programs, subjects]);

  if (!hydrated) return <RouteLoading label="Loading academic analytics" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Academic Structure"
        title="Academic Analytics"
        description="Department growth, program mix, credit allocation, and course intelligence."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <InstitutionLineChart title="Department Growth" description="Departments across six academic years." labels={analytics.years} values={analytics.growth} />
        <InstitutionBarChart title="Program Distribution" description="Programs grouped by level." labels={analytics.programLevels} values={analytics.programLevelValues} />
        <InstitutionBarChart title="Subject Distribution" description="Courses offered per department." labels={analytics.deptLabels} values={analytics.subjectByDept} />
        <InstitutionBarChart title="Credit Allocation" description="Total course credits per department." labels={analytics.creditLabels} values={analytics.creditValues} />
        <InstitutionBarChart title="Course Popularity" description="Relative demand across leading courses." labels={analytics.coursePopularity} values={analytics.coursePopularityValues} />
        <InstitutionBarChart title="Faculty Allocation" description="Courses assigned per faculty member." labels={analytics.facultyLabels} values={analytics.facultyValues} />
        <InstitutionDistributionChart title="Subject Composition" description="Core, elective, and lab subject balance." labels={analytics.subjectTypeLabels} values={analytics.subjectTypeValues} />
      </div>
    </div>
  );
}

export function AcademicReportsPage() {
  const hydrated = useHydratedAcademics();
  const departments = useAcademicManagementStore((s) => s.departments);
  const programs = useAcademicManagementStore((s) => s.programs);
  const courses = useAcademicManagementStore((s) => s.courses);
  const curriculum = useAcademicManagementStore((s) => s.curriculum);

  const reports = useMemo(
    () => [
      {
        title: "Department Reports",
        description: "Complete department register with leadership and headcount.",
        icon: Layers,
        count: departments.length,
        export: () =>
          exportCsv(
            "department-report.csv",
            ["Code", "Name", "HOD", "Faculty", "Students", "Status"],
            departments.map((d) => [d.code, d.name, d.hod, d.facultyCount, d.studentCount, d.status]),
          ),
      },
      {
        title: "Program Reports",
        description: "Academic programs across all levels.",
        icon: GraduationCap,
        count: programs.length,
        export: () =>
          exportCsv(
            "program-report.csv",
            ["Name", "Level", "Duration", "Credits", "Eligibility", "Status"],
            programs.map((p) => [p.name, p.level, p.duration, p.credits, p.eligibility, p.status]),
          ),
      },
      {
        title: "Course Reports",
        description: "Course catalogue with hours and faculty allocation.",
        icon: BookOpen,
        count: courses.length,
        export: () =>
          exportCsv(
            "course-report.csv",
            ["Code", "Name", "Semester", "Credits", "Theory", "Practical", "Faculty", "Status"],
            courses.map((c) => [c.code, c.name, c.semester, c.credits, c.theoryHours, c.practicalHours, c.facultyAssigned, c.status]),
          ),
      },
      {
        title: "Credit Reports",
        description: "Credit distribution across the course catalogue.",
        icon: FileBarChart,
        count: courses.reduce((sum, c) => sum + c.credits, 0),
        export: () =>
          exportCsv(
            "credit-report.csv",
            ["Course", "Department", "Credits"],
            courses.map((c) => [c.name, departments.find((d) => d.id === c.departmentId)?.name ?? "—", c.credits]),
          ),
      },
      {
        title: "Curriculum Reports",
        description: "Curriculum structure by semester and component type.",
        icon: Layers,
        count: curriculum.length,
        export: () =>
          exportCsv(
            "curriculum-report.csv",
            ["Semester", "Subject", "Type", "Credits"],
            curriculum.map((c) => [c.semester, c.subject, c.type, c.credits]),
          ),
      },
      {
        title: "Faculty Allocation",
        description: "Course allocation grouped by faculty member.",
        icon: GraduationCap,
        count: new Set(courses.map((c) => c.facultyAssigned)).size,
        export: () =>
          exportCsv(
            "faculty-allocation.csv",
            ["Faculty", "Courses", "Total Credits"],
            [...new Set(courses.map((c) => c.facultyAssigned))].map((faculty) => [
              faculty,
              courses.filter((c) => c.facultyAssigned === faculty).length,
              courses.filter((c) => c.facultyAssigned === faculty).reduce((sum, c) => sum + c.credits, 0),
            ]),
          ),
      },
    ],
    [courses, curriculum, departments, programs],
  );

  if (!hydrated) return <RouteLoading label="Loading academic reports" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Academic Structure"
        title="Academic Reports"
        description="Generate department, program, course, credit, and curriculum reports."
        actions={
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
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
                <p className="mb-4 text-3xl font-semibold">{report.count}</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={report.export}>
                    <Download aria-hidden="true" />
                    Export Excel
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
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

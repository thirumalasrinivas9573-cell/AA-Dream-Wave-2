"use client";

import { Download, FileBarChart, Microscope, Printer, Users } from "lucide-react";
import { useEffect, useMemo } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import {
  InstitutionBarChart,
  InstitutionDistributionChart,
  InstitutionLineChart,
} from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFacultyManagementStore } from "@/store/faculty-management-store";
import type { ManagedFaculty } from "@/types/faculty-management";

function exportFaculty(fileName: string, faculty: ManagedFaculty[]) {
  const header = ["Employee ID", "Name", "Designation", "Department", "Qualification", "Experience", "Employment Type", "Status"];
  const rows = faculty.map((record) => [record.id, record.fullName, record.designation, record.department, record.highestQualification, record.totalExperience, record.employmentType, record.status]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function FacultyAnalyticsPage() {
  const hydrated = useFacultyManagementStore((state) => state.hydrated);
  const hydrate = useFacultyManagementStore((state) => state.hydrate);
  const faculty = useFacultyManagementStore((state) => state.faculty);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const analytics = useMemo(() => {
    const qualifications = [...new Set(faculty.map((record) => record.highestQualification))];
    const departments = [...new Set(faculty.map((record) => record.department))];
    return {
      years: ["2021", "2022", "2023", "2024", "2025", "2026"],
      growth: [98, 106, 115, 121, 129, 138],
      qualifications,
      qualificationValues: qualifications.map((value) => faculty.filter((record) => record.highestQualification === value).length),
      experienceLabels: ["0–5 years", "6–10 years", "11–15 years", "16+ years"],
      experienceValues: [
        faculty.filter((record) => record.totalExperience <= 5).length,
        faculty.filter((record) => record.totalExperience > 5 && record.totalExperience <= 10).length,
        faculty.filter((record) => record.totalExperience > 10 && record.totalExperience <= 15).length,
        faculty.filter((record) => record.totalExperience > 15).length,
      ],
      research: [22, 28, 35, 42, 51, 63],
      departments,
      departmentValues: departments.map((value) => faculty.filter((record) => record.department === value).length),
      loadLabels: faculty.filter((record) => record.staffCategory === "teaching").slice(0, 6).map((record) => record.fullName.split(" ").at(-1) ?? record.fullName),
      loadValues: faculty.filter((record) => record.staffCategory === "teaching").slice(0, 6).map((record) => record.workload.weeklyTeachingHours),
    };
  }, [faculty]);

  if (!hydrated) return <RouteLoading label="Loading faculty analytics" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader eyebrow="Faculty Management" title="Faculty Analytics" description="Workforce, qualification, research, allocation, and teaching-load intelligence." />
      <div className="grid gap-4 xl:grid-cols-2">
        <InstitutionLineChart title="Faculty Growth" description="Faculty headcount across six academic years." labels={analytics.years} values={analytics.growth} />
        <InstitutionBarChart title="Qualification Distribution" description="Faculty grouped by highest qualification." labels={analytics.qualifications} values={analytics.qualificationValues} />
        <InstitutionDistributionChart title="Experience Distribution" description="Faculty grouped by total professional experience." labels={analytics.experienceLabels} values={analytics.experienceValues} />
        <InstitutionLineChart title="Research Publications" description="Institution research output over time." labels={analytics.years} values={analytics.research} />
        <InstitutionBarChart title="Department Allocation" description="Faculty allocation across departments." labels={analytics.departments} values={analytics.departmentValues} />
        <InstitutionBarChart title="Teaching Load" description="Weekly hours for teaching faculty." labels={analytics.loadLabels} values={analytics.loadValues} />
      </div>
    </div>
  );
}

const REPORTS = [
  { title: "Faculty Distribution", description: "Complete faculty workforce register.", icon: Users, filter: () => true },
  { title: "Department-wise Faculty", description: "Faculty grouped by department.", icon: Users, filter: () => true },
  { title: "Qualification Analysis", description: "Postgraduate and doctoral qualifications.", icon: FileBarChart, filter: (record: ManagedFaculty) => ["Ph.D.", "M.Tech", "M.Des"].includes(record.highestQualification) },
  { title: "Experience Analysis", description: "Senior faculty with ten or more years.", icon: FileBarChart, filter: (record: ManagedFaculty) => record.totalExperience >= 10 },
  { title: "Teaching Load", description: "Teaching faculty workload report.", icon: FileBarChart, filter: (record: ManagedFaculty) => record.staffCategory === "teaching" },
  { title: "Research Output", description: "Faculty with recorded research output.", icon: Microscope, filter: (record: ManagedFaculty) => record.publications.length > 0 || record.researchPapers.length > 0 },
] as const;

export function FacultyReportsPage() {
  const hydrated = useFacultyManagementStore((state) => state.hydrated);
  const hydrate = useFacultyManagementStore((state) => state.hydrate);
  const faculty = useFacultyManagementStore((state) => state.faculty);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  if (!hydrated) return <RouteLoading label="Loading faculty reports" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader eyebrow="Faculty Management" title="Faculty Reports" description="Generate workforce, workload, qualification, and research reports." actions={<Button type="button" variant="outline" onClick={() => window.print()}><Printer aria-hidden="true" />Print</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
          const records = faculty.filter(report.filter);
          const Icon = report.icon;
          return (
            <Card key={report.title} className="bg-card/80 backdrop-blur-sm">
              <CardHeader><span className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-xl"><Icon className="size-5" aria-hidden="true" /></span><CardTitle>{report.title}</CardTitle><CardDescription>{report.description}</CardDescription></CardHeader>
              <CardContent><p className="mb-4 text-3xl font-semibold">{records.length}</p><div className="flex gap-2"><Button type="button" size="sm" onClick={() => exportFaculty(`${report.title.toLowerCase().replaceAll(" ", "-")}.csv`, records)}><Download aria-hidden="true" />Export Excel</Button><Button type="button" size="sm" variant="outline" onClick={() => window.print()}>Export PDF</Button></div></CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

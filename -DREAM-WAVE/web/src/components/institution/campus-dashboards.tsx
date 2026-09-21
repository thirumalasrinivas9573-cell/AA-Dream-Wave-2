"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Spinner } from "@/components/common/spinner";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { useInstitutionStore } from "@/store/institution-store";

export function CollegeDashboardPage() {
  const hydrated = useInstitutionStore((s) => s.hydrated);
  const hydrate = useInstitutionStore((s) => s.hydrate);
  const courses = useInstitutionStore((s) => s.courses);
  const teachers = useInstitutionStore((s) => s.teachers);
  const students = useInstitutionStore((s) => s.students);
  const departments = useInstitutionStore((s) => s.departments);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading" />
      </div>
    );
  }

  const ug = courses.filter((c) => c.level === "undergraduate").length;
  const pg = courses.filter((c) => c.level === "postgraduate").length;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <InstitutionPageHeader
        title="College dashboard"
        description="Higher-education view across departments, degree programs, and faculty."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Departments", value: departments.length },
          { label: "Undergraduate programs", value: ug },
          { label: "Postgraduate programs", value: pg },
          { label: "Faculty", value: teachers.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: INSTITUTION_ROUTES.courses,
            title: "Degree programs",
            description: `${courses.length} courses · ${students.length} enrolled learners`,
          },
          {
            href: INSTITUTION_ROUTES.teachers,
            title: "Faculty roster",
            description: "Assign teachers to departments and classes.",
          },
          {
            href: INSTITUTION_ROUTES.subjects,
            title: "Subject catalog",
            description: "Credits, semesters, and course mapping.",
          },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:bg-muted/30 h-full transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SchoolDashboardPage() {
  const hydrated = useInstitutionStore((s) => s.hydrated);
  const hydrate = useInstitutionStore((s) => s.hydrate);
  const classes = useInstitutionStore((s) => s.classes);
  const students = useInstitutionStore((s) => s.students);
  const teachers = useInstitutionStore((s) => s.teachers);
  const branches = useInstitutionStore((s) => s.branches);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <InstitutionPageHeader
        title="School dashboard"
        description="School operations across campuses, sections, and daily class schedules."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Campuses / branches", value: branches.length },
          { label: "Active classes", value: classes.filter((c) => c.status === "active").length },
          { label: "Students", value: students.length },
          { label: "Teachers", value: teachers.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: INSTITUTION_ROUTES.classes,
            title: "Class sections",
            description: "Rooms, schedules, and capacity tracking.",
          },
          {
            href: INSTITUTION_ROUTES.branches,
            title: "Branches",
            description: "Multi-campus operations and locations.",
          },
          {
            href: INSTITUTION_ROUTES.students,
            title: "Enrollment",
            description: "Learner records and year groups.",
          },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:bg-muted/30 h-full transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

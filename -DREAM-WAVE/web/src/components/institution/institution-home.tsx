"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Spinner } from "@/components/common/spinner";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { StatusBadge } from "@/components/institution/institution-ui";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { useInstitutionStore } from "@/store/institution-store";

const LINKS = [
  {
    href: INSTITUTION_ROUTES.dashboard,
    title: "Institution dashboard",
    description: "KPIs, activity, and operational overview.",
  },
  {
    href: INSTITUTION_ROUTES.college,
    title: "College dashboard",
    description: "Higher-education cohorts, courses, and faculty.",
  },
  {
    href: INSTITUTION_ROUTES.school,
    title: "School dashboard",
    description: "School programs, classes, and enrollment.",
  },
  {
    href: INSTITUTION_ROUTES.departments,
    title: "Departments",
    description: "Organize academic units and leadership.",
  },
  {
    href: INSTITUTION_ROUTES.students,
    title: "Students",
    description: "Manage enrollment and learner records.",
  },
  {
    href: INSTITUTION_ROUTES.teachers,
    title: "Teachers",
    description: "Faculty roster and assignments.",
  },
  {
    href: INSTITUTION_ROUTES.analytics,
    title: "Analytics",
    description: "Outcomes and engagement insights.",
  },
  {
    href: INSTITUTION_ROUTES.notifications,
    title: "Notifications",
    description: "Operational alerts and announcements.",
  },
] as const;

export function InstitutionHomePage() {
  const hydrated = useInstitutionStore((s) => s.hydrated);
  const hydrate = useInstitutionStore((s) => s.hydrate);
  const profile = useInstitutionStore((s) => s.profile);
  const departments = useInstitutionStore((s) => s.departments);
  const students = useInstitutionStore((s) => s.students);
  const teachers = useInstitutionStore((s) => s.teachers);
  const notifications = useInstitutionStore((s) => s.notifications);

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

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <InstitutionPageHeader
        title={profile.name}
        description="Institution home — manage campuses, academics, people, and performance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Departments", value: departments.length },
          { label: "Teachers", value: teachers.length },
          { label: "Students", value: students.length },
          { label: "Unread alerts", value: unread },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization snapshot</CardTitle>
          <CardDescription>
            {profile.type} · {profile.city}, {profile.state} ·{" "}
            <StatusBadge status="active" />
          </CardDescription>
          <p className="mt-3 text-sm text-pretty">{profile.description}</p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="focus-visible:ring-ring rounded-2xl outline-none focus-visible:ring-2"
          >
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

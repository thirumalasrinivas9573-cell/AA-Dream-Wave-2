"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRoleLabel } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const StudentDashboard = dynamic(
  () =>
    import("@/components/dashboard/student-dashboard").then(
      (mod) => mod.StudentDashboard,
    ),
  { loading: () => <RouteLoading label="Loading personalized AI dashboard" /> },
);

const CompanyDashboard = dynamic(
  () =>
    import("@/components/dashboard/company-dashboard").then(
      (mod) => mod.CompanyDashboard,
    ),
  { loading: () => <RouteLoading label="Loading company dashboard" /> },
);

function InstitutionHomeDashboard({ org }: { org?: string }) {
  const links = [
    {
      href: ROUTES.institution,
      title: "Institution home",
      description: "Launch the full institution workspace.",
    },
    {
      href: "/institution/dashboard",
      title: "Operations dashboard",
      description: "KPIs, attendance, departments, and reports.",
    },
    {
      href: "/institution/students",
      title: "Students",
      description: "Enrollment and learner records.",
    },
    {
      href: "/institution/teachers",
      title: "Teachers",
      description: "Faculty roster and assignments.",
    },
    {
      href: "/institution/analytics",
      title: "Analytics",
      description: "Outcomes and department load.",
    },
    {
      href: "/institution/reports",
      title: "Reports",
      description: "Export-ready academic summaries.",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{org || "Institution workspace"}</CardTitle>
          <CardDescription>
            Enterprise campus overview with deep links into operations,
            analytics, and reporting.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => (
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

function AdminDashboard() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Administrator console</CardTitle>
          <CardDescription>
            Platform oversight across student, institution, and company
            experiences.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: ROUTES.dashboard, title: "Student lens", detail: "Learning dashboards" },
          { href: ROUTES.institution, title: "Institution lens", detail: "Campus operations" },
          { href: ROUTES.settings, title: "Settings", detail: "Account & preferences" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:bg-muted/30 h-full transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.detail}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? "student";

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm">
            {getRoleLabel(role)} platform
          </p>
          <h1 className="page-title">AI Dashboard</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
            Adaptive personalization across learning, career, reading, and
            productivity.
          </p>
        </div>
        <Link
          href={ROUTES.settings}
          className={cn(buttonVariants({ variant: "outline" }), "h-10 shrink-0 md:h-9")}
        >
          Settings
        </Link>
      </header>

      {role === "student" ? (
        <StudentDashboard
          {...(user?.name ? { name: user.name } : {})}
          {...(user?.learningGoal ? { goal: user.learningGoal } : {})}
        />
      ) : null}
      {role === "institution" ? (
        <InstitutionHomeDashboard
          {...(user?.organizationName
            ? { org: user.organizationName }
            : {})}
        />
      ) : null}
      {role === "company" ? (
        <CompanyDashboard
          {...(user?.organizationName
            ? { org: user.organizationName }
            : {})}
        />
      ) : null}
      {role === "admin" ? <AdminDashboard /> : null}

      {user?.aaid ? (
        <p className="text-muted-foreground text-xs">
          AAID: <span className="text-foreground font-mono">{user.aaid}</span>
        </p>
      ) : null}
    </div>
  );
}

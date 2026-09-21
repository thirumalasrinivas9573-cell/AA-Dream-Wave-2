"use client";

import { Briefcase, CalendarDays, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { formatCurrency } from "@/components/institution/placements/placement-ui";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { usePlacementManagementStore } from "@/store/placement-management-store";

export function InstitutionPlacementDashboardWidget() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();
  const dashboard = usePlacementManagementStore((s) => s.dashboard);
  const fetchDashboard = usePlacementManagementStore((s) => s.fetchDashboard);
  const hydrate = usePlacementManagementStore((s) => s.hydrate);
  const hydrated = usePlacementManagementStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!useLiveApi || !token) return;
    void fetchDashboard(token);
  }, [useLiveApi, token, fetchDashboard]);

  if (!useLiveApi || !dashboard) return null;

  const metrics = [
    { label: "Active Opportunities", value: dashboard.activeOpportunities, hint: "Open listings", icon: Briefcase },
    { label: "Applications", value: dashboard.applicationsReceived, hint: "Received", icon: Users },
    { label: "Shortlisted", value: dashboard.studentsShortlisted, hint: "In pipeline", icon: Users },
    { label: "Placement %", value: `${dashboard.placementPercentage}%`, hint: "Eligible placed", icon: TrendingUp },
  ];

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Placement Office</CardTitle>
          <CardDescription>Live campus recruitment metrics and upcoming drives.</CardDescription>
        </div>
        <Link href={INSTITUTION_ROUTES.placements} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open workspace
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <InstitutionMetricCard key={m.label} {...m} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-border rounded-xl border p-3 text-sm">
            <p className="text-muted-foreground">Highest package</p>
            <p className="text-lg font-semibold">{dashboard.highestPackage ? formatCurrency(dashboard.highestPackage) : "—"}</p>
          </div>
          <div className="border-border rounded-xl border p-3 text-sm">
            <p className="text-muted-foreground">Average package</p>
            <p className="text-lg font-semibold">{dashboard.averagePackage ? formatCurrency(dashboard.averagePackage) : "—"}</p>
          </div>
        </div>
        {dashboard.upcomingDrives.length ? (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-4" aria-hidden="true" />
              Upcoming drives
            </p>
            <ul className="space-y-2">
              {dashboard.upcomingDrives.map((drive) => (
                <li key={drive.id} className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">{drive.title}</span>
                  <span className="text-muted-foreground capitalize">{drive.status.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

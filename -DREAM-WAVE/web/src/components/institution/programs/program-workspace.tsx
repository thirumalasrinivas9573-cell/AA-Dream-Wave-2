"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { ActivityTimeline } from "@/components/dashboard/dashboard-ui";
import { ProgramIntelligencePanel } from "@/components/institution/programs/program-intelligence-panel";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { institutionProgramsApi } from "@/lib/api/institution-programs";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useInstitutionProgramStore } from "@/store/institution-program-store";
import type { ProgramStatus } from "@/types/institution-program";

const TABS = [
  "Overview",
  "Intelligence",
  "Timeline",
  "Activities",
  "Participants",
  "Analytics",
] as const;

type ProgramWorkspaceProps = {
  programId: string;
  backHref: string;
  portal?: "institution" | "company";
};

export function ProgramWorkspace({
  programId,
  backHref,
  portal = "institution",
}: ProgramWorkspaceProps) {
  const { token } = useAuth();
  const fetchProgram = useInstitutionProgramStore((s) => s.fetchProgram);
  const updateStatus = useInstitutionProgramStore((s) => s.updateStatus);
  const clearCurrent = useInstitutionProgramStore((s) => s.clearCurrent);
  const loading = useInstitutionProgramStore((s) => s.loading);
  const error = useInstitutionProgramStore((s) => s.error);
  const program = useInstitutionProgramStore((s) => s.currentProgram);
  const dashboard = useInstitutionProgramStore((s) => s.dashboard);

  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  useEffect(() => {
    if (token) void fetchProgram(token, programId, portal);
    return () => clearCurrent();
  }, [token, programId, portal, fetchProgram, clearCurrent]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !program) return <RouteLoading label="Loading program" />;
  if (error || !program) {
    return (
      <EmptyState
        title="Program unavailable"
        description={error || "This program could not be loaded."}
        action={
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            Go back
          </Link>
        }
      />
    );
  }

  const statusActions: { label: string; status: ProgramStatus }[] = [];
  if (program.status === "draft") statusActions.push({ label: "Mark planned", status: "planned" });
  if (program.status === "planned") statusActions.push({ label: "Open registration", status: "registration_open" });
  if (program.status === "registration_open") statusActions.push({ label: "Activate", status: "active" });
  if (program.status === "active") {
    statusActions.push({ label: "Pause", status: "paused" });
    statusActions.push({ label: "Complete", status: "completed" });
  }
  if (program.status === "paused") statusActions.push({ label: "Resume", status: "active" });
  if (!["completed", "cancelled"].includes(program.status)) {
    statusActions.push({ label: "Cancel", status: "cancelled" });
  }

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Program operations"
        title={program.title}
        description={`${program.programType.replace(/_/g, " ")} · ${program.status.replace(/_/g, " ")}`}
        actions={
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            Back to programs
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{program.status.replace(/_/g, " ")}</Badge>
        {program.skills?.map((s) => (
          <Badge key={s} variant="secondary">
            {s}
          </Badge>
        ))}
        {statusActions.map((a) => (
          <Button
            key={a.status}
            size="sm"
            variant={a.status === "cancelled" ? "destructive" : "outline"}
            onClick={() => token && void updateStatus(token, programId, a.status, portal)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <Button key={item} size="sm" variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)}>
            {item}
          </Button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Program overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {program.objectives ? <p>{program.objectives}</p> : null}
              {program.description ? <p className="text-muted-foreground">{program.description}</p> : null}
              {program.capacity != null ? <p>Capacity: {program.capacity}</p> : null}
              {dashboard?.capacity ? (
                <p>
                  Registrations: {dashboard.capacity.used}/{dashboard.capacity.total}
                  {dashboard.capacity.full ? " · REGISTRATION FULL" : ""}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {(program.milestones || []).length ? (
                <ul className="space-y-2 text-sm">
                  {program.milestones!.map((m) => (
                    <li key={m.key} className="flex items-center justify-between gap-2">
                      <span>{m.title}</span>
                      <Badge variant="outline">{m.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No milestones configured.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "Intelligence" ? <ProgramIntelligencePanel programId={programId} /> : null}

      {tab === "Timeline" ? (
        <Card>
          <CardHeader>
            <CardTitle>Program timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.recentActivity?.length ? (
              <ActivityTimeline
                items={dashboard.recentActivity.map((a) => ({
                  id: a._id,
                  title: a.title,
                  time: new Date(a.createdAt).toLocaleString(),
                  detail: a.description || "",
                }))}
              />
            ) : (
              <EmptyState title="No activity yet" description="Program events will appear here as they occur." titleAs="h3" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Activities" ? (
        <Card>
          <CardHeader>
            <CardTitle>Linked activities</CardTitle>
            <CardDescription>Events, drives, jobs, and projects linked to this program.</CardDescription>
          </CardHeader>
          <CardContent>
            {(program.linkedEntities || []).length ? (
              <ul className="divide-border divide-y text-sm">
                {program.linkedEntities!.map((l) => (
                  <li key={`${l.entityType}-${l.entityId}`} className="flex justify-between py-2">
                    <span>{l.label || l.entityType}</span>
                    <Badge variant="outline">{l.entityType}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No linked activities"
                description="Link campus drives, events, jobs, or research opportunities from placement and partnership modules."
                titleAs="h3"
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Participants" ? (
        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(dashboard?.participants || []).length ? (
              <ul className="divide-border divide-y text-sm">
                {dashboard!.participants.map((p) => (
                  <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{p.studentUserId}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{p.status}</Badge>
                      {p.status === "registered" && token ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void institutionProgramsApi.updateParticipant(
                                token,
                                programId,
                                p._id,
                                "approved",
                                undefined,
                                portal,
                              ).then(() => fetchProgram(token, programId, portal))
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              void institutionProgramsApi.updateParticipant(
                                token,
                                programId,
                                p._id,
                                "rejected",
                                undefined,
                                portal,
                              ).then(() => fetchProgram(token, programId, portal))
                            }
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No participants" description="Students register when registration is open." titleAs="h3" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Analytics" ? (
        <Card>
          <CardHeader>
            <CardTitle>Aggregate analytics</CardTitle>
            <CardDescription>Participant counts only — no private student data.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {dashboard?.analytics
              ? Object.entries(dashboard.analytics).map(([key, value]) => (
                  <div key={key} className="border-border rounded-lg border p-3">
                    <p className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                    <p className="text-2xl font-semibold">{value}</p>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

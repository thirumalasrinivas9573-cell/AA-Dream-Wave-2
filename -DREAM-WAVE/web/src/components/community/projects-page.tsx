"use client";

import { useEffect } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { CommunityNav, CommunityPageHeader } from "@/components/community/community-nav";
import { ProgressBar } from "@/components/dashboard/dashboard-ui";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCommunityStore } from "@/store/community-store";

export function ProjectsPage() {
  const hydrate = useCommunityStore((s) => s.hydrate);
  const hydrated = useCommunityStore((s) => s.hydrated);
  const projects = useCommunityStore((s) => s.projects);
  const teams = useCommunityStore((s) => s.teams);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading projects" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <CommunityPageHeader
        title="Project collaboration"
        description="Project dashboards, milestones, documents, and activity timelines."
      />
      <CommunityNav />

      {projects.length === 0 ? (
        <EmptyState
          title="No collaborative projects"
          description="Create or join a project community to start."
        />
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const team = teams.find((item) => item.id === project.teamId);
            return (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>
                    Team: {team?.name || "Unassigned"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProgressBar value={project.progress} label="Team progress" />
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div>
                      <p className="mb-2 text-sm font-medium">Milestones</p>
                      <ul className="space-y-2">
                        {project.milestones.map((item) => (
                          <li
                            key={item.id}
                            className="border-border flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                          >
                            <span
                              className={
                                item.done ? "line-through opacity-70" : ""
                              }
                            >
                              {item.label}
                            </span>
                            <Badge variant={item.done ? "default" : "outline"}>
                              {item.done ? "Done" : "Open"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Shared documents
                      </p>
                      <ul className="space-y-2">
                        {project.documents.map((doc) => (
                          <li
                            key={doc}
                            className="border-border rounded-xl border px-3 py-2 text-sm"
                          >
                            {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Activity timeline
                      </p>
                      <ol className="relative space-y-3 border-l pl-5">
                        {project.timeline.map((event) => (
                          <li key={event.id} className="relative">
                            <span className="bg-primary absolute top-1.5 -left-[1.4rem] size-2 rounded-full" />
                            <p className="text-sm font-medium">{event.label}</p>
                            <p className="text-muted-foreground text-xs">
                              {new Date(event.at).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

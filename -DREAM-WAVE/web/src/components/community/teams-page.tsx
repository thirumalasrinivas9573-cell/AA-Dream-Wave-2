"use client";

import { useEffect } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { CommunityNav, CommunityPageHeader } from "@/components/community/community-nav";
import { ProgressBar } from "@/components/dashboard/dashboard-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCommunityStore } from "@/store/community-store";

export function TeamsPage() {
  const hydrate = useCommunityStore((s) => s.hydrate);
  const hydrated = useCommunityStore((s) => s.hydrated);
  const teams = useCommunityStore((s) => s.teams);
  const toggleTeamTask = useCommunityStore((s) => s.toggleTeamTask);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading teams" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <CommunityPageHeader
        title="Team collaboration"
        description="Shared workspace, notes, resources, roadmaps, and tasks."
      />
      <CommunityNav />

      {teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Join a project community to unlock shared workspaces."
        />
      ) : (
        teams.map((team) => {
          const done = team.sharedTasks.filter((task) => task.done).length;
          const progress = Math.round(
            (done / Math.max(1, team.sharedTasks.length)) * 100,
          );
          return (
            <div key={team.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>{team.focus}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ProgressBar value={progress} label="Team progress" />
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((member) => (
                      <Badge key={member} variant="secondary">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Shared notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {team.sharedNotes.map((note) => (
                      <div
                        key={note}
                        className="border-border rounded-xl border px-3 py-2 text-sm"
                      >
                        {note}
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Shared resources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {team.sharedResources.map((resource) => (
                      <div
                        key={resource}
                        className="border-border rounded-xl border px-3 py-2 text-sm"
                      >
                        {resource}
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Shared roadmap</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{team.roadmap}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Shared tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {team.sharedTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTeamTask(team.id, task.id)}
                      className="border-border hover:bg-muted/30 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm"
                      aria-pressed={task.done}
                    >
                      <span className={task.done ? "line-through opacity-70" : ""}>
                        {task.title}
                      </span>
                      <Button size="xs" variant="outline" tabIndex={-1}>
                        {task.done ? "Done" : "Mark done"}
                      </Button>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          );
        })
      )}
    </div>
  );
}

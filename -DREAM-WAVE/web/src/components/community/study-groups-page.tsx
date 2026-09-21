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

export function StudyGroupsPage() {
  const hydrate = useCommunityStore((s) => s.hydrate);
  const hydrated = useCommunityStore((s) => s.hydrated);
  const groups = useCommunityStore((s) => s.groups);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading study groups" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <CommunityPageHeader
        title="Study groups"
        description="Group dashboards, members, sessions, resources, and progress."
      />
      <CommunityNav />

      {groups.length === 0 ? (
        <EmptyState
          title="No study groups"
          description="Join a subject community to form a study group."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>
                  {group.subject} · next: {group.nextSession}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProgressBar value={group.progress} label="Group progress" />
                <div>
                  <p className="mb-2 text-sm font-medium">Members</p>
                  <div className="flex flex-wrap gap-2">
                    {group.members.map((member) => (
                      <Badge key={member} variant="secondary">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Group resources</p>
                  <ul className="space-y-1 text-sm">
                    {group.resources.map((resource) => (
                      <li
                        key={resource}
                        className="border-border rounded-xl border px-3 py-2"
                      >
                        {resource}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-border rounded-xl border px-3 py-2 text-sm">
                  <p className="font-medium">Study session</p>
                  <p className="text-muted-foreground text-xs">
                    {group.nextSession}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

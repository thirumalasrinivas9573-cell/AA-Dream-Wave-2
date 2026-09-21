"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { CommunityNav, CommunityPageHeader } from "@/components/community/community-nav";
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
import type { CommunityKind } from "@/types/community";

const KINDS: Array<{ id: "all" | CommunityKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "public", label: "Public" },
  { id: "institution", label: "Institution" },
  { id: "company", label: "Company" },
  { id: "course", label: "Course" },
  { id: "subject", label: "Subject" },
  { id: "project", label: "Project" },
];

export function CommunitiesPage() {
  const hydrate = useCommunityStore((s) => s.hydrate);
  const hydrated = useCommunityStore((s) => s.hydrated);
  const communities = useCommunityStore((s) => s.communities);
  const toggleJoinCommunity = useCommunityStore((s) => s.toggleJoinCommunity);
  const [filter, setFilter] = useState<"all" | CommunityKind>("all");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const filtered = useMemo(
    () =>
      communities.filter((item) => filter === "all" || item.kind === filter),
    [communities, filter],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading communities" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <CommunityPageHeader
        title="Communities"
        description="Public, institution, company, course, subject, and project spaces."
      />
      <CommunityNav />

      <div className="flex flex-wrap gap-2">
        {KINDS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No communities found"
          description="Try another community type filter."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((community) => (
            <Card
              key={community.id}
              className="transition-transform hover:-translate-y-0.5"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{community.name}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {community.kind}
                  </Badge>
                </div>
                <CardDescription>{community.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-xs">
                  {community.members.toLocaleString()} members
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {community.topics.map((topic) => (
                    <Badge key={topic} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={community.joined ? "outline" : "default"}
                  onClick={() => toggleJoinCommunity(community.id)}
                >
                  {community.joined ? "Leave" : "Join"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

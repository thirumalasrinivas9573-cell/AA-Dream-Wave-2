"use client";

import Link from "next/link";
import { useEffect } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { CommunityNav, CommunityPageHeader } from "@/components/community/community-nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COMMUNITY_ROUTES } from "@/constants/community";
import { cn } from "@/lib/utils";
import { useAiPlatformStore } from "@/store/ai-platform-store";
import { useCommunityStore } from "@/store/community-store";

export function MentorsPage() {
  const hydrate = useCommunityStore((s) => s.hydrate);
  const hydrated = useCommunityStore((s) => s.hydrated);
  const mentors = useCommunityStore((s) => s.mentors);
  const bookedMentorIds = useCommunityStore((s) => s.bookedMentorIds);
  const bookMentor = useCommunityStore((s) => s.bookMentor);
  const pushNotification = useAiPlatformStore((s) => s.pushNotification);
  const hydrateAi = useAiPlatformStore((s) => s.hydrate);
  const aiHydrated = useAiPlatformStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
    if (!aiHydrated) hydrateAi();
  }, [aiHydrated, hydrate, hydrateAi, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading mentors" />
      </div>
    );
  }

  const suggestions = mentors
    .filter((mentor) => mentor.available && !bookedMentorIds.includes(mentor.id))
    .slice(0, 2);

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <CommunityPageHeader
        title="Mentor experience"
        description="Profiles, sessions, booking, AI suggestions, and ratings."
      />
      <CommunityNav />

      {suggestions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>AI mentor suggestions</CardTitle>
            <CardDescription>
              Recommended mentors based on your activity and goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {suggestions.map((mentor) => (
              <Badge key={mentor.id} variant="secondary">
                {mentor.name} · {mentor.specialties[0]}
              </Badge>
            ))}
            <Link
              href={COMMUNITY_ROUTES.messages}
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "h-8",
              )}
            >
              Message mentors
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {mentors.length === 0 ? (
        <EmptyState
          title="No mentors available"
          description="Check back soon for featured mentors."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mentors.map((mentor) => {
            const booked = bookedMentorIds.includes(mentor.id);
            return (
              <Card key={mentor.id}>
                <CardHeader>
                  <CardTitle className="text-base">{mentor.name}</CardTitle>
                  <CardDescription>{mentor.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{mentor.rating}★</Badge>
                    <Badge variant="outline">{mentor.sessions} sessions</Badge>
                    <Badge variant={mentor.available ? "default" : "secondary"}>
                      {mentor.available ? "Available" : "Waitlist"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.specialties.map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={booked || !mentor.available}
                    onClick={() => {
                      bookMentor(mentor.id);
                      pushNotification(
                        `Mentor session booked with ${mentor.name}.`,
                      );
                    }}
                  >
                    {booked ? "Session booked" : "Book mentor session"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

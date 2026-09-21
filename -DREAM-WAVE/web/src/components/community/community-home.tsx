"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { CommunityNav, CommunityPageHeader } from "@/components/community/community-nav";
import { SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COMMUNITY_ROUTES } from "@/constants/community";
import { communityApi } from "@/lib/api/community";
import { mapCommunityApiPost } from "@/lib/community/map-post";
import { cn } from "@/lib/utils";
import { useCommunityStore } from "@/store/community-store";

export function CommunityHomePage() {
  const { token } = useAuth();
  const hydrate = useCommunityStore((s) => s.hydrate);
  const hydrated = useCommunityStore((s) => s.hydrated);
  const communities = useCommunityStore((s) => s.communities);
  const seedPosts = useCommunityStore((s) => s.posts);
  const mentors = useCommunityStore((s) => s.mentors);
  const activity = useCommunityStore((s) => s.activity);
  const [livePosts, setLivePosts] = useState(seedPosts);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const loadLive = useCallback(async () => {
    if (!token) {
      setLivePosts(seedPosts);
      return;
    }
    try {
      const data = await communityApi.getFeed(token, { mode: "for_you", limit: "12" });
      setLivePosts((data.posts ?? []).map(mapCommunityApiPost));
    } catch {
      setLivePosts(seedPosts);
    }
  }, [token, seedPosts]);

  useEffect(() => {
    if (!hydrated) return;
    void loadLive();
  }, [hydrated, loadLive]);

  const posts = token ? livePosts : seedPosts;

  const trending = useMemo(
    () => communities.filter((item) => item.trending),
    [communities],
  );
  const recommended = useMemo(
    () => communities.filter((item) => !item.joined).slice(0, 3),
    [communities],
  );
  const topics = useMemo(() => {
    const map = new Map<string, number>();
    for (const community of communities) {
      for (const topic of community.topics) {
        map.set(topic, (map.get(topic) || 0) + 1);
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic]) => topic);
  }, [communities]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading community" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <CommunityPageHeader
        eyebrow="AI Community & Collaboration"
        title="Community home"
        description="Collaborate with students, mentors, institutions, and companies in one intelligent space."
      />

      <CommunityNav />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmartStatCard label="Communities" value={communities.length} />
        <SmartStatCard label="Discussions" value={posts.length} />
        <SmartStatCard label="Mentors" value={mentors.length} />
        <SmartStatCard
          label="Joined"
          value={communities.filter((item) => item.joined).length}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Trending discussions
          </h2>
          {posts.length === 0 ? (
            <EmptyState
              title="No discussions yet"
              description="Start a conversation in one of your communities."
            />
          ) : (
            <div className="space-y-3">
              {posts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href={COMMUNITY_ROUTES.discussions}
                  className="focus-visible:ring-ring block rounded-2xl outline-none focus-visible:ring-2"
                >
                  <Card className="hover:bg-muted/30 transition-colors hover:-translate-y-0.5">
                    <CardHeader>
                      <CardTitle className="text-base">{post.title}</CardTitle>
                      <CardDescription>
                        {post.author} · {post.comments.length} comments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {post.body}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            AI recommended communities
          </h2>
          <div className="space-y-2">
            {recommended.map((item) => (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {item.kind}
                  </Badge>
                </CardHeader>
              </Card>
            ))}
            <Link
              href={COMMUNITY_ROUTES.communities}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Browse all communities
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Popular topics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Badge key={topic} variant="secondary">
                {topic}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity.slice(0, 5).map((item) => (
              <div key={item.id} className="text-sm">
                <p className="font-medium">{item.label}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(item.at).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Featured mentors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mentors.slice(0, 3).map((mentor) => (
              <div
                key={mentor.id}
                className="border-border rounded-xl border px-3 py-2 text-sm"
              >
                <p className="font-medium">{mentor.name}</p>
                <p className="text-muted-foreground text-xs">
                  {mentor.title} · {mentor.rating}★
                </p>
              </div>
            ))}
            <Link
              href={COMMUNITY_ROUTES.mentors}
              className={cn(buttonVariants({ size: "sm" }), "h-9")}
            >
              View mentors
            </Link>
          </CardContent>
        </Card>
      </div>

      {trending.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Trending communities
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {trending.map((item) => (
              <Card key={item.id} className="transition-transform hover:-translate-y-0.5">
                <CardHeader>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <CardDescription>
                    {item.members.toLocaleString()} members · {item.kind}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

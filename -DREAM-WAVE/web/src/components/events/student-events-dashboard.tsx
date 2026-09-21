"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_ROUTES } from "@/constants/events";
import { eventsApi, type UnifiedEvent } from "@/lib/api/events";

export function StudentEventsDashboard() {
  const { token, user } = useAuth();
  const [upcoming, setUpcoming] = useState<UnifiedEvent[]>([]);
  const [saved, setSaved] = useState<UnifiedEvent[]>([]);
  const [teamInvites, setTeamInvites] = useState<Array<{ teamId: string; teamName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await eventsApi.getMyEvents(token);
      setUpcoming(res.dashboard.upcoming);
      setSaved(res.dashboard.saved);
      setTeamInvites(res.dashboard.teamInvites);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token || user?.role !== "student") return <RouteLoading label="Authenticating" />;
  if (loading) return <RouteLoading label="Loading your events" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My events</h1>
          <p className="text-muted-foreground text-sm">Registered, saved, and upcoming events from live records.</p>
        </div>
        <Link href={EVENT_ROUTES.root} className={buttonVariants({ variant: "outline" })}>Discover events</Link>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming registered</CardTitle>
          <CardDescription>{upcoming.length} event(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming events" description="Register for events to see them here." />
          ) : (
            upcoming.map((e) => (
              <div key={`${e.source}-${e.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-muted-foreground text-xs">{e.startDate ? new Date(e.startDate).toLocaleString() : "NOT PROVIDED"}</p>
                </div>
                <Link href={EVENT_ROUTES.details(e.source, e.id)} className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Open
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {saved.length === 0 ? (
            <p className="text-muted-foreground text-sm">No saved events.</p>
          ) : (
            saved.map((e) => (
              <div key={`saved-${e.source}-${e.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <p className="font-medium">{e.title}</p>
                <Link href={EVENT_ROUTES.details(e.source, e.id)} className={buttonVariants({ size: "sm", variant: "outline" })}>
                  View
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {teamInvites.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Team invitations</CardTitle></CardHeader>
          <CardContent>
            {teamInvites.map((t) => (
              <p key={t.teamId} className="text-sm">Invited to team: {t.teamName}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

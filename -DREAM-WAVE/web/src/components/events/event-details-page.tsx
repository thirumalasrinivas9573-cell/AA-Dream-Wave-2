"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { AiInsightCard } from "@/components/institution/analytics/analytics-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EVENT_ROUTES } from "@/constants/events";
import { eventsApi, type EventDetails, type EventSource } from "@/lib/api/events";

export function EventDetailsPage() {
  const params = useParams<{ source: string; id: string }>();
  const { token, user } = useAuth();
  const source = params.source as EventSource;
  const id = params.id;

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await eventsApi.getDetails(token, source, id);
      setEvent(res.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [token, source, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRegister() {
    if (!token) return;
    setActionLoading(true);
    setError(null);
    try {
      await eventsApi.register(token, source, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSave() {
    if (!token) return;
    await eventsApi.toggleSaved(token, source, id);
    await load();
  }

  async function handleCreateTeam() {
    if (!token || !teamName.trim()) return;
    setActionLoading(true);
    try {
      await eventsApi.createTeam(token, source, id, { name: teamName.trim() });
      setTeamName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Team creation failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function loadAiPrep() {
    if (!token) return;
    const res = await eventsApi.getAiInsights(token, "EVENT_PREPARATION", { source, sourceId: id });
    setAiInsight(res.insights.insight.interpretation);
  }

  if (!token || user?.role !== "student") return <RouteLoading label="Authenticating" />;
  if (loading) return <RouteLoading label="Loading event" />;
  if (!event) {
    return (
      <EmptyState title="Event not found" description="This event may be private or unavailable." />
    );
  }

  const eligibility = event.eligibility;
  const regLabel = event.registrationFull
    ? "REGISTRATION FULL"
    : event.registrationOpen
      ? eligibility?.result === "NOT_ELIGIBLE"
        ? "Not eligible"
        : eligibility?.result === "NEEDS_REVIEW"
          ? "Needs review"
          : "Registration open"
      : "Registration closed";

  return (
    <div className="container-app flex max-w-4xl flex-1 flex-col gap-6 py-6 sm:py-8">
      <Link href={EVENT_ROUTES.root} className={buttonVariants({ variant: "ghost", className: "w-fit" })}>
        ← Back to events
      </Link>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{event.category.replace(/_/g, " ")}</Badge>
          {event.isRegistered ? <Badge>Registered</Badge> : <Badge variant="secondary">{regLabel}</Badge>}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{event.title}</h1>
        <p className="text-muted-foreground text-sm">Organizer: {event.organizer}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Start: {event.startDate ? new Date(event.startDate).toLocaleString() : "NOT PROVIDED"}</p>
            <p>Registration deadline: {event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleString() : "NOT PROVIDED"}</p>
            <p>Mode: {event.mode}</p>
            <p>Venue: {event.venue}</p>
            <p>Location: {[event.city, event.country].filter((v) => v && v !== "NOT PROVIDED").join(", ") || "NOT PROVIDED"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Eligibility & skills</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {eligibility?.checks?.map((c: { label: string; status: string; detail?: string }) => (
              <p key={c.label}>
                {c.label}: <span className="font-medium">{c.status}</span>
                {c.detail ? ` — ${c.detail}` : ""}
              </p>
            ))}
            <p>
              Skills: {event.requiredSkills.length ? event.requiredSkills.join(", ") : "NOT PROVIDED"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{event.description || "NOT PROVIDED"}</p>
        </CardContent>
      </Card>

      {event.hackathonDetails ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hackathon details</CardTitle>
            <CardDescription>Team size {event.hackathonDetails.teamSizeMin}–{event.hackathonDetails.teamSizeMax}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {event.hackathonDetails.problemStatements?.map((p) => (
              <div key={p.title}>
                <p className="font-medium">{p.title}</p>
                <p className="text-muted-foreground">{p.description}</p>
              </div>
            ))}
            {event.hackathonDetails.prizes?.length ? (
              <div>
                <p className="font-medium">Prizes</p>
                {event.hackathonDetails.prizes.map((p) => (
                  <p key={p.label}>{p.label}: {p.description || "NOT PROVIDED"}</p>
                ))}
              </div>
            ) : (
              <p>Prizes: NOT PROVIDED</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!event.isRegistered && event.registrationOpen && !event.registrationFull && eligibility?.result !== "NOT_ELIGIBLE" ? (
          <Button type="button" disabled={actionLoading} onClick={() => void handleRegister()}>
            Register
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => void handleSave()}>
          {event.saved ? "Unsave" : "Save event"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void loadAiPrep()}>
          AI preparation
        </Button>
      </div>

      {event.isHackathon && event.isRegistered && !event.myTeam ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Create team</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name" aria-label="Team name" />
            <Button type="button" disabled={actionLoading} onClick={() => void handleCreateTeam()}>Create</Button>
          </CardContent>
        </Card>
      ) : null}

      {event.myTeam ? (
        <Alert>Your team: {event.myTeam.name} ({event.myTeam.role})</Alert>
      ) : null}

      {aiInsight ? (
        <AiInsightCard
          title="Event preparation"
          description="Based on event requirements and your profile evidence."
          points={[aiInsight]}
        />
      ) : null}
    </div>
  );
}

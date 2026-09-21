"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark, Calendar, MessageSquare, Search, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  opportunityIntelligenceApi,
  type IntelligenceDashboard,
  type OpportunityItem,
} from "@/lib/api/opportunity-intelligence";
import { cn } from "@/lib/utils";

function MatchBadge({ state }: { state: string }) {
  const variant =
    state === "STRONG_MATCH" || state === "MATCH"
      ? "default"
      : state === "PARTIAL_MATCH"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{state.replace(/_/g, " ")}</Badge>;
}

function OpportunityRow({ item }: { item: OpportunityItem }) {
  return (
    <div className="border-border flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3">
      <div>
        <p className="font-medium">{item.title}</p>
        <p className="text-muted-foreground text-xs">{item.organization}</p>
        {item.whyRecommended ? (
          <p className="text-muted-foreground mt-1 text-xs">{item.whyRecommended}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <MatchBadge state={item.matchState} />
        {item.daysRemaining != null ? (
          <Badge variant="outline">{item.daysRemaining}d left</Badge>
        ) : null}
        <Link
          href={`/opportunities/intelligence/${item.source}/${item.opportunityId}`}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          View
        </Link>
      </div>
    </div>
  );
}

export function OpportunityIntelligenceDashboard() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachQ, setCoachQ] = useState("");
  const [coachA, setCoachA] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<OpportunityItem[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await opportunityIntelligenceApi.dashboard(token);
      setDashboard(res.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const askCoach = async () => {
    if (!token || !coachQ.trim()) return;
    try {
      const res = await opportunityIntelligenceApi.coach(token, coachQ.trim());
      setCoachA(res.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coach request failed");
    }
  };

  const runSearch = async () => {
    if (!token || !searchQ.trim()) return;
    try {
      const res = await opportunityIntelligenceApi.search(token, searchQ.trim());
      setSearchResults(res.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  };

  if (loading) return <RouteLoading label="Loading opportunity intelligence" />;

  if (!dashboard?.hasInstitutionLink) {
    return (
      <EmptyState
        title="No institution link"
        description="Link your account to an institution to unlock smart opportunity matching."
      />
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/opportunities" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ArrowLeft className="size-4" />
          Opportunities
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Opportunity Intelligence</h1>
        <p className="text-muted-foreground text-sm">
          Smart discovery, explainable matching, and application strategy — not employment guarantees.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex gap-2">
        <Input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search by role, skill, company…"
          aria-label="Search opportunities"
        />
        <Button type="button" variant="outline" onClick={() => void runSearch()}>
          <Search className="size-4" />
        </Button>
      </div>

      {searchResults.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchResults.map((item) => (
              <OpportunityRow key={`${item.source}-${item.opportunityId}`} item={item} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4" />
              Recommended
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.sections.recommended.length ? (
              dashboard.sections.recommended.map((item) => (
                <OpportunityRow key={`${item.source}-${item.opportunityId}`} item={item} />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No recommendations yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4" />
              Deadlines soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.deadlines.length ? (
              dashboard.deadlines.map((item) => (
                <OpportunityRow key={`dl-${item.source}-${item.opportunityId}`} item={item} />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No upcoming deadlines.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill gaps</CardTitle>
          <CardDescription>Top missing skills across your opportunity matches</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {dashboard.skillGaps.length ? (
            dashboard.skillGaps.map((g) => (
              <Badge key={g} variant="outline">{g}</Badge>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No gaps identified from available data.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bookmark className="size-4" />
            Saved
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dashboard.sections.saved.length ? (
            dashboard.sections.saved.map((item) => (
              <OpportunityRow key={`saved-${item.source}-${item.opportunityId}`} item={item} />
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Save opportunities to track them here.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" />
            Career Copilot
          </CardTitle>
          <CardDescription>{dashboard.coachPrompt}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={coachQ}
              onChange={(e) => setCoachQ(e.target.value)}
              placeholder="Which opportunity should I prepare for first?"
            />
            <Button type="button" disabled={!coachQ.trim()} onClick={() => void askCoach()}>
              Ask
            </Button>
          </div>
          {coachA ? (
            <div className="border-border bg-muted/30 rounded-xl border px-4 py-3 text-sm whitespace-pre-wrap">
              {coachA}
            </div>
          ) : null}
          <p className="text-muted-foreground text-xs">{dashboard.disclaimer}</p>
        </CardContent>
      </Card>
    </div>
  );
}

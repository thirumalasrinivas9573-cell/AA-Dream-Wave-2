"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { OpportunityMatchCard } from "@/components/opportunities/opportunity-match-card";
import { OpportunityAiPanel } from "@/components/opportunities/opportunity-ai-panel";
import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OPPORTUNITY_SECTIONS } from "@/constants/opportunities";
import {
  opportunitiesApi,
  type MatchedOpportunity,
  type OpportunityFeed,
} from "@/lib/api/opportunities";
import { cn } from "@/lib/utils";

export function OpportunitiesForYouPage() {
  const { token, user } = useAuth();
  const [feed, setFeed] = useState<OpportunityFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prepareItem, setPrepareItem] = useState<MatchedOpportunity | null>(null);
  const [section, setSection] = useState<string>("for-you");

  const load = useCallback(async () => {
    if (!token || user?.role !== "student") return;
    setLoading(true);
    setError(null);
    try {
      const res = await opportunitiesApi.getFeed(token);
      setFeed(res.feed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDismiss(item: MatchedOpportunity) {
    if (!token) return;
    try {
      await opportunitiesApi.feedback(token, {
        source: item.source,
        sourceId: item.id,
        action: "dismiss",
      });
      await load();
    } catch {
      /* ignore */
    }
  }

  if (loading) return <RouteLoading label="Loading opportunities" />;
  if (user?.role !== "student") {
    return <EmptyState title="Student access required" description="Sign in as a student to view personalized opportunities." />;
  }

  if (!feed?.hasInstitutionLink) {
    return (
      <EmptyState
        title="No institution link"
        description="Link your account to an institution to discover personalized opportunities."
      />
    );
  }

  const sectionItems =
    section === "closing-soon"
      ? feed.closingSoon
      : section === "skill-building"
        ? feed.skillBuilding
        : section === "explore"
          ? feed.explore
          : feed.strongMatches;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Opportunities For You</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Explainable matches based on your goals, skills, projects, and learning — not random recommendations.
          </p>
          {feed.contextSummary && (
            <div className="mt-3 flex flex-wrap gap-2">
              {feed.contextSummary.careerGoal !== "NOT PROVIDED" && (
                <Badge variant="outline">Goal: {feed.contextSummary.careerGoal}</Badge>
              )}
              <Badge variant="outline">{feed.contextSummary.skillCount} skills</Badge>
              <Badge variant="outline">{feed.contextSummary.projectCount} projects</Badge>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/opportunities/intelligence"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Opportunity Intelligence 2.0
          </Link>
          {token && <OpportunityAiPanel token={token} onPrepareSelect={setPrepareItem} />}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        {OPPORTUNITY_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id === "for-you" ? "for-you" : s.id)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              (section === "for-you" && s.id === "for-you") || section === s.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.label}
            {s.id === "for-you" && feed.totals.strong != null && ` (${feed.totals.strong})`}
            {s.id === "closing-soon" && feed.totals.closingSoon != null && ` (${feed.totals.closingSoon})`}
          </button>
        ))}
      </div>

      {prepareItem && token && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Preparation: {prepareItem.title}</CardTitle>
            <CardDescription>Based on actual opportunity requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <PreparationPreview token={token} item={prepareItem} onClose={() => setPrepareItem(null)} />
          </CardContent>
        </Card>
      )}

      {sectionItems.length === 0 ? (
        <EmptyState
          title="No matches in this section"
          description="Try Explore all opportunities, update your career goal, or add skills to your profile."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sectionItems.map((item) => (
            <OpportunityMatchCard
              key={`${item.source}:${item.id}`}
              item={item}
              onPrepare={setPrepareItem}
              {...(section === "for-you" ? { onDismiss: handleDismiss } : {})}
            />
          ))}
        </div>
      )}

      {section !== "explore" && feed.explore.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Explore All</CardTitle>
            <CardDescription>{feed.totals.all} opportunities in your institution scope</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {feed.explore.slice(0, 4).map((item) => (
              <OpportunityMatchCard key={`explore-${item.source}:${item.id}`} item={item} compact />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PreparationPreview({
  token,
  item,
  onClose,
}: {
  token: string;
  item: MatchedOpportunity;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void opportunitiesApi.prepare(token, item.source, item.id).then((res) => {
      setPlan(res.plan as Record<string, unknown>);
      setLoading(false);
    });
  }, [token, item.source, item.id]);

  if (loading) return <p className="text-muted-foreground text-sm">Loading preparation plan…</p>;
  const checklist = plan?.checklist as Record<string, string[]> | undefined;
  if (!checklist) return null;

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium">Required skills</p>
        <p className="text-muted-foreground">{(checklist.requiredSkills || []).join(", ") || "NOT PROVIDED"}</p>
      </div>
      {checklist.missingSkills && checklist.missingSkills.length > 0 && (
        <div>
          <p className="font-medium">Focus preparation on</p>
          <p className="text-muted-foreground">{checklist.missingSkills.join(", ")}</p>
        </div>
      )}
      {checklist.relevantProjects && checklist.relevantProjects.length > 0 && (
        <div>
          <p className="font-medium">Relevant projects</p>
          <p className="text-muted-foreground">{checklist.relevantProjects.join(", ")}</p>
        </div>
      )}
      <button type="button" className="text-primary text-sm underline" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Sparkles, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RecommendationFeedbackBar } from "@/components/personalization/recommendation-feedback-bar";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ContinueCard } from "@/components/dashboard/dashboard-ui";
import {
  personalizationApi,
  type NextBestAction,
  type PersonalizedHome,
  type PersonalizationRecommendation,
} from "@/lib/api/personalization";

export function PersonalizedHomePanel() {
  const { token } = useAuth();
  const [home, setHome] = useState<PersonalizedHome | null>(null);
  const [actions, setActions] = useState<NextBestAction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [h, a] = await Promise.all([
        personalizationApi.getHome(token),
        personalizationApi.getNextActions(token),
      ]);
      setHome(h.home);
      setActions(a.actions);
    } catch {
      setHome(null);
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return null;
  if (!home) return null;

  const priority = home.priority || actions[0];

  return (
    <div className="space-y-4">
      {priority ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Your priority
            </CardDescription>
            <CardTitle className="text-lg">{priority.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">{priority.reason}</p>
            <Link href={priority.href} className={cn(buttonVariants({ size: "sm" }))}>
              Take action
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {home.transparency.basedOn.length ? (
        <p className="text-muted-foreground text-xs">
          Based on: {home.transparency.basedOn.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export function PersonalizedRecommendationsPanel() {
  const { token } = useAuth();
  const [recs, setRecs] = useState<PersonalizationRecommendation[]>([]);
  const [opps, setOpps] = useState<Array<{ title?: string; href?: string; explanation?: string[]; source?: string; sourceId?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    personalizationApi.getHome(token).then((res) => {
      setRecs(res.home.forYou.recommendations || []);
      setOpps(res.home.forYou.opportunities || []);
    }).catch(() => {
      setRecs([]);
      setOpps([]);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-muted-foreground text-sm">Loading personalized recommendations...</p>;

  const hasApiData = recs.length > 0 || opps.length > 0;

  if (!hasApiData) {
    return (
      <EmptyState
        title="Personalized recommendations"
        description="Complete your career profile or link your institution account to unlock tailored suggestions."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {opps.map((opp) => (
        <Card key={`opp-${opp.source}-${opp.sourceId}`}>
          <CardHeader className="pb-2">
            <Badge variant="outline">Opportunity</Badge>
            <CardTitle className="text-base">{opp.title || "Recommended opportunity"}</CardTitle>
            {opp.explanation?.length ? (
              <CardDescription className="text-xs">{opp.explanation[0]}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            {opp.href ? (
              <Link href={opp.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                View
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {recs.map((rec) => (
        <div key={rec.key || rec.title} className="space-y-2">
          <ContinueCard
            href={rec.href || "/ai/career/copilot"}
            title={rec.title || rec.nextStep || "Recommendation"}
            meta={rec.explanation?.[0] || rec.reason || "Personalized for your career goal"}
            badge={rec.type || "Career"}
          />
          {rec.key && token ? (
            <RecommendationFeedbackBar
              recommendationKey={rec.key}
              {...(rec.type ? { recommendationType: rec.type } : {})}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function PersonalizedCopilotPrompt() {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState("What should I do next?");

  useEffect(() => {
    if (!token) return;
    personalizationApi.getHome(token).then((r) => {
      if (r.home.copilotPrompt) setPrompt(r.home.copilotPrompt);
    }).catch(() => undefined);
  }, [token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Career Copilot
        </CardTitle>
        <CardDescription>{prompt}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/ai/career/copilot" className={cn(buttonVariants())}>
          Open Copilot
        </Link>
      </CardContent>
    </Card>
  );
}

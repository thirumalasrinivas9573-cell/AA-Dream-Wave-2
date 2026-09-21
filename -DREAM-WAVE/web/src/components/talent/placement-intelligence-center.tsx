"use client";

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { talentIntelligenceApi } from "@/lib/api/talent-intelligence";
import type { CareerIntelligence, ReadinessState } from "@/types/talent-intelligence";

const READINESS_VARIANT: Record<ReadinessState, "default" | "secondary" | "outline" | "muted"> = {
  READY: "default",
  NEARLY_READY: "secondary",
  PREPARING: "outline",
  NEEDS_ATTENTION: "muted",
  INSUFFICIENT_DATA: "muted",
};

const AI_INTENTS = [
  { label: "Am I ready?", intent: "CAREER_READINESS" },
  { label: "Skill gaps", intent: "SKILL_GAPS" },
  { label: "Best match", intent: "OPPORTUNITY_MATCH" },
  { label: "What to learn", intent: "LEARNING_PREP" },
  { label: "Improve placement", intent: "IMPROVE_PLACEMENT" },
] as const;

export function PlacementIntelligenceCenter() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState<CareerIntelligence | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await talentIntelligenceApi.getCareerIntelligence(token);
      setIntel(res.intelligence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load career intelligence");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAi = async (intent: string) => {
    if (!token) return;
    setAiLoading(true);
    setAiInsight(null);
    try {
      const res = await talentIntelligenceApi.getAiInsight(token, intent);
      setAiInsight(res.insight.observation || res.insight.what);
    } catch (err) {
      setAiInsight(err instanceof Error ? err.message : "AI unavailable");
    } finally {
      setAiLoading(false);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !intel) return <RouteLoading label="Loading placement intelligence" />;

  if (!intel?.talentProfile?.hasInstitutionLink) {
    return (
      <EmptyState
        title="Institution profile required"
        description={intel?.talentProfile?.note || "Link your institution student profile to unlock placement intelligence."}
      />
    );
  }

  const readiness = intel.readiness;
  const pipeline = intel.pipeline?.totals;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm">Dream Wave · Career Intelligence</p>
        <h1 className="text-2xl font-semibold">Placement Intelligence Center</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Evidence-backed readiness, skill alignment, opportunities, and application pipeline — no fabricated scores.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Career readiness</CardDescription>
            <CardTitle className="text-lg">
              <Badge variant={READINESS_VARIANT[readiness.state]}>{readiness.state.replace(/_/g, " ")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">{readiness.explanation.what}</CardContent>
        </Card>
        <SmartStatCard label="Applications" value={String(pipeline?.applied ?? 0)} hint="Submitted" />
        <SmartStatCard label="Interviews" value={String(pipeline?.interviews ?? 0)} hint="Scheduled/completed" />
        <SmartStatCard label="Offers" value={String(pipeline?.offers ?? 0)} hint="In pipeline" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Readiness explanation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{readiness.explanation.why}</p>
            {readiness.explanation.strengths.length ? (
              <div>
                <p className="font-medium">Strengths</p>
                <ul className="text-muted-foreground list-disc pl-5">
                  {readiness.explanation.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {readiness.explanation.needsAttention.length ? (
              <div>
                <p className="font-medium">Needs attention</p>
                <ul className="text-muted-foreground list-disc pl-5">
                  {readiness.explanation.needsAttention.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill evidence</CardTitle>
            <CardDescription>Verified vs self-declared vs project-backed skills</CardDescription>
          </CardHeader>
          <CardContent>
            {(intel.talentProfile.evidenceGraph || []).slice(0, 8).length ? (
              <ul className="space-y-2 text-sm">
                {(intel.talentProfile.evidenceGraph || []).slice(0, 8).map((e) => (
                  <li key={e.skill} className="flex items-center justify-between gap-2">
                    <span>{e.skill}</span>
                    <Badge variant="outline">{e.evidenceLevel}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No skill evidence recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recommended opportunities</h2>
        {intel.opportunities.recommended.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {intel.opportunities.recommended.map((o) => (
              <Card key={`${o.source}-${o.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{o.title}</CardTitle>
                    <Badge variant="outline">{o.matchCategory.replace(/_/g, " ")}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {o.why.slice(0, 2).map((r, i) => (
                    <p key={i} className="text-muted-foreground">✓ {r}</p>
                  ))}
                  {o.gaps.slice(0, 2).map((g) => (
                    <p key={g} className="text-muted-foreground">⚠ {g}</p>
                  ))}
                  <div className="flex gap-2 pt-2">
                    {o.href ? (
                      <Link href={o.href} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        View
                      </Link>
                    ) : null}
                    <Link href="/opportunities" className={buttonVariants({ size: "sm" })}>
                      Explore
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No strong matches yet" description="Complete your profile and check Opportunities For You." />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Application pipeline</h2>
        {intel.pipeline.pipeline.length ? (
          <ul className="divide-border divide-y rounded-lg border">
            {intel.pipeline.pipeline.map((a) => (
              <li key={a.applicationId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div>
                  <p className="font-medium">{a.roleTitle}</p>
                  <p className="text-muted-foreground">{a.companyName} · {a.stage?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex gap-2">
                  {a.assessment ? <Badge variant="outline">{a.assessment.status}</Badge> : null}
                  {a.interview ? <Badge variant="outline">{a.interview.status}</Badge> : null}
                  {a.offer ? <Badge variant="secondary">{a.offer.status}</Badge> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No applications yet" description="Matched opportunities are ready to explore — applications require your confirmation." />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recommendations</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(["learning", "projects", "programs"] as const).map((kind) => (
            <Card key={kind}>
              <CardHeader>
                <CardTitle className="text-sm capitalize">{kind}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(intel.recommendations[kind] || []).slice(0, 3).map((r, i) => (
                  <div key={i}>
                    <p className="font-medium">{r.what}</p>
                    <p className="text-muted-foreground text-xs">{r.why}</p>
                  </div>
                ))}
                {!intel.recommendations[kind]?.length ? (
                  <p className="text-muted-foreground">None at this time</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">AI career assistant</h2>
        <div className="flex flex-wrap gap-2">
          {AI_INTENTS.map((q) => (
            <Button key={q.intent} size="sm" variant="outline" disabled={aiLoading} onClick={() => void runAi(q.intent)}>
              {q.label}
            </Button>
          ))}
        </div>
        {aiLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Analyzing career records…
          </div>
        ) : null}
        {aiInsight ? (
          <Card className="from-primary/5 border-primary/20 bg-gradient-to-br">
            <CardHeader>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" />
                Career intelligence
              </div>
              <CardDescription className="text-foreground text-sm">{aiInsight}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </section>

      {intel.disclaimer ? (
        <p className="text-muted-foreground text-xs">{intel.disclaimer}</p>
      ) : null}
    </div>
  );
}

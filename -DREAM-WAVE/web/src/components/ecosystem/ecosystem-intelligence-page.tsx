"use client";

import Link from "next/link";
import { Loader2, Network, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { AnalyticsSection } from "@/components/institution/analytics/analytics-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
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
import { Input } from "@/components/ui/input";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { ecosystemIntelligenceApi } from "@/lib/api/ecosystem-intelligence";
import type {
  AlignmentLevel,
  EcosystemOverview,
  EcosystemRecommendation,
  EcosystemSearchResult,
  MultiAgentEcosystemResult,
} from "@/types/ecosystem-intelligence";

const AI_INTENTS = [
  { label: "Ecosystem overview", intent: "ECOSYSTEM_OVERVIEW" },
  { label: "Industry skill trends", intent: "INDUSTRY_SKILL_TRENDS" },
  { label: "Program alignment", intent: "PROGRAM_ALIGNMENT" },
  { label: "Partnership intelligence", intent: "PARTNERSHIP_INTELLIGENCE" },
  { label: "Opportunity intelligence", intent: "OPPORTUNITY_INTELLIGENCE" },
  { label: "Skill gap analysis", intent: "SKILL_GAP_ANALYSIS" },
] as const;

const MULTI_AGENT_INTENTS = [
  { label: "Improve placement", intent: "IMPROVE_PLACEMENT" },
  { label: "Strengthen partnerships", intent: "STRENGTHEN_PARTNERSHIPS" },
  { label: "Align curriculum", intent: "ALIGN_CURRICULUM" },
  { label: "Boost program engagement", intent: "BOOST_PROGRAM_ENGAGEMENT" },
] as const;

const ALIGNMENT_VARIANT: Record<AlignmentLevel, "default" | "secondary" | "outline" | "muted"> = {
  STRONG_ALIGNMENT: "default",
  GOOD_ALIGNMENT: "secondary",
  PARTIAL_ALIGNMENT: "outline",
  NEEDS_ATTENTION: "muted",
};

type Props = {
  portal: "institution" | "company";
};

export function EcosystemIntelligencePage({ portal }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<EcosystemOverview | null>(null);
  const [alignmentLevel, setAlignmentLevel] = useState<AlignmentLevel | null>(null);
  const [alignmentExplanation, setAlignmentExplanation] = useState<{
    what: string;
    why: string;
    source: string;
  } | null>(null);
  const [skillGaps, setSkillGaps] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<EcosystemRecommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EcosystemSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<string>("rule");
  const [multiAgent, setMultiAgent] = useState<MultiAgentEcosystemResult | null>(null);
  const [intelHub, setIntelHub] = useState<Record<string, unknown> | null>(null);
  const [industryPrograms, setIndustryPrograms] = useState<unknown[]>([]);

  const programsHref =
    portal === "institution" ? INSTITUTION_ROUTES.programs : "/company/programs";
  const partnersHref =
    portal === "institution" ? INSTITUTION_ROUTES.industryNetwork : COMPANY_ROUTES.institutionNetwork;

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [ov, skills, recs, hub, programs] = await Promise.all([
        ecosystemIntelligenceApi.getOverview(token),
        ecosystemIntelligenceApi.getSkillAlignment(token),
        ecosystemIntelligenceApi.getRecommendations(token),
        portal === "institution"
          ? ecosystemIntelligenceApi.getInstitutionHub(token)
          : ecosystemIntelligenceApi.getCompanyHub(token),
        ecosystemIntelligenceApi.getPrograms(token),
      ]);
      setOverview(ov.ecosystem);
      setIntelHub(hub.hub);
      setIndustryPrograms((programs.programs as { programs?: unknown[] })?.programs || []);
      setAlignmentLevel(skills.alignment.alignmentLevel);
      setAlignmentExplanation(skills.alignment.explanation);
      setSkillGaps(
        skills.alignment.programAlignment.potentialCurriculumGaps.slice(0, 6),
      );
      setRecommendations(recs.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ecosystem intelligence");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const runSearch = async () => {
    if (!token || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await ecosystemIntelligenceApi.search(token, searchQuery.trim());
      setSearchResults(res.results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const runAiInsight = async (intent: string) => {
    if (!token) return;
    setAiLoading(true);
    setAiInsight(null);
    try {
      const res = await ecosystemIntelligenceApi.getAiInsights(token, intent);
      setAiInsight(res.insight.observation || res.insight.what);
      setAiMode(res.source);
    } catch (err) {
      setAiInsight(err instanceof Error ? err.message : "AI insight unavailable");
    } finally {
      setAiLoading(false);
    }
  };

  const runMultiAgent = async (intent: string) => {
    if (!token) return;
    setAiLoading(true);
    setMultiAgent(null);
    try {
      const res = await ecosystemIntelligenceApi.runMultiAgent(token, intent);
      setMultiAgent(res);
    } catch (err) {
      setMultiAgent({
        intent,
        synthesis: err instanceof Error ? err.message : "Multi-agent request failed",
        specialists: {},
        mode: "error",
      });
    } finally {
      setAiLoading(false);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !overview) return <RouteLoading label="Loading ecosystem intelligence" />;

  const metrics = overview?.overview;

  return (
    <div className="space-y-10">
      <InstitutionPageHeader
        eyebrow={portal === "institution" ? "Institution platform" : "Company platform"}
        title="Ecosystem Intelligence"
        description="Unified view of partnerships, programs, industry alignment, recruitment, and explainable recommendations — grounded in authorized data only."
        actions={
          <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
            Refresh
          </Button>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmartStatCard
          label="Active partnerships"
          value={String(metrics?.activePartnerships ?? 0)}
          hint={`${metrics?.pendingPartnershipRequests ?? 0} pending`}
        />
        <SmartStatCard
          label="Active programs"
          value={String(metrics?.activePrograms ?? 0)}
          hint={`${metrics?.programsWithRegistrationOpen ?? 0} open registration`}
        />
        <SmartStatCard
          label="Upcoming events"
          value={String(metrics?.upcomingEvents ?? 0)}
          hint="In ecosystem scope"
        />
        <SmartStatCard
          label="Open opportunities"
          value={String((metrics?.openJobs ?? 0) + (metrics?.openInternships ?? 0))}
          hint={`${metrics?.openJobs ?? 0} jobs · ${metrics?.openInternships ?? 0} internships`}
        />
      </section>

      {intelHub ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{portal === "institution" ? "Institution" : "Company"} intelligence</CardTitle>
              <CardDescription>Profile and active areas from authorized records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{(intelHub.profile as { name?: string })?.name}</p>
              {(intelHub.intelligence as { activeAreas?: string[] })?.activeAreas?.length ? (
                <p>Active: {(intelHub.intelligence as { activeAreas: string[] }).activeAreas.join(", ")}</p>
              ) : null}
              {(intelHub.intelligence as { attention?: string[] })?.attention?.length ? (
                <Alert variant="warning">
                  {(intelHub.intelligence as { attention: string[] }).attention.join("; ")}
                </Alert>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Program intelligence</CardTitle>
              <CardDescription>Industry programs with participant counts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {industryPrograms.length ? (
                industryPrograms.slice(0, 5).map((p) => {
                  const prog = p as { id?: string; title?: string; participants?: { active?: number } };
                  return (
                    <p key={prog.id || prog.title}>
                      {prog.title} · {prog.participants?.active ?? 0} active participant(s)
                    </p>
                  );
                })
              ) : (
                <p className="text-muted-foreground">No industry programs configured yet.</p>
              )}
              <Link href={programsHref} className={buttonVariants({ size: "sm", variant: "outline" })}>
                View programs
              </Link>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="size-4" aria-hidden="true" />
              Industry alignment
            </CardTitle>
            <CardDescription>Curriculum and program skills vs industry demand from partner records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alignmentLevel ? (
              <Badge variant={ALIGNMENT_VARIANT[alignmentLevel]}>
                {alignmentLevel.replace(/_/g, " ")}
              </Badge>
            ) : null}
            {alignmentExplanation ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">What:</span> {alignmentExplanation.what}</p>
                <p className="text-muted-foreground"><span className="font-medium text-foreground">Why:</span> {alignmentExplanation.why}</p>
                <p className="text-muted-foreground text-xs">Source: {alignmentExplanation.source}</p>
              </div>
            ) : (
              <EmptyState title="No alignment data" description="Skill alignment appears when programs and partner demand records exist." />
            )}
            {skillGaps.length ? (
              <div>
                <p className="mb-2 text-sm font-medium">Potential curriculum gaps</p>
                <div className="flex flex-wrap gap-2">
                  {skillGaps.map((s) => (
                    <Badge key={s} variant="outline">{s}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student & recruitment outcomes</CardTitle>
            <CardDescription>Aggregate metrics — no individual student data exposed.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <SmartStatCard
              label="Applications"
              value={String(metrics?.applicationsSubmitted ?? 0)}
              hint="Submitted in scope"
            />
            <SmartStatCard
              label="Placements / hires"
              value={String(metrics?.studentsPlaced ?? 0)}
              hint={portal === "institution" ? "Placement outcomes" : "Pipeline hires"}
            />
          </CardContent>
        </Card>
      </div>

      <AnalyticsSection
        title="Ecosystem recommendations"
        description="Explainable suggestions with what, why, and source — never fabricated outcomes."
      >
        {recommendations.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((rec) => (
              <Card key={rec.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{rec.title}</CardTitle>
                    <Badge variant={rec.priority === "high" ? "default" : "outline"}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <CardDescription>{rec.type.replace(/_/g, " ")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><span className="font-medium">What:</span> {rec.what}</p>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Why:</span> {rec.why}</p>
                  <p className="text-muted-foreground text-xs">Source: {rec.source}</p>
                  {rec.href ? (
                    <Link href={rec.href} className="text-primary text-xs font-medium hover:underline">
                      View related →
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No recommendations yet"
            description="Recommendations appear when partnerships, programs, or skill gaps are detected in your ecosystem."
          />
        )}
      </AnalyticsSection>

      <AnalyticsSection title="Quick links" description="Navigate to related ecosystem modules.">
        <div className="flex flex-wrap gap-2">
          <Link href={partnersHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Partnerships
          </Link>
          <Link href={programsHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Programs
          </Link>
          {portal === "institution" ? (
            <>
              <Link href={INSTITUTION_ROUTES.placements} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Placements
              </Link>
              <Link href={INSTITUTION_ROUTES.events} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Events
              </Link>
              <Link href={INSTITUTION_ROUTES.commandCenter} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Command center
              </Link>
            </>
          ) : (
            <>
              <Link href={COMPANY_ROUTES.recruitment} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Recruitment
              </Link>
              <Link href={COMPANY_ROUTES.analytics} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Analytics
              </Link>
            </>
          )}
        </div>
      </AnalyticsSection>

      <AnalyticsSection title="Ecosystem search" description="Search programs and partnerships within your authorized scope.">
        <div className="flex gap-2">
          <Input
            placeholder="Search programs, partners…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runSearch()}
            aria-label="Ecosystem search query"
          />
          <Button type="button" onClick={() => void runSearch()} disabled={searching}>
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Search
          </Button>
        </div>
        {searchResults.length ? (
          <ul className="divide-border divide-y rounded-lg border">
            {searchResults.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-muted-foreground text-xs">{r.kind} · {r.subtitle || r.status}</p>
                </div>
                {r.href ? (
                  <Link href={r.href} className="text-primary text-xs hover:underline">Open</Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : searchQuery && !searching ? (
          <p className="text-muted-foreground text-sm">No results for &quot;{searchQuery}&quot;</p>
        ) : null}
      </AnalyticsSection>

      <AnalyticsSection
        title="AI ecosystem assistant"
        description="Authorized ecosystem insights. Uses rule-based intelligence when OpenAI is unavailable."
      >
        <div className="flex flex-wrap gap-2">
          {AI_INTENTS.map((q) => (
            <Button
              key={q.intent}
              type="button"
              size="sm"
              variant="outline"
              disabled={aiLoading}
              onClick={() => void runAiInsight(q.intent)}
            >
              {q.label}
            </Button>
          ))}
        </div>
        {aiLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Analyzing ecosystem records…
          </div>
        ) : null}
        {aiInsight ? (
          <Card className="from-primary/5 border-primary/20 bg-gradient-to-br">
            <CardHeader>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" />
                Mode: {aiMode === "ai" ? "AI-assisted" : "Rule-based"}
              </div>
              <CardDescription className="text-foreground text-sm">{aiInsight}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </AnalyticsSection>

      <AnalyticsSection
        title="Multi-agent ecosystem request"
        description="Specialist agents analyze placement, partnerships, curriculum, and programs — merged into one synthesis."
      >
        <div className="flex flex-wrap gap-2">
          {MULTI_AGENT_INTENTS.map((q) => (
            <Button
              key={q.intent}
              type="button"
              size="sm"
              variant="secondary"
              disabled={aiLoading}
              onClick={() => void runMultiAgent(q.intent)}
            >
              {q.label}
            </Button>
          ))}
        </div>
        {multiAgent ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Synthesis</CardTitle>
              <CardDescription>{multiAgent.intent.replace(/_/g, " ")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>{multiAgent.synthesis}</p>
              {multiAgent.specialists && Object.keys(multiAgent.specialists).length ? (
                <div className="space-y-2">
                  <p className="font-medium">Specialist contributions</p>
                  <ul className="space-y-2">
                    {Object.entries(multiAgent.specialists).map(([agent, detail]) => (
                      <li key={agent} className="border-border rounded-md border p-3">
                        <p className="font-medium capitalize">{agent.replace(/_/g, " ")}</p>
                        <p className="text-muted-foreground">{detail.observation}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </AnalyticsSection>
    </div>
  );
}

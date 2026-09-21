"use client";

import Link from "next/link";
import { ArrowLeft, FolderKanban, Hammer, MessageSquare, Sparkles, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  projectIntelligenceApi,
  type ProjectDashboard,
  type ProjectRecommendation,
} from "@/lib/api/project-intelligence";

export function ProjectIntelligenceDashboard() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [coachQ, setCoachQ] = useState("");
  const [coachA, setCoachA] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await projectIntelligenceApi.dashboard(token);
      setDashboard(res.dashboard);
      setActiveId(res.dashboard.activeProject?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildProject = async () => {
    if (!token || !idea.trim()) return;
    setBusy("build");
    setError(null);
    try {
      const res = await projectIntelligenceApi.build(token, idea.trim());
      setActiveId(res.project._id);
      await load();
      setIdea("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Build failed");
    } finally {
      setBusy(null);
    }
  };

  const askCoach = async () => {
    if (!token || !coachQ.trim() || !activeId) return;
    const res = await projectIntelligenceApi.coachChat(token, activeId, coachQ.trim());
    setCoachA(res.answer);
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading || !dashboard) return <RouteLoading label="Loading project intelligence" />;

  return (
    <div className="container-app space-y-6 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/community/projects" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Projects
        </Link>
        <Link href="/learn/intelligence" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Skill Intelligence
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">AI Project Builder</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Skill → project → evidence → portfolio → opportunity. AI plans and coaches — you build and demonstrate.
        </p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hammer className="h-4 w-4" />
            Build from idea
          </CardTitle>
          <CardDescription>AI generates plan, architecture, and milestones — not a false completion claim.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="I want to build an AI chatbot"
            className="max-w-md"
            onKeyDown={(e) => e.key === "Enter" && void buildProject()}
          />
          <Button disabled={!!busy || !idea.trim()} onClick={() => void buildProject()}>
            <Sparkles className="mr-1 h-4 w-4" />
            {busy === "build" ? "Planning…" : "Generate project plan"}
          </Button>
        </CardContent>
      </Card>

      {dashboard.activeProject ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dashboard.activeProject.title}</CardTitle>
            <CardDescription>
              {dashboard.activeProject.status} · {dashboard.activeProject.progress}% · {dashboard.activeProject.health}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Current milestone</p>
              <p className="text-sm">{dashboard.activeProject.currentMilestone || "—"}</p>
              <p className="text-muted-foreground mt-3 mb-1 text-xs font-medium uppercase">Skills</p>
              <div className="flex flex-wrap gap-1">
                {dashboard.activeProject.skills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Evidence types</p>
              <p className="text-sm">{dashboard.activeProject.evidence.join(", ") || "None yet"}</p>
              <p className="text-muted-foreground mt-3 mb-1 text-xs font-medium uppercase">Tasks</p>
              <ul className="text-sm">
                {dashboard.currentTasks.map((t) => (
                  <li key={t.id}>{t.completed ? "✓" : "○"} {t.title}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Skill-to-project recommendations
          </CardTitle>
          <CardDescription>Career goal: {dashboard.careerGoal || "Set in Skill Intelligence"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.recommendations.length ? dashboard.recommendations.map((r: ProjectRecommendation) => (
            <div key={r.skill} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium">{r.title}</span>
                <Badge variant="outline">{r.difficulty}</Badge>
              </div>
              <p>{r.objective}</p>
              <p className="text-muted-foreground mt-1 text-xs">Why: {r.why}</p>
              <p className="text-muted-foreground text-xs">Evidence needed: {r.expectedEvidence?.join(", ")}</p>
            </div>
          )) : (
            <p className="text-muted-foreground text-sm">Set a career goal to get skill-based project ideas.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              AI Project Coach
            </CardTitle>
            <CardDescription>{dashboard.coachPrompt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!activeId ? (
              <p className="text-muted-foreground text-sm">Generate or select a project first.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Input value={coachQ} onChange={(e) => setCoachQ(e.target.value)} placeholder="What is the architecture?" className="max-w-md" />
                  <Button size="sm" variant="outline" onClick={() => void askCoach()}>Ask</Button>
                </div>
                {coachA ? (
                  <div className="rounded-lg border p-3 text-xs">
                    <Badge variant="secondary" className="mb-2">AI PROJECT COACH</Badge>
                    <pre className="whitespace-pre-wrap">{coachA}</pre>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-4 w-4" />
              My projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard.projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className={cn("hover:bg-muted/50 w-full rounded-lg border p-2 text-left", activeId === p.id && "border-primary")}
                onClick={() => setActiveId(p.id)}
              >
                {p.title} · {p.status} · {p.progress}%
              </button>
            ))}
            {!dashboard.projects.length ? (
              <p className="text-muted-foreground">No projects yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

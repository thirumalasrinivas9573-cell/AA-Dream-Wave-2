"use client";

import { Award, Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AiPageHeader } from "@/components/ai/ai-shared";
import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import { useAiPlatformStore } from "@/store/ai-platform-store";
import type { AiRoadmapPhase } from "@/types/ai-platform";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;

export function AiRoadmapBuilderPage() {
  const { token } = useAuth();
  const hydrate = useAiPlatformStore((s) => s.hydrate);
  const hydrated = useAiPlatformStore((s) => s.hydrated);
  const roadmapProgress = useAiPlatformStore((s) => s.roadmapProgress);
  const setRoadmapProgress = useAiPlatformStore((s) => s.setRoadmapProgress);
  const toggleRoadmapStep = useAiPlatformStore((s) => s.toggleRoadmapStep);
  const addPrompt = useAiPlatformStore((s) => s.addPrompt);
  const pushNotification = useAiPlatformStore((s) => s.pushNotification);

  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const [levelDraft, setLevelDraft] = useState<string | null>(null);
  const [phasesDraft, setPhasesDraft] = useState<AiRoadmapPhase[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  const goal = goalDraft ?? roadmapProgress?.goal ?? "";
  const level = levelDraft ?? roadmapProgress?.level ?? "beginner";
  const phases = useMemo(
    () => phasesDraft ?? roadmapProgress?.phases ?? [],
    [phasesDraft, roadmapProgress?.phases],
  );

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const totalSteps = useMemo(
    () => phases.reduce((sum, phase) => sum + (phase.steps?.length || 0), 0),
    [phases],
  );

  const completedCount = roadmapProgress?.completedSteps.length ?? 0;
  const progressPct =
    totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100);

  const badges = useMemo(() => {
    const list: Array<{ id: string; label: string; earned: boolean }> = [
      { id: "starter", label: "Path Starter", earned: phases.length > 0 },
      { id: "first", label: "First Milestone", earned: completedCount >= 1 },
      {
        id: "quarter",
        label: "25% Explorer",
        earned: progressPct >= 25,
      },
      {
        id: "half",
        label: "Halfway Hero",
        earned: progressPct >= 50,
      },
      {
        id: "finisher",
        label: "Roadmap Finisher",
        earned: progressPct >= 100 && totalSteps > 0,
      },
    ];
    return list;
  }, [completedCount, phases.length, progressPct, totalSteps]);

  const generate = async () => {
    const trimmed = goal.trim();
    if (!trimmed) {
      setGoalError("Enter a goal to generate a roadmap.");
      return;
    }
    if (!token) return;
    setGoalError(null);
    setError(null);
    setGenerating(true);
    addPrompt(trimmed, "roadmap");

    try {
      const data = await studentService.ai.roadmap(trimmed, level, token);
      const nextPhases = data.phases || [];
      setPhasesDraft(nextPhases);
      setGoalDraft(trimmed);
      setLevelDraft(level);
      setRoadmapProgress({
        goal: trimmed,
        level,
        phases: nextPhases,
        completedSteps: [],
        updatedAt: new Date().toISOString(),
      });
      pushNotification(`Roadmap generated for “${trimmed}”.`);
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <AiPageHeader
        title="AI Roadmap Experience"
        description="Interactive timeline, skill tree, milestones, and achievement badges."
      />

      {error ? (
        <AuthAlert variant="error" title="Roadmap error" description={error} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Roadmap builder</CardTitle>
          <CardDescription>
            Describe the outcome you want and your current level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ai-roadmap-goal">Goal</Label>
            <Input
              id="ai-roadmap-goal"
              value={goal}
              onChange={(e) => {
                setGoalDraft(e.target.value);
                if (goalError) setGoalError(null);
              }}
              placeholder="Become a full-stack developer"
              aria-invalid={Boolean(goalError)}
            />
            {goalError ? (
              <p className="text-destructive text-xs">{goalError}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Current level</Label>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={level === item ? "default" : "outline"}
                  onClick={() => setLevelDraft(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            className="h-10"
            disabled={generating}
            onClick={() => void generate()}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {generating ? "Generating…" : "Generate roadmap"}
          </Button>
        </CardContent>
      </Card>

      {generating ? (
        <div className="flex justify-center py-12">
          <Spinner label="Building roadmap" />
        </div>
      ) : null}

      {!generating && phases.length === 0 ? (
        <EmptyState
          title="No roadmap yet"
          description="Generate a roadmap to unlock the skill tree and milestones."
        />
      ) : null}

      {phases.length > 0 ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dynamic progress</CardTitle>
                <CardDescription>
                  {completedCount} of {totalSteps} steps complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-sm">{progressPct}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="size-4" aria-hidden="true" />
                  Achievement badges
                </CardTitle>
                <CardDescription>
                  Earn badges as you complete milestones.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <Badge
                    key={badge.id}
                    variant={badge.earned ? "default" : "outline"}
                    className={cn(!badge.earned && "opacity-50")}
                  >
                    {badge.label}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Skill tree</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {phases.map((phase, phaseIndex) => {
                const steps = phase.steps || [];
                const done = steps.filter((_, stepIndex) =>
                  roadmapProgress?.completedSteps.includes(
                    `${phaseIndex}-${stepIndex}`,
                  ),
                ).length;
                const unlocked =
                  phaseIndex === 0 ||
                  (phases[phaseIndex - 1]?.steps || []).every((_, stepIndex) =>
                    roadmapProgress?.completedSteps.includes(
                      `${phaseIndex - 1}-${stepIndex}`,
                    ),
                  );
                return (
                  <Card
                    key={`${phase.title}-tree-${phaseIndex}`}
                    className={cn(
                      "transition-transform",
                      unlocked ? "hover:-translate-y-0.5" : "opacity-60",
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">
                        {phase.title}
                      </CardTitle>
                      <CardDescription>
                        {unlocked ? `${done}/${steps.length} skills` : "Locked"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{
                            width: `${steps.length ? Math.round((done / steps.length) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Progress timeline
            </h2>
            <ol className="relative space-y-4 border-l pl-6">
              {phases.map((phase, phaseIndex) => (
                <li key={`${phase.title}-${phaseIndex}`} className="relative">
                  <span className="bg-primary absolute top-1.5 -left-[1.55rem] size-2.5 rounded-full" />
                  <Card className="transition-shadow hover:shadow-sm">
                    <CardHeader>
                      <CardTitle>
                        Milestone {phaseIndex + 1}: {phase.title}
                      </CardTitle>
                      <CardDescription>
                        {phase.duration} · {phase.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(phase.steps || []).map((step, stepIndex) => {
                        const key = `${phaseIndex}-${stepIndex}`;
                        const done =
                          roadmapProgress?.completedSteps.includes(key) ?? false;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleRoadmapStep(key)}
                            className={cn(
                              "border-border flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm transition",
                              done ? "bg-muted/60" : "hover:bg-muted/30",
                            )}
                            aria-pressed={done}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                                done
                                  ? "bg-primary text-primary-foreground border-transparent"
                                  : "border-border",
                              )}
                            >
                              {done ? <Check className="size-3" /> : null}
                            </span>
                            <span className={cn(done && "line-through opacity-70")}>
                              {step}
                            </span>
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </div>
  );
}

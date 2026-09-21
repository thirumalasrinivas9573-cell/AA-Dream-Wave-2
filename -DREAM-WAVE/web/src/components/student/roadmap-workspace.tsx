"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { AppError, toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import type { Goal, RoadmapData } from "@/types/student";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "skills", label: "Skills" },
  { id: "steps", label: "Journey" },
  { id: "courses", label: "Courses" },
  { id: "projects", label: "Projects" },
  { id: "salary", label: "Salary" },
  { id: "companies", label: "Companies" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function asTextList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return String(
            record.title || record.name || record.detail || record.notes || "",
          );
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string") return [value];
  return [];
}

export function RoadmapWorkspace() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const urlGoalId = searchParams.get("goalId");

  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal._id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function loadGoals() {
      setLoadingGoals(true);
      try {
        const data = await studentService.goals.list(token!);
        if (!active) return;
        const list = data.goals ?? [];
        setGoals(list);
        const preferred =
          (urlGoalId && list.find((goal) => goal._id === urlGoalId)?._id) ||
          list[0]?._id ||
          "";
        setSelectedGoalId(preferred);
      } catch (err) {
        if (!active) return;
        setError(toUserSafeMessage(err));
      } finally {
        if (active) setLoadingGoals(false);
      }
    }

    void loadGoals();
    return () => {
      active = false;
    };
  }, [token, urlGoalId]);

  const loadRoadmap = useCallback(async (goalId: string) => {
    if (!token || !goalId) return;
    setLoadingRoadmap(true);
    setError(null);
    setRoadmap(null);
    try {
      const data = await studentService.roadmap.get(goalId, token);
      setRoadmap(data.roadmap?.data ?? null);
    } catch (err) {
      if (err instanceof AppError && err.status === 404) {
        setRoadmap(null);
      } else {
        setError(toUserSafeMessage(err));
      }
    } finally {
      setLoadingRoadmap(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedGoalId) {
      queueMicrotask(() => {
        void loadRoadmap(selectedGoalId);
      });
    }
  }, [loadRoadmap, selectedGoalId]);

  const generate = async () => {
    if (!token || !selectedGoal) return;
    setGenerating(true);
    setError(null);
    try {
      const payload: {
        goalId: string;
        goalTitle: string;
        category?: string;
      } = {
        goalId: selectedGoal._id,
        goalTitle: selectedGoal.title,
      };
      if (selectedGoal.category) {
        payload.category = String(selectedGoal.category);
      }
      const data = await studentService.roadmap.generate(payload, token);
      setRoadmap(data.roadmap?.data ?? null);
      setTab("overview");
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const salaryText = useMemo(() => {
    if (!roadmap?.salary) return null;
    if (typeof roadmap.salary === "string") return roadmap.salary;
    const parts = [
      roadmap.salary.entry ? `Entry: ${roadmap.salary.entry}` : null,
      roadmap.salary.mid ? `Mid: ${roadmap.salary.mid}` : null,
      roadmap.salary.senior ? `Senior: ${roadmap.salary.senior}` : null,
      roadmap.salary.notes || null,
    ].filter(Boolean);
    return parts.join(" · ");
  }, [roadmap]);

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Student platform</p>
          <h1 className="text-3xl font-semibold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            AI career intelligence for skills, path, and opportunities.
          </p>
        </div>
        {roadmap ? (
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={generating || !selectedGoal}
            onClick={() => void generate()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {generating ? "Regenerating…" : "Regenerate"}
          </Button>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Select a goal</CardTitle>
          <CardDescription>
            Roadmaps are generated per goal. Create a goal first if the list is
            empty.
          </CardDescription>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              id="roadmap-goal"
              aria-label="Select goal for roadmap"
              className="border-input bg-background h-10 w-full rounded-lg border px-2.5 text-sm sm:max-w-md"
              value={selectedGoalId}
              disabled={loadingGoals || goals.length === 0}
              onChange={(event) => setSelectedGoalId(event.target.value)}
            >
              {goals.length === 0 ? (
                <option value="">No goals available</option>
              ) : (
                goals.map((goal) => (
                  <option key={goal._id} value={goal._id}>
                    {goal.title}
                    {goal.category ? ` (${goal.category})` : ""}
                  </option>
                ))
              )}
            </select>
            <Button
              type="button"
              className="h-10"
              disabled={generating || !selectedGoal}
              onClick={() => void generate()}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {generating ? "Building…" : "Generate roadmap"}
            </Button>
            {goals.length === 0 ? (
              <Link
                href={ROUTES.goals}
                className={cn(buttonVariants({ variant: "outline" }), "h-10")}
              >
                Create a goal
              </Link>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <AuthAlert variant="error" title="Roadmap error" description={error} />
      ) : null}

      {generating ? (
        <Card>
          <CardHeader>
            <CardTitle>Building career intelligence…</CardTitle>
            <CardDescription>
              Analyzing skills, courses, salary signals, and next steps. This can
              take up to a minute.
            </CardDescription>
            <div className="pt-4">
              <Spinner label="Generating roadmap" />
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {loadingGoals || loadingRoadmap ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading roadmap" />
        </div>
      ) : null}

      {!loadingGoals &&
      !loadingRoadmap &&
      !generating &&
      selectedGoal &&
      !roadmap ? (
        <EmptyState
          title="No roadmap yet"
          description="Generate career intelligence for this goal to unlock skills, journey steps, and opportunities."
          action={
            <Button type="button" onClick={() => void generate()}>
              Generate roadmap
            </Button>
          }
        />
      ) : null}

      {roadmap && !generating ? (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={tab === item.id ? "default" : "outline"}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Current stage</CardTitle>
                    <CardDescription className="text-foreground/90 whitespace-pre-wrap">
                      {roadmap.currentStage || "Not specified yet."}
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Overview snapshot</CardTitle>
                    <CardDescription className="text-foreground/90 whitespace-pre-wrap">
                      {(roadmap.overview || "Overview pending.").slice(0, 280)}
                      {(roadmap.overview?.length || 0) > 280 ? "…" : ""}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
              {roadmap.overview ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Full overview</CardTitle>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {roadmap.overview}
                    </p>
                  </CardHeader>
                </Card>
              ) : null}
              {roadmap.careerPaths?.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {roadmap.careerPaths.map((path, index) => (
                    <Card key={`${path.title}-${index}`}>
                      <CardHeader>
                        <CardTitle>{path.title || `Path ${index + 1}`}</CardTitle>
                        <CardDescription>{path.description}</CardDescription>
                        <p className="text-muted-foreground mt-2 text-xs">
                          {[path.avgSalary, path.demand ? `${path.demand} demand` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : null}
              {roadmap.milestones?.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Milestones</CardTitle>
                    <ol className="mt-3 space-y-3">
                      {roadmap.milestones.map((milestone, index) => (
                        <li key={`${milestone.title}-${index}`} className="text-sm">
                          <p className="font-medium">
                            {index + 1}. {milestone.title}
                          </p>
                          {milestone.timeframe ? (
                            <p className="text-muted-foreground text-xs">
                              {milestone.timeframe}
                            </p>
                          ) : null}
                          {milestone.description ? (
                            <p className="text-muted-foreground mt-1">
                              {milestone.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </CardHeader>
                </Card>
              ) : null}
            </div>
          ) : null}

          {tab === "skills" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {(roadmap.skills || []).map((skill, index) => (
                <Card key={`${skill.name}-${index}`} padding="sm">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {skill.name || `Skill ${index + 1}`}
                    </CardTitle>
                    <CardDescription>
                      {[skill.level, skill.priority].filter(Boolean).join(" · ")}
                    </CardDescription>
                    {skill.resources ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        {skill.resources}
                      </p>
                    ) : null}
                  </CardHeader>
                </Card>
              ))}
              {!roadmap.skills?.length ? (
                <EmptyState
                  title="No skills listed"
                  description="Regenerate the roadmap to populate skill recommendations."
                />
              ) : null}
            </div>
          ) : null}

          {tab === "steps" ? (
            <div className="space-y-3">
              {(roadmap.nextSteps || []).map((step, index) => (
                <Card key={`${step.title}-${index}`} padding="sm">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {index + 1}. {step.title || "Next step"}
                    </CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                    {step.timeframe ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        {step.timeframe}
                      </p>
                    ) : null}
                  </CardHeader>
                </Card>
              ))}
              {!roadmap.nextSteps?.length ? (
                <EmptyState
                  title="No journey steps yet"
                  description="Regenerate to build a sequenced learning journey."
                />
              ) : null}
            </div>
          ) : null}

          {tab === "courses" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {(roadmap.courses || []).map((course, index) => (
                <Card key={`${course.title}-${index}`} padding="sm">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {course.title || `Course ${index + 1}`}
                    </CardTitle>
                    <CardDescription>
                      {[course.provider, course.level].filter(Boolean).join(" · ")}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
              {!roadmap.courses?.length ? (
                <EmptyState
                  title="No courses listed"
                  description="Course suggestions appear after generation when available."
                />
              ) : null}
            </div>
          ) : null}

          {tab === "projects" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {(roadmap.projects || []).map((project, index) => (
                <Card key={`${project.title}-${index}`} padding="sm">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {project.title || `Project ${index + 1}`}
                    </CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                    {project.difficulty ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        {project.difficulty}
                      </p>
                    ) : null}
                  </CardHeader>
                </Card>
              ))}
              {!roadmap.projects?.length ? (
                <EmptyState
                  title="No projects listed"
                  description="Project ideas will show here after generation."
                />
              ) : null}
            </div>
          ) : null}

          {tab === "salary" ? (
            <Card>
              <CardHeader>
                <CardTitle>Salary outlook</CardTitle>
                <CardDescription className="text-foreground/90 whitespace-pre-wrap">
                  {salaryText || "Salary details were not included in this roadmap."}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {tab === "companies" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {asTextList(roadmap.companies).map((company, index) => (
                <Card key={`${company}-${index}`} padding="sm">
                  <CardHeader>
                    <CardTitle className="text-base">{company}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
              {!asTextList(roadmap.companies).length ? (
                <EmptyState
                  title="No companies listed"
                  description="Target companies will appear when the model returns them."
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

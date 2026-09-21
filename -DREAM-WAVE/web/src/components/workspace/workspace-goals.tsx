"use client";

import { useEffect, useMemo, useState } from "react";

import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  WorkspaceNav,
  WorkspacePageHeader,
} from "@/components/workspace/workspace-nav";
import { AI_GOAL_RECOMMENDATIONS } from "@/constants/workspace";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { WorkspaceGoalHorizon } from "@/types/workspace";

export function WorkspaceGoalsPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const goals = useWorkspaceStore((s) => s.goals);
  const addGoal = useWorkspaceStore((s) => s.addGoal);
  const updateGoalProgress = useWorkspaceStore((s) => s.updateGoalProgress);
  const removeGoal = useWorkspaceStore((s) => s.removeGoal);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [horizon, setHorizon] = useState<WorkspaceGoalHorizon>("short");
  const [category, setCategory] = useState("Career");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const shortGoals = useMemo(
    () => goals.filter((goal) => goal.horizon === "short"),
    [goals],
  );
  const longGoals = useMemo(
    () => goals.filter((goal) => goal.horizon === "long"),
    [goals],
  );
  const timeline = useMemo(
    () =>
      [...goals].sort((a, b) =>
        (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999"),
      ),
    [goals],
  );

  if (!hydrated) {
    return (
      <div className="container-app flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading goals" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <WorkspacePageHeader
        title="Goal management"
        description="Long-term and short-term goals with timeline, progress, and AI recommendations."
      />
      <WorkspaceNav />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create goal</CardTitle>
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim()) return;
              addGoal({
                title: title.trim(),
                description: description.trim() || "Workspace goal",
                horizon,
                progress: 0,
                category,
                ...(targetDate ? { targetDate } : {}),
              });
              setTitle("");
              setDescription("");
              setTargetDate("");
            }}
          >
            <Input
              className="h-10"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Goal title"
              aria-label="Goal title"
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              aria-label="Goal description"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                className="border-input bg-background h-10 rounded-lg border px-2 text-sm"
                value={horizon}
                onChange={(event) =>
                  setHorizon(event.target.value as WorkspaceGoalHorizon)
                }
                aria-label="Goal horizon"
              >
                <option value="short">Short term</option>
                <option value="long">Long term</option>
              </select>
              <Input
                className="h-10"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Category"
                aria-label="Goal category"
              />
              <Input
                type="date"
                className="h-10"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                aria-label="Target date"
              />
            </div>
            <Button type="submit" className="h-10 w-fit">
              Save goal
            </Button>
          </form>
          <div className="mt-4 space-y-2">
            <p className="text-muted-foreground text-xs">AI goal recommendations</p>
            <div className="flex flex-wrap gap-2">
              {AI_GOAL_RECOMMENDATIONS.map((item) => (
                <Button
                  key={item.title}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    addGoal({
                      title: item.title,
                      description: item.description,
                      horizon: item.horizon,
                      progress: 0,
                      category: item.category,
                      aiRecommended: true,
                    })
                  }
                >
                  {item.title}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Short term goals</h2>
          {shortGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onProgress={updateGoalProgress}
              onRemove={removeGoal}
            />
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Long term goals</h2>
          {longGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onProgress={updateGoalProgress}
              onRemove={removeGoal}
            />
          ))}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Goal timeline</h2>
        <ol className="relative space-y-3 border-l pl-5">
          {timeline.map((goal) => (
            <li key={goal.id} className="relative">
              <span className="bg-primary absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full" />
              <p className="font-medium">{goal.title}</p>
              <p className="text-muted-foreground text-xs">
                {goal.horizon} · {goal.targetDate ?? "No target date"} ·{" "}
                {goal.progress}%
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function GoalCard({
  goal,
  onProgress,
  onRemove,
}: {
  goal: {
    id: string;
    title: string;
    description: string;
    progress: number;
    category: string;
    aiRecommended?: boolean;
  };
  onProgress: (id: string, progress: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{goal.title}</CardTitle>
        <CardDescription>
          {goal.category}
          {goal.aiRecommended ? " · AI recommended" : ""}
        </CardDescription>
        <p className="mt-2 text-sm text-pretty">{goal.description}</p>
        <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onProgress(goal.id, goal.progress - 10)}
          >
            -10%
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onProgress(goal.id, goal.progress + 10)}
          >
            +10%
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onRemove(goal.id)}
          >
            Remove
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

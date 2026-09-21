"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { FormField } from "@/components/forms";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Z_INDEX } from "@/constants";
import { useKeyboard } from "@/hooks/use-keyboard";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import type { Goal } from "@/types/student";

const GOAL_CATEGORIES = [
  "Education",
  "Career",
  "Personal",
  "Health",
  "Finance",
] as const;

const goalFormSchema = z.object({
  title: z.string().min(2, "Enter a goal title"),
  description: z.string().optional(),
  category: z.enum(GOAL_CATEGORIES),
  deadline: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

type Filter = "all" | "active" | "completed";

export function GoalsWorkspace() {
  const { token } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [planLoadingId, setPlanLoadingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Career",
      deadline: "",
    },
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await studentService.goals.list(token);
      setGoals(data.goals ?? []);
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!editorOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [editorOpen]);

  useKeyboard(
    (event) => {
      if (event.key === "Escape") setEditorOpen(false);
    },
    { enabled: editorOpen },
  );

  const filtered = useMemo(() => {
    return goals.filter((goal) => {
      if (filter === "active") return !goal.completed;
      if (filter === "completed") return Boolean(goal.completed);
      return true;
    });
  }, [filter, goals]);

  const openCreate = () => {
    setEditing(null);
    reset({
      title: "",
      description: "",
      category: "Career",
      deadline: "",
    });
    setEditorOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    reset({
      title: goal.title,
      description: goal.description ?? "",
      category: (GOAL_CATEGORIES.includes(
        goal.category as (typeof GOAL_CATEGORIES)[number],
      )
        ? goal.category
        : "Career") as (typeof GOAL_CATEGORIES)[number],
      deadline: goal.deadline ? goal.deadline.slice(0, 10) : "",
    });
    setEditorOpen(true);
  };

  const onSave = handleSubmit(async (values) => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const payload: {
        title: string;
        description?: string;
        category: string;
        deadline?: string;
      } = {
        title: values.title,
        category: values.category,
      };
      if (values.description?.trim()) {
        payload.description = values.description.trim();
      }
      if (values.deadline) {
        payload.deadline = values.deadline;
      }

      if (editing) {
        await studentService.goals.update(editing._id, payload, token);
      } else {
        await studentService.goals.create(payload, token);
      }
      setEditorOpen(false);
      await load();
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setSaving(false);
    }
  });

  const onDelete = async (id: string) => {
    if (!token) return;
    try {
      await studentService.goals.remove(id, token);
      setGoals((prev) => prev.filter((goal) => goal._id !== id));
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  };

  const onGeneratePlan = async (goal: Goal) => {
    if (!token) return;
    setPlanLoadingId(goal._id);
    setError(null);
    try {
      const data = await studentService.goals.generatePlan(goal._id, token);
      setGoals((prev) =>
        prev.map((item) => {
          if (item._id !== goal._id) return item;
          const next: Goal = {
            ...item,
            ...(data.goal ?? {}),
          };
          const plan = data.steps ?? data.goal?.aiPlan ?? item.aiPlan;
          if (plan) {
            next.aiPlan = plan;
          }
          return next;
        }),
      );
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setPlanLoadingId(null);
    }
  };

  const onToggleComplete = async (goal: Goal) => {
    if (!token) return;
    try {
      const data = await studentService.goals.update(
        goal._id,
        { completed: !goal.completed, progress: goal.completed ? 0 : 100 },
        token,
      );
      setGoals((prev) =>
        prev.map((item) => (item._id === goal._id ? data.goal : item)),
      );
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  };

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Student platform</p>
          <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set targets and generate an AI plan for each goal.
          </p>
        </div>
        <Button type="button" className="h-10" onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          New goal
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "completed", label: "Completed" },
          ] as const
        ).map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {error ? (
        <AuthAlert variant="error" title="Goals error" description={error} />
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading goals" />
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Create your first goal to unlock AI planning and task tracking."
          action={
            <Button type="button" onClick={openCreate}>
              Create goal
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4">
        {filtered.map((goal) => (
          <Card key={goal._id} className={cn(goal.completed && "opacity-70")}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{goal.title}</CardTitle>
                  <CardDescription>
                    {goal.category || "General"}
                    {goal.deadline
                      ? ` · Due ${new Date(goal.deadline).toLocaleDateString()}`
                      : ""}
                    {typeof goal.progress === "number"
                      ? ` · ${goal.progress}%`
                      : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onToggleComplete(goal)}
                  >
                    {goal.completed ? "Mark active" : "Complete"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(goal)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={planLoadingId === goal._id}
                    onClick={() => void onGeneratePlan(goal)}
                  >
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    {planLoadingId === goal._id ? "Planning…" : "AI plan"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${goal.title}`}
                    onClick={() => setDeleteId(goal._id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              {goal.description ? (
                <p className="text-muted-foreground mt-3 text-sm text-pretty">
                  {goal.description}
                </p>
              ) : null}
              {Array.isArray(goal.aiPlan) && goal.aiPlan.length > 0 ? (
                <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
                  {goal.aiPlan.map((step, index) => (
                    <li key={`${goal._id}-step-${index}`}>
                      {typeof step === "string"
                        ? step
                        : step.title || step.step || "Step"}
                    </li>
                  ))}
                </ol>
              ) : null}
            </CardHeader>
          </Card>
        ))}
      </div>

      {editorOpen ? (
        <div
          className="fixed inset-0 flex items-end justify-center p-4 sm:items-center"
          style={{ zIndex: Z_INDEX.modal }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-editor-title"
        >
          <button
            type="button"
            className="bg-background/70 absolute inset-0 backdrop-blur-sm"
            aria-label="Close goal editor"
            onClick={() => setEditorOpen(false)}
          />
          <Card className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto scroll-region page-enter" padding="lg">
            <h2 id="goal-editor-title" className="text-xl font-semibold">
              {editing ? "Edit goal" : "New goal"}
            </h2>
            <form className="mt-5 space-y-4" onSubmit={onSave} noValidate>
              <FormField
                id="goal-title"
                label="Title"
                error={errors.title?.message}
                required
              >
                <Input
                  id="goal-title"
                  className="h-10"
                  disabled={saving}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={
                    errors.title ? "goal-title-error" : undefined
                  }
                  {...register("title")}
                />
              </FormField>
              <FormField
                id="goal-description"
                label="Description"
                error={errors.description?.message}
              >
                <Textarea
                  id="goal-description"
                  disabled={saving}
                  aria-invalid={Boolean(errors.description)}
                  {...register("description")}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="goal-category"
                  label="Category"
                  error={errors.category?.message}
                >
                  <select
                    id="goal-category"
                    className="form-control"
                    disabled={saving}
                    aria-invalid={Boolean(errors.category)}
                    {...register("category")}
                  >
                    {GOAL_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  id="goal-deadline"
                  label="Target date"
                  error={errors.deadline?.message}
                >
                  <Input
                    id="goal-deadline"
                    type="date"
                    className="h-10"
                    disabled={saving}
                    aria-invalid={Boolean(errors.deadline)}
                    {...register("deadline")}
                  />
                </FormField>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={saving}
                  onClick={() => setEditorOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-10" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete goal"
        description="Delete this goal? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) void onDelete(deleteId);
        }}
      />
    </div>
  );
}

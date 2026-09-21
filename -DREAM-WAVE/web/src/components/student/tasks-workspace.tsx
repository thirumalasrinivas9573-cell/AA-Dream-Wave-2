"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, Trash2 } from "lucide-react";
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
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import type { Task } from "@/types/student";

const taskFormSchema = z.object({
  title: z.string().min(2, "Enter a task title"),
  priority: z.enum(["High", "Medium", "Low"]),
  category: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

type Filter = "all" | "open" | "done";

export function TasksWorkspace() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      priority: "Medium",
      category: "General",
    },
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await studentService.tasks.list(token);
      setTasks(data.tasks ?? []);
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

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "open") return !task.completed;
      if (filter === "done") return Boolean(task.completed);
      return true;
    });
  }, [filter, tasks]);

  const onCreate = handleSubmit(async (values) => {
    if (!token) return;
    setError(null);
    try {
      const payload: {
        title: string;
        priority: string;
        category?: string;
      } = {
        title: values.title,
        priority: values.priority,
      };
      if (values.category?.trim()) {
        payload.category = values.category.trim();
      }
      const data = await studentService.tasks.create(payload, token);
      setTasks((prev) => [data.task, ...prev]);
      reset({ title: "", priority: "Medium", category: "General" });
      setCreating(false);
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  });

  const onToggle = async (task: Task) => {
    if (!token) return;
    try {
      const data = await studentService.tasks.update(
        task._id,
        { completed: !task.completed },
        token,
      );
      setTasks((prev) =>
        prev.map((item) => (item._id === task._id ? data.task : item)),
      );
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    try {
      await studentService.tasks.remove(id, token);
      setTasks((prev) => prev.filter((task) => task._id !== id));
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  };

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Student platform</p>
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track daily learning work and mark progress as you go.
          </p>
        </div>
        <Button
          type="button"
          className="h-10"
          onClick={() => setCreating((open) => !open)}
        >
          <Plus className="size-4" aria-hidden="true" />
          {creating ? "Close" : "Add task"}
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: "All" },
            { id: "open", label: "Open" },
            { id: "done", label: "Done" },
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
        <AuthAlert variant="error" title="Tasks error" description={error} />
      ) : null}

      {creating ? (
        <Card>
          <CardHeader>
            <CardTitle>New task</CardTitle>
            <CardDescription>Keep titles short and actionable.</CardDescription>
            <form className="mt-4 space-y-4" onSubmit={onCreate} noValidate>
              <FormField
                id="task-title"
                label="Title"
                error={errors.title?.message}
                required
              >
                <Input
                  id="task-title"
                  className="h-10"
                  placeholder="Review React hooks chapter"
                  disabled={isSubmitting}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={
                    errors.title ? "task-title-error" : undefined
                  }
                  {...register("title")}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="task-priority"
                  label="Priority"
                  error={errors.priority?.message}
                >
                  <select
                    id="task-priority"
                    className="border-input bg-background h-10 w-full rounded-lg border px-2.5 text-sm"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.priority)}
                    aria-describedby={
                      errors.priority ? "task-priority-error" : undefined
                    }
                    {...register("priority")}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </FormField>
                <FormField
                  id="task-category"
                  label="Category"
                  error={errors.category?.message}
                >
                  <Input
                    id="task-category"
                    className="h-10"
                    disabled={isSubmitting}
                    {...register("category")}
                  />
                </FormField>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Create task"}
              </Button>
            </form>
          </CardHeader>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading tasks" />
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Add a learning task or generate tasks from a roadmap later."
          action={
            <Button type="button" onClick={() => setCreating(true)}>
              Add task
            </Button>
          }
        />
      ) : null}

      <div className="space-y-3">
        {filtered.map((task) => (
          <Card
            key={task._id}
            padding="sm"
            className={cn(task.completed && "opacity-65")}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border transition",
                  task.completed
                    ? "border-transparent bg-emerald-500/15 text-emerald-600"
                    : "border-border text-transparent hover:border-foreground/40",
                )}
                aria-label={
                  task.completed ? "Mark task incomplete" : "Mark task complete"
                }
                onClick={() => void onToggle(task)}
              >
                <Check className="size-3.5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    task.completed && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {task.priority || "Medium"}
                  {task.category ? ` · ${task.category}` : ""}
                  {task.type ? ` · ${task.type}` : ""}
                  {task.estimatedTime ? ` · ${task.estimatedTime}` : ""}
                </p>
                {task.description ? (
                  <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
                    {task.description}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${task.title}`}
                onClick={() => setDeleteId(task._id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete task"
        description="Delete this task? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) void onDelete(deleteId);
        }}
      />
    </div>
  );
}

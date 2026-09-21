"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  WorkspaceNav,
  WorkspacePageHeader,
} from "@/components/workspace/workspace-nav";
import {
  AI_TASK_SUGGESTIONS,
  TASK_CATEGORIES,
} from "@/constants/workspace";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import type {
  WorkspaceTask,
  WorkspaceTaskPriority,
  WorkspaceTaskStatus,
} from "@/types/workspace";

const COLUMNS: Array<{ id: WorkspaceTaskStatus; label: string }> = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
];

export function WorkspaceTasksPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const addTask = useWorkspaceStore((s) => s.addTask);
  const updateTaskStatus = useWorkspaceStore((s) => s.updateTaskStatus);
  const removeTask = useWorkspaceStore((s) => s.removeTask);

  const [view, setView] = useState<"kanban" | "calendar" | "list">("kanban");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<WorkspaceTaskPriority>("Medium");
  const [category, setCategory] = useState<string>("General");
  const [dueDate, setDueDate] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const byStatus = useMemo(() => {
    const map: Record<WorkspaceTaskStatus, WorkspaceTask[]> = {
      todo: [],
      doing: [],
      done: [],
    };
    for (const task of tasks) map[task.status].push(task);
    return map;
  }, [tasks]);

  const calendarGroups = useMemo(() => {
    const map = new Map<string, WorkspaceTask[]>();
    for (const task of tasks) {
      const key = task.dueDate || "No date";
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  if (!hydrated) {
    return (
      <div className="container-app flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading tasks" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <WorkspacePageHeader
        title="Smart task board"
        description="Kanban, calendar, priorities, categories, due dates, and AI suggestions."
      />
      <WorkspaceNav />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["kanban", "Kanban"],
            ["calendar", "Calendar"],
            ["list", "List"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={view === id ? "default" : "outline"}
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add task</CardTitle>
          <form
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.75fr))_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim()) return;
              const payload: Omit<WorkspaceTask, "id" | "createdAt"> = {
                title: title.trim(),
                category,
                priority,
                status: "todo",
              };
              if (dueDate) payload.dueDate = dueDate;
              addTask(payload);
              setTitle("");
              setDueDate("");
            }}
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task title"
              aria-label="Task title"
              className="h-10 sm:col-span-2 lg:col-span-1"
            />
            <select
              className="form-control"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as WorkspaceTaskPriority)
              }
              aria-label="Priority"
            >
              {(["High", "Medium", "Low"] as const).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              className="form-control"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Category"
            >
              {TASK_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-label="Due date"
              className="h-10"
            />
            <Button type="submit" className="h-10 sm:col-span-2 lg:col-span-1">
              Add
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-muted-foreground text-xs">AI suggestions:</span>
            {AI_TASK_SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  addTask({
                    title: suggestion,
                    category: "General",
                    priority: "Medium",
                    status: "todo",
                    aiSuggested: true,
                  })
                }
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {view === "kanban" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <section
              key={column.id}
              className="border-border bg-muted/20 min-h-64 rounded-2xl border p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingId) updateTaskStatus(draggingId, column.id);
                setDraggingId(null);
              }}
              aria-label={`${column.label} column`}
            >
              <h2 className="mb-3 text-sm font-semibold">
                {column.label} · {byStatus[column.id].length}
              </h2>
              <div className="space-y-2">
                {byStatus[column.id].length === 0 ? (
                  <p className="text-muted-foreground text-xs">Drop tasks here</p>
                ) : (
                  byStatus[column.id].map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggingId(task.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={cn(
                        "border-border bg-background cursor-grab rounded-xl border p-3 active:cursor-grabbing",
                        draggingId === task.id && "opacity-60",
                      )}
                    >
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {task.priority} · {task.category}
                        {task.dueDate ? ` · ${task.dueDate}` : ""}
                        {task.aiSuggested ? " · AI" : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {COLUMNS.filter((item) => item.id !== task.status).map(
                          (item) => (
                            <Button
                              key={item.id}
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => updateTaskStatus(task.id, item.id)}
                            >
                              {item.label}
                            </Button>
                          ),
                        )}
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => removeTask(task.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className="space-y-4">
          {calendarGroups.length === 0 ? (
            <EmptyState title="No dated tasks" description="Add due dates to plan." />
          ) : (
            calendarGroups.map(([date, items]) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="text-base">{date}</CardTitle>
                  <CardDescription>
                    {items.length} task{items.length === 1 ? "" : "s"}
                  </CardDescription>
                  <ul className="mt-3 space-y-2 text-sm">
                    {items.map((task) => (
                      <li
                        key={task.id}
                        className="border-border flex justify-between gap-3 rounded-lg border px-3 py-2"
                      >
                        <span>
                          {task.title}
                          <span className="text-muted-foreground">
                            {" "}
                            · {task.status}
                          </span>
                        </span>
                        <span className="text-muted-foreground">{task.priority}</span>
                      </li>
                    ))}
                  </ul>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {view === "list" ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-muted-foreground text-xs">
                  {task.status} · {task.priority} · {task.category}
                  {task.dueDate ? ` · due ${task.dueDate}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {COLUMNS.map((column) => (
                  <Button
                    key={column.id}
                    type="button"
                    size="xs"
                    variant={task.status === column.id ? "default" : "outline"}
                    onClick={() => updateTaskStatus(task.id, column.id)}
                  >
                    {column.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

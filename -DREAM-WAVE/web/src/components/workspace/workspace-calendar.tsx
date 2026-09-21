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
import { useWorkspaceStore } from "@/store/workspace-store";
import type { CalendarEventKind } from "@/types/workspace";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function WorkspaceCalendarPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const events = useWorkspaceStore((s) => s.events);
  const addEvent = useWorkspaceStore((s) => s.addEvent);
  const removeEvent = useWorkspaceStore((s) => s.removeEvent);

  const [view, setView] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [cursor, setCursor] = useState(() => new Date());
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<CalendarEventKind>("study");
  const [date, setDate] = useState(toKey(new Date()));
  const [startTime, setStartTime] = useState("09:00");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const dayKey = toKey(cursor);
  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return d;
    });
  }, [cursor]);

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return d;
    });
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const reminders = useMemo(
    () =>
      [...events]
        .sort((a, b) =>
          `${a.date}${a.startTime ?? ""}`.localeCompare(
            `${b.date}${b.startTime ?? ""}`,
          ),
        )
        .slice(0, 8),
    [events],
  );

  if (!hydrated) {
    return (
      <div className="container-app flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading calendar" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <WorkspacePageHeader
        title="Calendar"
        description="Daily, weekly, and monthly views for study, interviews, assignments, and reminders."
      />
      <WorkspaceNav />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["daily", "Daily"],
            ["weekly", "Weekly"],
            ["monthly", "Monthly"],
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setCursor(new Date())}
        >
          Today
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const next = new Date(cursor);
            next.setDate(next.getDate() - (view === "monthly" ? 30 : view === "weekly" ? 7 : 1));
            setCursor(next);
          }}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const next = new Date(cursor);
            next.setDate(next.getDate() + (view === "monthly" ? 30 : view === "weekly" ? 7 : 1));
            setCursor(next);
          }}
        >
          Next
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add schedule item</CardTitle>
          <form
            className="mt-3 grid gap-3 md:grid-cols-[1.2fr_repeat(3,minmax(0,0.7fr))_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim()) return;
              addEvent({
                title: title.trim(),
                kind,
                date,
                startTime,
              });
              setTitle("");
            }}
          >
            <Input
              className="h-10"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Event title"
              aria-label="Event title"
            />
            <select
              className="border-input bg-background h-10 rounded-lg border px-2 text-sm"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as CalendarEventKind)
              }
              aria-label="Event kind"
            >
              {(
                [
                  "study",
                  "interview",
                  "assignment",
                  "reminder",
                  "focus",
                ] as const
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Input
              type="date"
              className="h-10"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-label="Event date"
            />
            <Input
              type="time"
              className="h-10"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              aria-label="Start time"
            />
            <Button type="submit" className="h-10">
              Add
            </Button>
          </form>
        </CardHeader>
      </Card>

      {view === "daily" ? (
        <Card>
          <CardHeader>
            <CardTitle>{dayKey}</CardTitle>
            <CardDescription>Daily schedule</CardDescription>
            <ul className="mt-4 space-y-2 text-sm">
              {(eventsByDate.get(dayKey) ?? []).length === 0 ? (
                <li className="text-muted-foreground">No events today.</li>
              ) : (
                (eventsByDate.get(dayKey) ?? []).map((event) => (
                  <li
                    key={event.id}
                    className="border-border flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                  >
                    <span>
                      {event.startTime ?? "—"} · {event.title}
                      <span className="text-muted-foreground"> · {event.kind}</span>
                    </span>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => removeEvent(event.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </CardHeader>
        </Card>
      ) : null}

      {view === "weekly" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {weekDays.map((day) => {
            const key = toKey(day);
            const items = eventsByDate.get(key) ?? [];
            return (
              <Card key={key} className="min-h-40">
                <CardHeader>
                  <CardTitle className="text-sm">
                    {day.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </CardTitle>
                  <ul className="mt-2 space-y-1 text-xs">
                    {items.length === 0 ? (
                      <li className="text-muted-foreground">Free</li>
                    ) : (
                      items.map((event) => (
                        <li key={event.id}>
                          {event.startTime} {event.title}
                        </li>
                      ))
                    )}
                  </ul>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      ) : null}

      {view === "monthly" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {monthDays.map((day) => {
            const key = toKey(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const items = eventsByDate.get(key) ?? [];
            return (
              <button
                key={key + String(inMonth)}
                type="button"
                className={`border-border min-h-24 rounded-xl border p-2 text-left ${
                  inMonth ? "bg-background" : "bg-muted/20 text-muted-foreground"
                }`}
                onClick={() => {
                  setCursor(day);
                  setView("daily");
                }}
              >
                <p className="text-xs font-medium">{day.getDate()}</p>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {items.length
                    ? `${items.length} event${items.length === 1 ? "" : "s"}`
                    : "—"}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reminder timeline</h2>
        {reminders.length === 0 ? (
          <EmptyState title="No reminders" description="Add schedule items above." />
        ) : (
          <ol className="relative space-y-3 border-l pl-5">
            {reminders.map((event) => (
              <li key={event.id} className="relative">
                <span className="bg-primary absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full" />
                <p className="font-medium">
                  {event.date} {event.startTime ?? ""} · {event.title}
                </p>
                <p className="text-muted-foreground text-xs capitalize">
                  {event.kind}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

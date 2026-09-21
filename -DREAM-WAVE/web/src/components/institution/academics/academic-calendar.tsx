"use client";

import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { CalendarEventDialog } from "@/components/institution/academics/academic-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAcademicManagementStore } from "@/store/academic-management-store";
import type { AcademicCalendarEvent } from "@/types/academic-management";

const TYPE_META: Record<
  AcademicCalendarEvent["type"],
  { label: string; className: string }
> = {
  "semester-start": { label: "Semester Start", className: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" },
  "semester-end": { label: "Semester End", className: "border-sky-500/40 text-sky-600 dark:text-sky-400" },
  examination: { label: "Examination", className: "border-destructive/40 text-destructive" },
  "internal-exam": { label: "Internal Exam", className: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
  assignment: { label: "Assignment", className: "border-violet-500/40 text-violet-600 dark:text-violet-400" },
  workshop: { label: "Workshop", className: "border-blue-500/40 text-blue-600 dark:text-blue-400" },
  holiday: { label: "Holiday", className: "border-rose-500/40 text-rose-600 dark:text-rose-400" },
  event: { label: "Event", className: "border-primary/40 text-primary" },
};

function formatDate(value: string) {
  if (!value) return "TBD";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AcademicCalendar() {
  const calendar = useAcademicManagementStore((s) => s.calendar);
  const addCalendarEvent = useAcademicManagementStore((s) => s.addCalendarEvent);
  const removeCalendarEvent = useAcademicManagementStore((s) => s.removeCalendarEvent);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sorted = useMemo(
    () => [...calendar].sort((a, b) => a.date.localeCompare(b.date)),
    [calendar],
  );

  return (
    <div className="space-y-4">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Academic calendar</CardTitle>
              <CardDescription>
                Track semester milestones, examinations, assignments, workshops, holidays,
                and events.
              </CardDescription>
            </div>
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Plus aria-hidden="true" />
              Add event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-3 border-s pl-6">
            {sorted.map((item) => {
              const meta = TYPE_META[item.type];
              return (
                <li key={item.id} className="relative">
                  <span
                    className="bg-primary absolute -start-[1.7rem] top-1.5 flex size-3 items-center justify-center rounded-full ring-4 ring-background"
                    aria-hidden="true"
                  />
                  <div className="border-border bg-background flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                        <CalendarDays className="size-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(item.date)} · {item.academicYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={meta.className}>
                        {meta.label}
                      </Badge>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${item.title}`}
                        onClick={() => removeCalendarEvent(item.id)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {dialogOpen ? (
        <CalendarEventDialog
          open
          onOpenChange={setDialogOpen}
          onSave={addCalendarEvent}
        />
      ) : null}
    </div>
  );
}

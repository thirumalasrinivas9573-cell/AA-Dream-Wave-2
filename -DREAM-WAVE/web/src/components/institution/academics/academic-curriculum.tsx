"use client";

import { Download, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { CurriculumDialog } from "@/components/institution/academics/academic-dialogs";
import { exportCsv } from "@/components/institution/academics/academic-ui";
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
import type { CurriculumComponent } from "@/types/academic-management";

const TYPE_LABEL: Record<CurriculumComponent["type"], string> = {
  core: "Core",
  elective: "Elective",
  lab: "Lab",
  project: "Project",
  internship: "Internship",
};

export function CurriculumBuilder() {
  const curriculum = useAcademicManagementStore((s) => s.curriculum);
  const upsertCurriculum = useAcademicManagementStore((s) => s.upsertCurriculum);
  const removeCurriculum = useAcademicManagementStore((s) => s.removeCurriculum);
  const [dialogOpen, setDialogOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, CurriculumComponent[]>();
    for (const item of curriculum) {
      const list = map.get(item.semester) ?? [];
      list.push(item);
      map.set(item.semester, list);
    }
    return [...map.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true }),
    );
  }, [curriculum]);

  const distribution = useMemo(() => {
    const totals: Record<CurriculumComponent["type"], number> = {
      core: 0,
      elective: 0,
      lab: 0,
      project: 0,
      internship: 0,
    };
    for (const item of curriculum) totals[item.type] += item.credits;
    return totals;
  }, [curriculum]);

  const totalCredits = curriculum.reduce((sum, item) => sum + item.credits, 0);

  return (
    <div className="space-y-6">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Curriculum builder</CardTitle>
              <CardDescription>
                Map subjects to semesters, balance credit distribution, and manage electives,
                labs, projects, and internships.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  exportCsv(
                    "curriculum.csv",
                    ["Semester", "Subject", "Type", "Credits"],
                    curriculum.map((item) => [
                      item.semester,
                      item.subject,
                      TYPE_LABEL[item.type],
                      item.credits,
                    ]),
                  )
                }
              >
                <Download aria-hidden="true" />
                Export
              </Button>
              <Button type="button" onClick={() => setDialogOpen(true)}>
                <Plus aria-hidden="true" />
                Add component
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="border-border bg-muted/20 rounded-xl border p-3">
              <p className="text-muted-foreground text-xs">Total credits</p>
              <p className="text-xl font-semibold">{totalCredits}</p>
            </div>
            {(Object.keys(distribution) as Array<CurriculumComponent["type"]>).map(
              (type) => (
                <div key={type} className="border-border bg-muted/20 rounded-xl border p-3">
                  <p className="text-muted-foreground text-xs">{TYPE_LABEL[type]}</p>
                  <p className="text-xl font-semibold">{distribution[type]}</p>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {grouped.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {grouped.map(([semester, items]) => {
            const semesterCredits = items.reduce((sum, item) => sum + item.credits, 0);
            return (
              <Card key={semester} className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{semester}</CardTitle>
                    <Badge variant="outline">{semesterCredits} credits</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border-border bg-background flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.subject}</p>
                        <p className="text-muted-foreground text-xs">
                          {TYPE_LABEL[item.type]} · {item.credits} credits
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${item.subject}`}
                        onClick={() => removeCurriculum(item.id)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No curriculum components"
          description="Start building the program structure by adding a component."
          titleAs="h3"
        />
      )}

      {dialogOpen ? (
        <CurriculumDialog
          open
          onOpenChange={setDialogOpen}
          onSave={upsertCurriculum}
        />
      ) : null}
    </div>
  );
}

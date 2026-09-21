"use client";

import { useMemo } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResearchNote, ResearchProject } from "@/types/research";

type ResearchVizProps = {
  project: ResearchProject;
  notes: ResearchNote[];
};

export function ResearchVisualization({ project, notes }: ResearchVizProps) {
  const concepts = useMemo(() => {
    const tags = new Set<string>([
      ...project.tags,
      ...notes.flatMap((note) => note.tags),
    ]);
    return Array.from(tags);
  }, [notes, project.tags]);

  const tree = useMemo(() => {
    return [
      {
        label: project.title,
        children: [
          { label: "Question", children: [{ label: project.topic }] },
          {
            label: "Notes",
            children: notes.slice(0, 4).map((note) => ({ label: note.title })),
          },
          {
            label: "Concepts",
            children: concepts.slice(0, 6).map((item) => ({ label: item })),
          },
        ],
      },
    ];
  }, [concepts, notes, project.title, project.topic]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress visualization</CardTitle>
          <CardDescription>
            Current research completion for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted h-3 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {project.progress}% complete
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Research timeline</CardTitle>
          <CardDescription>Recent project milestones and tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-3 border-l pl-5">
            {project.timeline.slice(0, 6).map((event) => (
              <li key={event.id} className="relative">
                <span className="bg-primary absolute top-1.5 -left-[1.4rem] size-2 rounded-full" />
                <p className="text-sm font-medium">{event.label}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(event.at).toLocaleString()} · {event.kind}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Knowledge graph</CardTitle>
          <CardDescription>
            Concept nodes linked from tags and notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mx-auto flex min-h-48 max-w-md flex-wrap items-center justify-center gap-3 p-4">
            <div className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium">
              {project.title.slice(0, 24)}
            </div>
            {concepts.slice(0, 8).map((concept, index) => (
              <div
                key={concept}
                className="border-border bg-card rounded-full border px-3 py-1.5 text-xs"
                style={{
                  transform: `translateY(${(index % 3) * 4}px)`,
                }}
              >
                {concept}
              </div>
            ))}
            {concepts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Add tags to notes to grow the graph.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Knowledge tree</CardTitle>
          <CardDescription>Learning map for this research thread.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {tree.map((root) => (
              <li key={root.label}>
                <p className="font-medium">{root.label}</p>
                <ul className="border-border mt-2 space-y-2 border-l pl-4">
                  {root.children.map((branch) => (
                    <li key={branch.label}>
                      <p>{branch.label}</p>
                      <ul className="text-muted-foreground mt-1 space-y-1 pl-3 text-xs">
                        {branch.children.map((leaf) => (
                          <li key={leaf.label}>• {leaf.label}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

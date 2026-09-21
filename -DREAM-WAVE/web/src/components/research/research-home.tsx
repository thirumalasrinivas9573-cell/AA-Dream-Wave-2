"use client";

import {
  Clock3,
  FolderKanban,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESEARCH_ROUTES } from "@/constants/research";
import { cn } from "@/lib/utils";
import { useResearchStore } from "@/store/research-store";

export function ResearchHomePage() {
  const hydrate = useResearchStore((s) => s.hydrate);
  const hydrated = useResearchStore((s) => s.hydrated);
  const projects = useResearchStore((s) => s.projects);
  const notes = useResearchStore((s) => s.notes);
  const createProject = useResearchStore((s) => s.createProject);

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const active = useMemo(
    () => projects.filter((item) => item.status === "active"),
    [projects],
  );
  const recent = useMemo(
    () =>
      [...projects].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [projects],
  );
  const saved = useMemo(
    () => projects.filter((item) => item.status !== "active" || item.progress > 50),
    [projects],
  );
  const timeline = useMemo(() => {
    return recent
      .flatMap((project) =>
        project.timeline.slice(0, 2).map((event) => ({
          ...event,
          projectId: project.id,
          projectTitle: project.title,
        })),
      )
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [recent]);

  const suggestions = [
    "Summarize open questions across active projects",
    "Turn recent notes into flashcards",
    "Map concepts connecting habit design and AI tutoring",
    "Draft a literature outline for your newest topic",
  ];

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading research workspace" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">AI Research & Innovation</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Research Workspace
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
            Research, organize, learn, and collaborate from one modern interface.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/research/workspace"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Evidence-first workspaces
            </Link>
            <Link
              href="/search/research"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Research Mode
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Active research</CardDescription>
            <CardTitle className="text-2xl">{active.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saved projects</CardDescription>
            <CardTitle className="text-2xl">{saved.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Notes</CardDescription>
            <CardTitle className="text-2xl">{notes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Avg progress</CardDescription>
            <CardTitle className="text-2xl">
              {projects.length
                ? Math.round(
                    projects.reduce((sum, item) => sum + item.progress, 0) /
                      projects.length,
                  )
                : 0}
              %
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Start research</CardTitle>
            <CardDescription>
              Create a new project and open the smart editor workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="research-title">Project title</Label>
              <Input
                id="research-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Climate literacy in schools"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="research-topic">Topic</Label>
              <Input
                id="research-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Core research focus"
              />
            </div>
            <Button
              type="button"
              className="h-10"
              onClick={() => {
                const id = createProject({ title, topic });
                setTitle("");
                setTopic("");
                window.location.href = RESEARCH_ROUTES.project(id);
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              Create project
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" aria-hidden="true" />
              AI suggestions
            </CardTitle>
            <CardDescription>
              Smart next moves based on your research activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((item) => (
              <div
                key={item}
                className="border-border rounded-xl border px-3 py-2 text-sm"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Active research</h2>
        {active.length === 0 ? (
          <EmptyState
            title="No active projects"
            description="Create a research project to begin."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.map((project) => (
              <Link
                key={project.id}
                href={RESEARCH_ROUTES.project(project.id)}
                className="focus-visible:ring-ring rounded-2xl outline-none focus-visible:ring-2"
              >
                <Card className="hover:bg-muted/30 h-full transition-colors hover:-translate-y-0.5">
                  <CardHeader>
                    <CardTitle className="text-base">{project.title}</CardTitle>
                    <CardDescription>{project.topic}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted mb-2 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {project.progress}% · {project.category}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <FolderKanban className="size-4" aria-hidden="true" />
            Recent research
          </h2>
          <div className="space-y-2">
            {recent.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={RESEARCH_ROUTES.project(project.id)}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto w-full justify-between px-4 py-3 text-left",
                )}
              >
                <span>
                  <span className="block font-medium">{project.title}</span>
                  <span className="text-muted-foreground text-xs">
                    Updated {new Date(project.updatedAt).toLocaleString()}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs capitalize">
                  {project.status}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Clock3 className="size-4" aria-hidden="true" />
            Research timeline
          </h2>
          <ol className="relative space-y-3 border-l pl-5">
            {timeline.map((event) => (
              <li key={event.id} className="relative">
                <span className="bg-primary absolute top-1.5 -left-[1.4rem] size-2 rounded-full" />
                <p className="text-sm font-medium">{event.label}</p>
                <p className="text-muted-foreground text-xs">
                  {event.projectTitle} · {new Date(event.at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

"use client";

import {
  Columns2,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { ResearchDocumentPanel } from "@/components/research/research-document";
import { ResearchEditor } from "@/components/research/research-editor";
import { ResearchOrganizer } from "@/components/research/research-organizer";
import { ResearchToolsPanel } from "@/components/research/research-tools";
import { ResearchVisualization } from "@/components/research/research-viz";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Z_INDEX } from "@/constants";
import { RESEARCH_ROUTES } from "@/constants/research";
import { cn } from "@/lib/utils";
import { useResearchStore } from "@/store/research-store";

type ResearchWorkspacePageProps = {
  projectId: string;
};

export function ResearchWorkspacePage({ projectId }: ResearchWorkspacePageProps) {
  const hydrate = useResearchStore((s) => s.hydrate);
  const hydrated = useResearchStore((s) => s.hydrated);
  const projects = useResearchStore((s) => s.projects);
  const notes = useResearchStore((s) => s.notes);
  const documents = useResearchStore((s) => s.documents);
  const prefs = useResearchStore((s) => s.prefs);
  const updatePrefs = useResearchStore((s) => s.updatePrefs);
  const updateProject = useResearchStore((s) => s.updateProject);
  const addTimelineEvent = useResearchStore((s) => s.addTimelineEvent);

  const project = useMemo(
    () => projects.find((item) => item.id === projectId),
    [projectId, projects],
  );
  const linkedDocument = useMemo(() => {
    if (!project?.documentId) return documents[0] || null;
    return documents.find((item) => item.id === project.documentId) || null;
  }, [documents, project]);

  const [tab, setTab] = useState<"editor" | "document" | "tools" | "viz">(
    "editor",
  );
  const [draftOverride, setDraftOverride] = useState<string | null>(null);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [syncedProjectId, setSyncedProjectId] = useState(projectId);
  if (projectId !== syncedProjectId) {
    setSyncedProjectId(projectId);
    setDraftOverride(null);
    setTitleOverride(null);
  }
  const draft = draftOverride ?? project?.content ?? "";
  const title = titleOverride ?? project?.title ?? "";
  const setDraft = (value: string) => setDraftOverride(value);
  const setTitle = (value: string) => setTitleOverride(value);
  const [savedFlash, setSavedFlash] = useState(false);
  const dragSide = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragSide.current) return;
      if (dragSide.current === "left") {
        updatePrefs({
          leftWidth: Math.min(420, Math.max(220, event.clientX - 16)),
        });
      }
      if (dragSide.current === "right") {
        const width = window.innerWidth - event.clientX - 16;
        updatePrefs({
          rightWidth: Math.min(460, Math.max(240, width)),
        });
      }
    };
    const onUp = () => {
      dragSide.current = null;
      window.document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updatePrefs]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Opening research workspace" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Project not found"
          description="This research project may have been removed."
          action={
            <Link
              href={RESEARCH_ROUTES.root}
              className={cn(buttonVariants(), "h-10")}
            >
              Back to research home
            </Link>
          }
        />
      </div>
    );
  }

  const save = () => {
    updateProject(project.id, {
      title: title.trim() || project.title,
      content: draft,
      progress: Math.min(100, Math.max(project.progress, 15)),
    });
    addTimelineEvent(project.id, {
      label: "Draft saved",
      kind: "edited",
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
  };

  const shellClass = cn(
    "flex min-h-0 flex-1 flex-col",
    prefs.fullscreen
      ? "bg-background fixed inset-0 p-3 md:p-4"
      : "container-app py-6 md:py-8",
  );

  return (
    <div
      className={shellClass}
      style={prefs.fullscreen ? { zIndex: Z_INDEX.modal } : undefined}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={RESEARCH_ROUTES.root}
            className="text-muted-foreground text-xs hover:underline"
          >
            Research home
          </Link>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 max-w-xl text-lg font-semibold"
            aria-label="Project title"
          />
          <p className="text-muted-foreground text-xs">{project.topic}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={prefs.showLeft}
            onClick={() => updatePrefs({ showLeft: !prefs.showLeft })}
          >
            <PanelLeft className="size-3.5" aria-hidden="true" />
            Organizer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={prefs.showRight}
            onClick={() => updatePrefs({ showRight: !prefs.showRight })}
          >
            <PanelRight className="size-3.5" aria-hidden="true" />
            Tools
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={prefs.splitReading}
            onClick={() => updatePrefs({ splitReading: !prefs.splitReading })}
          >
            <Columns2 className="size-3.5" aria-hidden="true" />
            Split
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={prefs.fullscreen}
            onClick={() => updatePrefs({ fullscreen: !prefs.fullscreen })}
          >
            {prefs.fullscreen ? (
              <Minimize2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-3.5" aria-hidden="true" />
            )}
            {prefs.fullscreen ? "Exit" : "Fullscreen"}
          </Button>
          <Button type="button" size="sm" onClick={save}>
            <Save className="size-3.5" aria-hidden="true" />
            {savedFlash ? "Saved" : "Save"}
          </Button>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            { id: "editor", label: "Editor" },
            { id: "document", label: "Document" },
            { id: "tools", label: "AI Tools" },
            { id: "viz", label: "Maps" },
          ] as const
        ).map((item) => (
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

      <div className="flex min-h-[70vh] flex-1 gap-0 overflow-hidden rounded-2xl border border-border">
        {prefs.showLeft ? (
          <>
            <aside
              className="bg-card/30 hidden min-h-0 overflow-y-auto p-3 md:block"
              style={{ width: prefs.leftWidth }}
              aria-label="Knowledge organizer panel"
            >
              <ResearchOrganizer projectId={project.id} />
            </aside>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize organizer panel"
              tabIndex={0}
              className="bg-border hover:bg-primary/40 hidden w-1.5 cursor-col-resize md:block"
              onMouseDown={() => {
                dragSide.current = "left";
                window.document.body.style.cursor = "col-resize";
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  updatePrefs({
                    leftWidth: Math.max(220, prefs.leftWidth - 16),
                  });
                }
                if (event.key === "ArrowRight") {
                  updatePrefs({
                    leftWidth: Math.min(420, prefs.leftWidth + 16),
                  });
                }
              }}
            />
          </>
        ) : null}

        <main className="bg-background min-w-0 flex-1 overflow-y-auto p-3 md:p-4">
          {tab === "editor" ? (
            <ResearchEditor
              projectId={project.id}
              content={draft}
              onChange={setDraft}
            />
          ) : null}
          {tab === "document" ? (
            <ResearchDocumentPanel
              document={linkedDocument}
              split={prefs.splitReading}
            />
          ) : null}
          {tab === "tools" ? (
            <ResearchToolsPanel
              projectId={project.id}
              topic={project.topic}
              content={draft}
            />
          ) : null}
          {tab === "viz" ? (
            <ResearchVisualization project={project} notes={notes} />
          ) : null}
        </main>

        {prefs.showRight && tab !== "tools" ? (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize tools panel"
              tabIndex={0}
              className="bg-border hover:bg-primary/40 hidden w-1.5 cursor-col-resize lg:block"
              onMouseDown={() => {
                dragSide.current = "right";
                window.document.body.style.cursor = "col-resize";
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  updatePrefs({
                    rightWidth: Math.min(460, prefs.rightWidth + 16),
                  });
                }
                if (event.key === "ArrowRight") {
                  updatePrefs({
                    rightWidth: Math.max(240, prefs.rightWidth - 16),
                  });
                }
              }}
            />
            <aside
              className="bg-card/30 hidden min-h-0 overflow-y-auto p-3 lg:block"
              style={{ width: prefs.rightWidth }}
              aria-label="AI research tools panel"
            >
              <ResearchToolsPanel
                projectId={project.id}
                topic={project.topic}
                content={draft}
              />
            </aside>
          </>
        ) : null}
      </div>

      {!prefs.showLeft ? (
        <div className="mt-4 md:hidden">
          <ResearchOrganizer projectId={project.id} />
        </div>
      ) : null}
    </div>
  );
}

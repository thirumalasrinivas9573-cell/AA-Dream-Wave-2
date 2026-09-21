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
import { Textarea } from "@/components/ui/textarea";
import {
  WorkspaceNav,
  WorkspacePageHeader,
} from "@/components/workspace/workspace-nav";
import { NOTE_CATEGORIES } from "@/constants/workspace";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";

function summarizeNote(body: string) {
  const plain = body.replace(/[#>*_`-]/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return "Empty note.";
  return plain.length > 140 ? `${plain.slice(0, 137)}…` : plain;
}

export function WorkspaceNotesPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const notes = useWorkspaceStore((s) => s.notes);
  const addNote = useWorkspaceStore((s) => s.addNote);
  const updateNote = useWorkspaceStore((s) => s.updateNote);
  const removeNote = useWorkspaceStore((s) => s.removeNote);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [noteCategory, setNoteCategory] = useState<string>("General");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesCategory = category === "All" || note.category === category;
      const matchesQuery =
        !q ||
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [category, notes, query]);

  const selected = notes.find((note) => note.id === selectedId) ?? filtered[0];

  if (!hydrated) {
    return (
      <div className="container-app flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading notes" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <WorkspacePageHeader
        title="Smart notes"
        description="Markdown-friendly notes with tags, categories, search, and AI summaries."
      />
      <WorkspaceNav />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New note</CardTitle>
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim() || !body.trim()) return;
              addNote({
                title: title.trim(),
                body: body.trim(),
                tags: tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
                category: noteCategory,
                aiSummary: summarizeNote(body),
              });
              setTitle("");
              setBody("");
              setTags("");
            }}
          >
            <Input
              className="h-10"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              aria-label="Note title"
            />
            <Textarea
              className="min-h-36 font-mono text-sm"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={"# Heading\n\nWrite markdown notes…"}
              aria-label="Note body"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                className="h-10"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Tags (comma separated)"
                aria-label="Note tags"
              />
              <select
                className="border-input bg-background h-10 rounded-lg border px-2 text-sm"
                value={noteCategory}
                onChange={(event) => setNoteCategory(event.target.value)}
                aria-label="Note category"
              >
                {NOTE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="h-10 w-fit">
              Save note
            </Button>
          </form>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          className="h-10 flex-1"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
        />
        <select
          className="border-input bg-background h-10 rounded-lg border px-2 text-sm"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter category"
        >
          <option value="All">All categories</option>
          {NOTE_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <EmptyState title="No notes" description="Create a note to begin." />
          ) : (
            filtered.map((note) => (
              <button
                key={note.id}
                type="button"
                className={cn(
                  "border-border w-full rounded-xl border p-3 text-left transition",
                  selected?.id === note.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40",
                )}
                onClick={() => setSelectedId(note.id)}
              >
                <p className="text-sm font-medium">{note.title}</p>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {note.aiSummary || note.body}
                </p>
              </button>
            ))
          )}
        </div>

        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle>{selected.title}</CardTitle>
              <CardDescription>
                {selected.category} · updated{" "}
                {new Date(selected.updatedAt).toLocaleString()}
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted rounded-full px-2.5 py-1 text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="border-border mt-4 rounded-xl border p-3 text-sm">
                <p className="font-medium">AI note summary</p>
                <p className="text-muted-foreground mt-1 text-pretty">
                  {selected.aiSummary || summarizeNote(selected.body)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() =>
                    updateNote(selected.id, {
                      aiSummary: summarizeNote(selected.body),
                    })
                  }
                >
                  Regenerate summary
                </Button>
              </div>
              <pre className="bg-muted/30 mt-4 overflow-auto rounded-xl p-4 text-sm whitespace-pre-wrap">
                {selected.body}
              </pre>
              <Button
                type="button"
                variant="ghost"
                className="mt-3 w-fit"
                onClick={() => removeNote(selected.id)}
              >
                Delete note
              </Button>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

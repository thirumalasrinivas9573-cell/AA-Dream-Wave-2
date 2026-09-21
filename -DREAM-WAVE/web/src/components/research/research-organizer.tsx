"use client";

import { Folder, Search, Tag } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RESEARCH_CATEGORIES, RESEARCH_FOLDERS } from "@/constants/research";
import { cn } from "@/lib/utils";
import { useResearchStore } from "@/store/research-store";

export function ResearchOrganizer({
  projectId,
}: {
  projectId: string;
}) {
  const notes = useResearchStore((s) => s.notes);
  const collections = useResearchStore((s) => s.collections);
  const upsertNote = useResearchStore((s) => s.upsertNote);
  const removeNote = useResearchStore((s) => s.removeNote);
  const addTimelineEvent = useResearchStore((s) => s.addTimelineEvent);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [folder, setFolder] = useState("inbox");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (category !== "All" && note.category !== category) return false;
      if (folder === "active" && !note.collectionId) return false;
      if (folder === "insights" && !note.tags.includes("insight")) return false;
      if (
        q &&
        !note.title.toLowerCase().includes(q) &&
        !note.body.toLowerCase().includes(q) &&
        !note.tags.some((tag) => tag.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [category, folder, notes, query]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          Knowledge organizer
        </h2>
        <p className="text-muted-foreground text-xs">
          Notes, collections, tags, and smart folders
        </p>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes…"
          className="h-9 pl-8"
          aria-label="Search notes"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {RESEARCH_FOLDERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="xs"
            variant={folder === item.id ? "default" : "outline"}
            onClick={() => setFolder(item.id)}
            aria-pressed={folder === item.id}
          >
            <Folder className="size-3" aria-hidden="true" />
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="xs"
          variant={category === "All" ? "default" : "outline"}
          onClick={() => setCategory("All")}
        >
          All
        </Button>
        {RESEARCH_CATEGORIES.map((item) => (
          <Button
            key={item}
            type="button"
            size="xs"
            variant={category === item ? "default" : "outline"}
            onClick={() => setCategory(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="border-border space-y-2 rounded-xl border p-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Note title"
          aria-label="Note title"
          className="h-9"
        />
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Capture a research note…"
          className="min-h-20"
          aria-label="Note body"
        />
        <Input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="Tags (comma-separated)"
          aria-label="Note tags"
          className="h-9"
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => {
            if (!title.trim() || !body.trim()) return;
            upsertNote({
              title: title.trim(),
              body: body.trim(),
              tags: tags
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              category: category === "All" ? "General" : category,
              collectionId: collections[0]?.id ?? null,
            });
            addTimelineEvent(projectId, {
              label: `Note added: ${title.trim()}`,
              kind: "note",
            });
            setTitle("");
            setBody("");
            setTags("");
          }}
        >
          Save note
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState
            title="No notes found"
            description="Adjust filters or capture a new note."
          />
        ) : (
          filtered.map((note) => (
            <article
              key={note.id}
              className="border-border rounded-xl border px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{note.title}</p>
                  <p className="text-muted-foreground mt-1 line-clamp-3 text-xs">
                    {note.body}
                  </p>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => removeNote(note.id)}
                >
                  Remove
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-muted-foreground text-[10px] uppercase">
                  {note.category}
                </span>
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
                    )}
                  >
                    <Tag className="size-2.5" aria-hidden="true" />
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))
        )}
      </div>

      {collections.length > 0 ? (
        <div className="border-border space-y-1 border-t pt-2">
          <p className="text-muted-foreground text-xs font-medium">Collections</p>
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: collection.color }}
                aria-hidden="true"
              />
              <span>{collection.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

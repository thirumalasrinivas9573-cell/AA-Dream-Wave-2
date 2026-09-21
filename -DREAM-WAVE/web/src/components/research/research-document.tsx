"use client";

import { Bookmark, Highlighter, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useResearchStore } from "@/store/research-store";
import type { ResearchDocument } from "@/types/research";

type ResearchDocumentPanelProps = {
  document: ResearchDocument | null;
  split: boolean;
};

export function ResearchDocumentPanel({
  document,
  split,
}: ResearchDocumentPanelProps) {
  const addHighlight = useResearchStore((s) => s.addHighlight);
  const addBookmark = useResearchStore((s) => s.addBookmark);
  const [mode, setMode] = useState<"text" | "pdf">("text");
  const [panel, setPanel] = useState<"notes" | "highlights" | "bookmarks">(
    "highlights",
  );
  const [noteDraft, setNoteDraft] = useState("");
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [selectedText, setSelectedText] = useState("");

  const paragraphs = useMemo(
    () => (document?.content || "").split(/\n\n+/).filter(Boolean),
    [document?.content],
  );

  if (!document) {
    return (
      <EmptyState
        title="No linked document"
        description="Attach or open a research document to use PDF preview, highlights, and bookmarks."
      />
    );
  }

  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 gap-3",
        split ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]" : "grid-cols-1",
      )}
    >
      <div className="border-border flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border">
        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div>
            <p className="text-sm font-medium">{document.title}</p>
            <p className="text-muted-foreground text-xs">{document.source}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "text" ? "default" : "outline"}
              onClick={() => setMode("text")}
            >
              Reader
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "pdf" ? "default" : "outline"}
              disabled={!document.pdfUrl}
              onClick={() => setMode("pdf")}
            >
              PDF
            </Button>
          </div>
        </div>

        {mode === "pdf" && document.pdfUrl ? (
          <iframe
            title={`PDF preview for ${document.title}`}
            src={document.pdfUrl}
            className="min-h-[24rem] w-full flex-1 bg-muted"
          />
        ) : (
          <div
            className="flex-1 space-y-3 overflow-y-auto p-4 text-sm leading-relaxed"
            onMouseUp={() => {
              const text = window.getSelection()?.toString().trim() || "";
              setSelectedText(text);
            }}
          >
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        )}
      </div>

      {split ? (
        <aside className="border-border flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border">
          <div className="border-border flex flex-wrap gap-1 border-b p-2">
            {(
              [
                { id: "highlights", label: "Highlights", icon: Highlighter },
                { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
                { id: "notes", label: "Notes", icon: StickyNote },
              ] as const
            ).map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={panel === item.id ? "default" : "ghost"}
                onClick={() => setPanel(item.id)}
              >
                <item.icon className="size-3.5" aria-hidden="true" />
                {item.label}
              </Button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {panel === "highlights" ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={!selectedText}
                  onClick={() => {
                    if (!selectedText) return;
                    addHighlight(document.id, { text: selectedText });
                    setSelectedText("");
                  }}
                >
                  Highlight selection
                </Button>
                {document.highlights.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Select text in the reader to highlight.
                  </p>
                ) : (
                  document.highlights.map((item) => (
                    <div
                      key={item.id}
                      className="border-border rounded-xl border px-3 py-2 text-xs"
                    >
                      <p className="font-medium">{item.text}</p>
                      {item.note ? (
                        <p className="text-muted-foreground mt-1">{item.note}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </>
            ) : null}

            {panel === "bookmarks" ? (
              <>
                <div className="flex gap-2">
                  <Input
                    value={bookmarkLabel}
                    onChange={(event) => setBookmarkLabel(event.target.value)}
                    placeholder="Bookmark label"
                    className="h-9"
                    aria-label="Bookmark label"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!bookmarkLabel.trim()) return;
                      addBookmark(document.id, bookmarkLabel.trim(), 1);
                      setBookmarkLabel("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                {document.bookmarks.map((item) => (
                  <div
                    key={item.id}
                    className="border-border rounded-xl border px-3 py-2 text-xs"
                  >
                    <p className="font-medium">{item.label}</p>
                    <p className="text-muted-foreground">Page {item.page}</p>
                  </div>
                ))}
              </>
            ) : null}

            {panel === "notes" ? (
              <>
                <Textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Document note…"
                  className="min-h-24"
                  aria-label="Document note"
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={!noteDraft.trim() || !selectedText}
                  onClick={() => {
                    addHighlight(document.id, {
                      text: selectedText || noteDraft.trim(),
                      note: noteDraft.trim(),
                    });
                    setNoteDraft("");
                  }}
                >
                  Save linked note
                </Button>
              </>
            ) : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

"use client";

import {
  BookmarkPlus,
  Columns2,
  Highlighter,
  Minus,
  Plus,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import { getBookById } from "@/constants/knowledge-catalog";
import { cn } from "@/lib/utils";
import { useKnowledgeStore } from "@/store/knowledge-store";

type ReaderTheme = "paper" | "sepia" | "night";
type ReaderFont = "serif" | "sans" | "mono";

export function BookReaderPage({ bookId }: { bookId: string }) {
  const searchParams = useSearchParams();
  const requestedChapter = searchParams.get("chapter");
  const book = getBookById(bookId);

  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const upsertProgress = useKnowledgeStore((s) => s.upsertProgress);
  const addBookmark = useKnowledgeStore((s) => s.addBookmark);
  const bookmarks = useKnowledgeStore((s) => s.bookmarks);
  const addNote = useKnowledgeStore((s) => s.addNote);
  const notes = useKnowledgeStore((s) => s.notes);
  const addHighlight = useKnowledgeStore((s) => s.addHighlight);
  const highlights = useKnowledgeStore((s) => s.highlights);
  const removeHighlight = useKnowledgeStore((s) => s.removeHighlight);
  const removeNote = useKnowledgeStore((s) => s.removeNote);
  const pushHistory = useKnowledgeStore((s) => s.pushHistory);

  const [chapterOverride, setChapterOverride] = useState<string | null>(null);
  const [syncedChapterParam, setSyncedChapterParam] = useState(requestedChapter);
  if (requestedChapter !== syncedChapterParam) {
    setSyncedChapterParam(requestedChapter);
    setChapterOverride(null);
  }
  const chapterId =
    chapterOverride ??
    requestedChapter ??
    book?.chapters[0]?.id ??
    "";
  const setChapterId = (id: string) => setChapterOverride(id);
  const [zoom, setZoom] = useState(100);
  const [theme, setTheme] = useState<ReaderTheme>("paper");
  const [font, setFont] = useState<ReaderFont>("serif");
  const [mode, setMode] = useState<"text" | "pdf">("text");
  const [splitScreen, setSplitScreen] = useState(true);
  const [noteDraft, setNoteDraft] = useState("");
  const [askDraft, setAskDraft] = useState("");
  const [askReply, setAskReply] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const chapter = useMemo(
    () => book?.chapters.find((item) => item.id === chapterId) ?? book?.chapters[0],
    [book, chapterId],
  );

  const chapterIndex = useMemo(() => {
    if (!book || !chapter) return 0;
    return Math.max(
      0,
      book.chapters.findIndex((item) => item.id === chapter.id),
    );
  }, [book, chapter]);

  const percent = useMemo(() => {
    if (!book?.chapters.length) return 0;
    return Math.round(((chapterIndex + 1) / book.chapters.length) * 100);
  }, [book, chapterIndex]);

  useEffect(() => {
    if (!book || !chapter) return;
    pushHistory(book.id);
    upsertProgress({
      bookId: book.id,
      chapterId: chapter.id,
      percent,
      lastReadAt: new Date().toISOString(),
      completed: percent >= 100,
    });
  }, [book, chapter, percent, pushHistory, upsertProgress]);

  const chapterNotes = notes.filter(
    (item) => item.bookId === bookId && item.chapterId === chapter?.id,
  );
  const chapterHighlights = highlights.filter(
    (item) => item.bookId === bookId && item.chapterId === chapter?.id,
  );
  const chapterBookmarks = bookmarks.filter(
    (item) => item.bookId === bookId && item.chapterId === chapter?.id,
  );

  if (!book || !chapter) {
    return (
      <div className="container-app py-10">
        <EmptyState
          title="Reader unavailable"
          description="This book or chapter could not be opened."
          action={
            <Link href={KNOWLEDGE_ROUTES.root}>
              <Button type="button">Back to books</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const paragraphs = chapter.content.split(/\n\n+/);

  const themeClass =
    theme === "sepia"
      ? "bg-[#f4ecd8] text-[#5b4636]"
      : theme === "night"
        ? "bg-[#111827] text-[#e5e7eb]"
        : "bg-background text-foreground";

  const fontClass =
    font === "sans"
      ? "font-sans"
      : font === "mono"
        ? "font-mono"
        : "font-serif";

  const flash = (message: string) => {
    setSavedFlash(message);
    window.setTimeout(() => setSavedFlash(null), 1600);
  };

  return (
    <div className="container-app flex flex-1 flex-col gap-4 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Smart reader</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {book.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {chapter.title} · {percent}% complete
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={KNOWLEDGE_ROUTES.detail(book.id)}
            className={cn(buttonVariants({ variant: "outline" }), "h-9")}
          >
            Details
          </Link>
          <Button
            type="button"
            variant={mode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("text")}
          >
            Chapters
          </Button>
          <Button
            type="button"
            variant={mode === "pdf" ? "default" : "outline"}
            size="sm"
            disabled={!book.pdfUrl}
            onClick={() => setMode("pdf")}
          >
            PDF
          </Button>
          <Button
            type="button"
            variant={splitScreen ? "default" : "outline"}
            size="sm"
            aria-pressed={splitScreen}
            onClick={() => setSplitScreen((value) => !value)}
          >
            <Columns2 className="size-4" aria-hidden="true" />
            Split
          </Button>
        </div>
      </div>

      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      >
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={chapterIndex <= 0}
          onClick={() => setChapterId(book.chapters[chapterIndex - 1]!.id)}
        >
          Previous
        </Button>
        <select
          className="border-input bg-background h-8 max-w-full rounded-lg border px-2 text-sm sm:max-w-xs"
          value={chapter.id}
          onChange={(event) => setChapterId(event.target.value)}
          aria-label="Chapter navigation"
        >
          {book.chapters.map((item, index) => (
            <option key={item.id} value={item.id}>
              {index + 1}. {item.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={chapterIndex >= book.chapters.length - 1}
          onClick={() => setChapterId(book.chapters[chapterIndex + 1]!.id)}
        >
          Next
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Decrease font size"
            onClick={() => setZoom((value) => Math.max(80, value - 10))}
          >
            <Minus className="size-4" />
          </Button>
          <span className="text-muted-foreground text-xs">{zoom}%</span>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Increase font size"
            onClick={() => setZoom((value) => Math.min(160, value + 10))}
          >
            <Plus className="size-4" />
          </Button>
          {(["serif", "sans", "mono"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={font === item ? "default" : "outline"}
              aria-pressed={font === item}
              onClick={() => setFont(item)}
            >
              {item}
            </Button>
          ))}
          {(["paper", "sepia", "night"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={theme === item ? "default" : "outline"}
              aria-pressed={theme === item}
              onClick={() => setTheme(item)}
            >
              {item === "night" ? "dark" : item}
            </Button>
          ))}
        </div>
      </div>

      {savedFlash ? (
        <p className="text-muted-foreground text-sm" role="status">
          {savedFlash}
        </p>
      ) : null}

      <div
        className={cn(
          "grid gap-4",
          splitScreen ? "lg:grid-cols-[1fr_300px]" : "grid-cols-1",
        )}
      >
        <div
          className={cn(
            "border-border min-h-[28rem] rounded-2xl border p-4 md:p-8",
            themeClass,
            fontClass,
          )}
        >
          {mode === "pdf" && book.pdfUrl ? (
            <iframe
              title={`${book.title} PDF`}
              src={book.pdfUrl}
              className="h-[70vh] w-full rounded-xl border-0"
            />
          ) : (
            <article style={{ fontSize: `${zoom}%` }} className="space-y-4">
              <h2 className="text-xl font-semibold md:text-2xl">
                {chapter.title}
              </h2>
              <p className="text-sm opacity-80">{chapter.summary}</p>
              {paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="leading-relaxed">
                  {paragraph}{" "}
                  <button
                    type="button"
                    className="ml-1 inline text-xs underline opacity-70 hover:opacity-100"
                    onClick={() => {
                      addHighlight({
                        bookId: book.id,
                        chapterId: chapter.id,
                        text: paragraph.slice(0, 160),
                      });
                      flash("Highlight saved");
                    }}
                  >
                    highlight
                  </button>
                </p>
              ))}
            </article>
          )}
        </div>

        {splitScreen ? (
          <aside className="space-y-4" aria-label="Reader tools">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tools</CardTitle>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      addBookmark({
                        bookId: book.id,
                        chapterId: chapter.id,
                        label: chapter.title,
                      });
                      flash("Bookmark saved");
                    }}
                  >
                    <BookmarkPlus className="size-4" />
                    Bookmark chapter
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
                <CardDescription>Private notes for this chapter.</CardDescription>
                <Textarea
                  className="mt-3"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Capture an insight…"
                  aria-label="Chapter note"
                />
                <Button
                  type="button"
                  className="mt-2"
                  disabled={!noteDraft.trim()}
                  onClick={() => {
                    addNote({
                      bookId: book.id,
                      chapterId: chapter.id,
                      text: noteDraft.trim(),
                    });
                    setNoteDraft("");
                    flash("Note saved");
                  }}
                >
                  <StickyNote className="size-4" />
                  Save note
                </Button>
                <ul className="mt-3 space-y-2">
                  {chapterNotes.map((note) => (
                    <li
                      key={note.id}
                      className="border-border rounded-lg border p-2 text-xs"
                    >
                      <p>{note.text}</p>
                      <button
                        type="button"
                        className="text-muted-foreground mt-1 underline"
                        onClick={() => removeNote(note.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Highlights</CardTitle>
                <ul className="mt-2 space-y-2">
                  {chapterHighlights.length === 0 ? (
                    <li className="text-muted-foreground text-xs">
                      No highlights yet.
                    </li>
                  ) : (
                    chapterHighlights.map((item) => (
                      <li
                        key={item.id}
                        className="border-border rounded-lg border p-2 text-xs"
                      >
                        <p className="flex gap-1">
                          <Highlighter className="mt-0.5 size-3 shrink-0" />
                          {item.text}
                        </p>
                        <button
                          type="button"
                          className="text-muted-foreground mt-1 underline"
                          onClick={() => removeHighlight(item.id)}
                        >
                          Delete
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI chapter summary</CardTitle>
                <CardDescription className="text-foreground/90 mt-2 text-sm leading-relaxed">
                  {chapter.summary}
                </CardDescription>
                <p className="text-muted-foreground mt-3 text-xs">
                  Important points: {book.importantPoints.slice(0, 2).join(" · ")}
                </p>
                {chapterBookmarks.length > 0 ? (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {chapterBookmarks.length} bookmark
                    {chapterBookmarks.length === 1 ? "" : "s"} on this chapter
                  </p>
                ) : null}
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ask about this chapter</CardTitle>
                <Textarea
                  className="mt-3"
                  value={askDraft}
                  onChange={(event) => setAskDraft(event.target.value)}
                  placeholder="What should I practice from this chapter?"
                  aria-label="Ask about chapter"
                />
                <Button
                  type="button"
                  className="mt-2"
                  onClick={() =>
                    setAskReply(
                      askDraft.trim()
                        ? `From “${chapter.title}”: ${chapter.summary} Try applying one idea in the next 24 hours, then note what blocked you.`
                        : "Ask a specific question about this chapter.",
                    )
                  }
                >
                  Ask AI
                </Button>
                {askReply ? (
                  <p className="border-border mt-3 rounded-lg border p-2 text-xs leading-relaxed">
                    {askReply}
                  </p>
                ) : null}
              </CardHeader>
            </Card>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

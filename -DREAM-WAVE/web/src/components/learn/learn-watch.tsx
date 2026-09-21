"use client";

import { BookmarkPlus, Check, Highlighter, RotateCcw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { LearnNav } from "@/components/learn/learn-nav";
import { LearnPageHeader } from "@/components/learn/learn-shared";
import { LearnVideoPlayer } from "@/components/learn/video-player";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import { getBookById } from "@/constants/knowledge-catalog";
import {
  LEARN_PRACTICE_PROBLEMS,
  LEARN_RELATED_BOOKS,
  LEARN_RELATED_PROJECTS,
  LEARN_ROUTES,
} from "@/constants/learn";
import {
  getLearnAnimation,
  getRelatedAnimations,
} from "@/constants/learn-catalog";
import { cn } from "@/lib/utils";
import { useLearnStore } from "@/store/learn-store";
import type { LearnChapter } from "@/types/learn";

export function LearnWatchPage({ animationId }: { animationId: string }) {
  const hydrate = useLearnStore((s) => s.hydrate);
  const hydrated = useLearnStore((s) => s.hydrated);
  const progressList = useLearnStore((s) => s.progress);
  const upsertProgress = useLearnStore((s) => s.upsertProgress);
  const pushHistory = useLearnStore((s) => s.pushHistory);
  const notes = useLearnStore((s) => s.notes);
  const addNote = useLearnStore((s) => s.addNote);
  const removeNote = useLearnStore((s) => s.removeNote);
  const bookmarks = useLearnStore((s) => s.bookmarks);
  const addBookmark = useLearnStore((s) => s.addBookmark);
  const removeBookmark = useLearnStore((s) => s.removeBookmark);
  const highlights = useLearnStore((s) => s.highlights);
  const addHighlight = useLearnStore((s) => s.addHighlight);
  const removeHighlight = useLearnStore((s) => s.removeHighlight);
  const markQuizComplete = useLearnStore((s) => s.markQuizComplete);
  const completedQuizzes = useLearnStore((s) => s.completedQuizzes);
  const completeDailyGoal = useLearnStore((s) => s.completeDailyGoal);

  const animation = getLearnAnimation(animationId);
  const saved = progressList.find((item) => item.animationId === animationId);

  const [chapter, setChapter] = useState<LearnChapter | null>(
    animation?.chapters[0] ?? null,
  );
  const [position, setPosition] = useState(saved?.positionSec ?? 0);
  const [seekToSec, setSeekToSec] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [panel, setPanel] = useState<
    "notes" | "bookmarks" | "highlights" | "flashcards" | "quiz" | "diagram" | "related"
  >("notes");
  const [quizOpen, setQuizOpen] = useState(false);
  const [aiPopupOpen, setAiPopupOpen] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [watchGoalArmed, setWatchGoalArmed] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (animation) pushHistory(animation.id);
  }, [animation, pushHistory]);

  const animationNotes = useMemo(
    () => notes.filter((item) => item.animationId === animationId),
    [animationId, notes],
  );
  const animationBookmarks = useMemo(
    () => bookmarks.filter((item) => item.animationId === animationId),
    [animationId, bookmarks],
  );
  const animationHighlights = useMemo(
    () => highlights.filter((item) => item.animationId === animationId),
    [animationId, highlights],
  );

  const relatedLessons = useMemo(
    () => getRelatedAnimations(animationId),
    [animationId],
  );
  const relatedBooks = useMemo(() => {
    const ids = LEARN_RELATED_BOOKS[animationId] ?? [];
    return ids
      .map((id) => getBookById(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [animationId]);
  const relatedProjects = LEARN_RELATED_PROJECTS[animationId] ?? [];
  const practiceProblems = LEARN_PRACTICE_PROBLEMS[animationId] ?? [];

  const onProgress = useCallback(
    (positionSec: number, percent: number, chapterId?: string) => {
      if (!animation) return;
      setPosition(positionSec);
      upsertProgress({
        animationId: animation.id,
        positionSec,
        percent,
        completed: percent >= 95,
        lastWatchedAt: new Date().toISOString(),
        ...(chapterId ? { chapterId } : {}),
      });
      if (!watchGoalArmed && percent >= 20) {
        setWatchGoalArmed(true);
        completeDailyGoal("goal-watch");
      }
    },
    [animation, completeDailyGoal, upsertProgress, watchGoalArmed],
  );

  const onEnded = () => {
    setQuizOpen(true);
    setAiPopupOpen(true);
    setPanel("quiz");
    setToast("Lesson complete — try the quiz and AI follow-up.");
  };

  if (!animation) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Animation not found"
          action={
            <Link href={LEARN_ROUTES.library} className={cn(buttonVariants(), "h-10")}>
              Library
            </Link>
          }
        />
      </div>
    );
  }

  const quiz = animation.quiz[quizIndex];
  const flash = animation.flashcards[flashIndex];
  const aiQuestion =
    chapter?.summary ||
    "What is the single most useful idea from this chapter for your next practice session?";

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <LearnPageHeader
        title={animation.title}
        description="Interactive lesson player with quiz overlays, AI prompts, notes, and timeline tools."
        actions={
          <Link
            href={LEARN_ROUTES.detail(animation.id)}
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          >
            Details
          </Link>
        }
      />
      <LearnNav />

      {toast ? (
        <div
          className="border-border bg-muted/50 rounded-2xl border px-4 py-3 text-sm"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="media-frame relative">
            <LearnVideoPlayer
              animation={animation}
              initialPosition={saved?.positionSec ?? 0}
              seekToSec={seekToSec}
              onSeekHandled={() => setSeekToSec(null)}
              onProgress={onProgress}
              onChapterChange={setChapter}
              onEnded={onEnded}
            />

            {quizOpen && quiz ? (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
                role="dialog"
                aria-modal="true"
                aria-label="Interactive quiz overlay"
              >
                <Card className="max-h-[90%] w-full max-w-lg overflow-auto">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle>Interactive quiz overlay</CardTitle>
                      <CardDescription>
                        Question {quizIndex + 1} of {animation.quiz.length}
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Close quiz overlay"
                      onClick={() => setQuizOpen(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm font-medium text-pretty">{quiz.prompt}</p>
                    <div className="space-y-2">
                      {quiz.options.map((option, index) => {
                        const picked = quizPick === index;
                        const show = quizPick !== null;
                        const correct = index === quiz.correctIndex;
                        return (
                          <button
                            key={option}
                            type="button"
                            disabled={quizPick !== null}
                            onClick={() => setQuizPick(index)}
                            className={cn(
                              "border-border w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                              show && correct && "border-emerald-500 bg-emerald-500/10",
                              show && picked && !correct && "border-rose-500 bg-rose-500/10",
                              !show && "hover:bg-muted/40",
                            )}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    {quizPick !== null ? (
                      <p className="text-muted-foreground text-xs text-pretty">
                        {quiz.explanation}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setQuizPick(null);
                          setQuizIndex(0);
                        }}
                      >
                        <RotateCcw className="size-4" />
                        Reset
                      </Button>
                      <Button
                        type="button"
                        disabled={quizPick === null}
                        onClick={() => {
                          if (quizIndex < animation.quiz.length - 1) {
                            setQuizIndex(quizIndex + 1);
                            setQuizPick(null);
                          } else {
                            markQuizComplete(animation.id);
                            setQuizOpen(false);
                            setToast("Quiz completed");
                          }
                        }}
                      >
                        <Check className="size-4" />
                        {quizIndex < animation.quiz.length - 1
                          ? "Next"
                          : "Finish"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {aiPopupOpen ? (
              <div
                className="border-border bg-background/95 absolute top-3 right-3 left-3 z-20 rounded-2xl border p-4 shadow-lg md:left-auto md:w-80"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-4" aria-hidden="true" />
                    AI question popup
                  </p>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Dismiss AI question"
                    onClick={() => setAiPopupOpen(false)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground mt-2 text-sm text-pretty">
                  {aiQuestion}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    addNote({
                      animationId: animation.id,
                      text: `AI prompt reflection: ${aiQuestion}`,
                      ...(chapter?.id ? { chapterId: chapter.id } : {}),
                    });
                    setAiPopupOpen(false);
                    setToast("Reflection saved as note");
                  }}
                >
                  Save reflection
                </Button>
              </div>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Learning flow</CardTitle>
              <CardDescription>
                Topic / chapter navigation · Current: {chapter?.title || "—"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-sm text-pretty">
                {chapter?.summary}
              </p>
              <div className="flex flex-wrap gap-2">
                {animation.chapters.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={chapter?.id === item.id ? "default" : "outline"}
                    onClick={() => {
                      setChapter(item);
                      setSeekToSec(item.startSec);
                    }}
                  >
                    {item.title}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setQuizOpen(true);
                    setPanel("quiz");
                  }}
                >
                  Quiz overlay
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAiPopupOpen(true)}
                >
                  <Sparkles className="size-4" />
                  AI question
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["notes", "Notes"],
                ["bookmarks", "Bookmarks"],
                ["highlights", "Highlights"],
                ["flashcards", "Flash cards"],
                ["quiz", "Quiz"],
                ["diagram", "Diagram"],
                ["related", "Related"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={panel === id ? "default" : "outline"}
                onClick={() => setPanel(id)}
              >
                {label}
              </Button>
            ))}
          </div>

          {panel === "notes" ? (
            <Card>
              <CardHeader>
                <CardTitle>Important notes</CardTitle>
                <CardDescription>Capture takeaways while watching.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Write a note…"
                  className="min-h-24"
                  aria-label="Lesson note"
                />
                <Button
                  type="button"
                  className="h-10"
                  disabled={!noteText.trim()}
                  onClick={() => {
                    addNote({
                      animationId: animation.id,
                      text: noteText.trim(),
                      ...(chapter?.id ? { chapterId: chapter.id } : {}),
                    });
                    setNoteText("");
                    setToast("Note saved");
                  }}
                >
                  Save note
                </Button>
                <ul className="space-y-2">
                  {animationNotes.length === 0 ? (
                    <li className="text-muted-foreground text-sm">No notes yet.</li>
                  ) : (
                    animationNotes.map((item) => (
                      <li
                        key={item.id}
                        className="border-border flex items-start justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
                      >
                        <span className="text-pretty">{item.text}</span>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => removeNote(item.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {panel === "bookmarks" ? (
            <Card>
              <CardHeader>
                <CardTitle>Timeline bookmarks</CardTitle>
                <CardDescription>Jump back to saved moments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  className="h-10"
                  onClick={() => {
                    addBookmark({
                      animationId: animation.id,
                      label: chapter?.title || "Bookmark",
                      positionSec: position,
                      ...(chapter?.id ? { chapterId: chapter.id } : {}),
                    });
                    setToast("Bookmark saved");
                  }}
                >
                  <BookmarkPlus className="size-4" />
                  Bookmark current time
                </Button>
                <ul className="space-y-2">
                  {animationBookmarks.length === 0 ? (
                    <li className="text-muted-foreground text-sm">
                      No bookmarks yet.
                    </li>
                  ) : (
                    animationBookmarks.map((item) => (
                      <li
                        key={item.id}
                        className="border-border flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
                      >
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onClick={() => setSeekToSec(item.positionSec)}
                        >
                          {item.label} · {Math.floor(item.positionSec)}s
                        </button>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => removeBookmark(item.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {panel === "highlights" ? (
            <Card>
              <CardHeader>
                <CardTitle>Chapter highlights</CardTitle>
                <CardDescription>
                  Save important beats from the active chapter.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  className="h-10"
                  onClick={() => {
                    addHighlight({
                      animationId: animation.id,
                      text: chapter?.summary || animation.title,
                      positionSec: position,
                      ...(chapter?.id ? { chapterId: chapter.id } : {}),
                    });
                    setToast("Highlight saved");
                  }}
                >
                  <Highlighter className="size-4" />
                  Highlight chapter idea
                </Button>
                <ul className="space-y-2">
                  {animationHighlights.length === 0 ? (
                    <li className="text-muted-foreground text-sm">
                      No highlights yet.
                    </li>
                  ) : (
                    animationHighlights.map((item) => (
                      <li
                        key={item.id}
                        className="border-border flex items-start justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
                      >
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onClick={() => setSeekToSec(item.positionSec)}
                        >
                          {item.text}
                        </button>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => removeHighlight(item.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {panel === "flashcards" && flash ? (
            <Card>
              <CardHeader>
                <CardTitle>Flash cards</CardTitle>
                <CardDescription>
                  Card {flashIndex + 1} of {animation.flashcards.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  type="button"
                  className="border-border hover:bg-muted/40 min-h-36 w-full rounded-2xl border p-6 text-center transition"
                  onClick={() => setFlashFlipped((v) => !v)}
                  aria-label="Flip flashcard"
                >
                  <p className="text-sm font-medium">
                    {flashFlipped ? flash.back : flash.front}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Tap to flip
                  </p>
                </button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1"
                    onClick={() => {
                      setFlashIndex(
                        (flashIndex - 1 + animation.flashcards.length) %
                          animation.flashcards.length,
                      );
                      setFlashFlipped(false);
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    className="h-10 flex-1"
                    onClick={() => {
                      setFlashIndex(
                        (flashIndex + 1) % animation.flashcards.length,
                      );
                      setFlashFlipped(false);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {panel === "quiz" && quiz ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {quizOpen || completedQuizzes.includes(animation.id)
                    ? "Practice quiz"
                    : "Quiz panel"}
                </CardTitle>
                <CardDescription>
                  Question {quizIndex + 1} of {animation.quiz.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuizOpen(true)}
                >
                  Open as overlay
                </Button>
                <p className="text-sm font-medium text-pretty">{quiz.prompt}</p>
                <div className="space-y-2">
                  {quiz.options.map((option, index) => {
                    const picked = quizPick === index;
                    const show = quizPick !== null;
                    const correct = index === quiz.correctIndex;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={quizPick !== null}
                        onClick={() => setQuizPick(index)}
                        className={cn(
                          "border-border w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                          show && correct && "border-emerald-500 bg-emerald-500/10",
                          show && picked && !correct && "border-rose-500 bg-rose-500/10",
                          !show && "hover:bg-muted/40",
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {quizPick !== null ? (
                  <p className="text-muted-foreground text-xs text-pretty">
                    {quiz.explanation}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={() => {
                      setQuizPick(null);
                      setQuizIndex(0);
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    className="h-10"
                    disabled={quizPick === null}
                    onClick={() => {
                      if (quizIndex < animation.quiz.length - 1) {
                        setQuizIndex(quizIndex + 1);
                        setQuizPick(null);
                      } else {
                        markQuizComplete(animation.id);
                        setToast("Quiz completed");
                      }
                    }}
                  >
                    <Check className="size-4" />
                    {quizIndex < animation.quiz.length - 1
                      ? "Next question"
                      : "Finish quiz"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {panel === "diagram" ? (
            <Card>
              <CardHeader>
                <CardTitle>Educational diagram</CardTitle>
                <CardDescription>
                  Interactive model nodes for this lesson.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-border relative aspect-[4/3] overflow-hidden rounded-xl border">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    {animation.diagram.map((node, index) => {
                      const next =
                        animation.diagram[(index + 1) % animation.diagram.length];
                      if (!next) return null;
                      return (
                        <line
                          key={`line-${node.id}`}
                          x1={node.x}
                          y1={node.y}
                          x2={next.x}
                          y2={next.y}
                          className="stroke-border"
                          strokeWidth={0.6}
                        />
                      );
                    })}
                    {animation.diagram.map((node) => (
                      <g key={node.id}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={selectedNode === node.id ? 7 : 5.5}
                          className={
                            selectedNode === node.id
                              ? "fill-primary"
                              : "fill-muted-foreground/70"
                          }
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedNode(node.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedNode(node.id);
                            }
                          }}
                        />
                        <text
                          x={node.x}
                          y={node.y + 12}
                          textAnchor="middle"
                          className="fill-foreground text-[3.5px]"
                        >
                          {node.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <p className="text-muted-foreground mt-3 text-sm text-pretty">
                  {animation.diagram.find((item) => item.id === selectedNode)
                    ?.detail || "Select a node to learn more."}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {panel === "related" ? (
            <Card>
              <CardHeader>
                <CardTitle>Personalization</CardTitle>
                <CardDescription>
                  Related lessons, books, projects, and practice.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="mb-2 font-medium">Related lessons</p>
                  <ul className="space-y-1">
                    {relatedLessons.length === 0 ? (
                      <li className="text-muted-foreground">None mapped.</li>
                    ) : (
                      relatedLessons.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={LEARN_ROUTES.detail(item.id)}
                            className="hover:underline"
                          >
                            {item.cover} {item.title}
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-medium">Related books</p>
                  <ul className="space-y-1">
                    {relatedBooks.length === 0 ? (
                      <li className="text-muted-foreground">None mapped.</li>
                    ) : (
                      relatedBooks.map((book) => (
                        <li key={book.id}>
                          <Link
                            href={KNOWLEDGE_ROUTES.detail(book.id)}
                            className="hover:underline"
                          >
                            {book.cover} {book.title}
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-medium">Related projects</p>
                  <ul className="space-y-1">
                    {relatedProjects.map((project) => (
                      <li key={project.id}>
                        <Link href={project.href} className="hover:underline">
                          {project.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-medium">Practice problems</p>
                  <ul className="space-y-2">
                    {practiceProblems.length === 0 ? (
                      <li className="text-muted-foreground">None mapped.</li>
                    ) : (
                      practiceProblems.map((problem) => (
                        <li
                          key={problem.id}
                          className="border-border rounded-xl border px-3 py-2"
                        >
                          <p>{problem.prompt}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Hint: {problem.hint}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

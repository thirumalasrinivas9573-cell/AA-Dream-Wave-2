"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STUDY_LESSON_CARDS } from "@/constants/ai-platform";
import { cn } from "@/lib/utils";
import { useAiPlatformStore } from "@/store/ai-platform-store";

const LOCAL_QUIZ = [
  {
    q: "What is the best next step after learning a concept?",
    options: ["Ignore it", "Practice with examples", "Skip ahead", "Memorize only"],
    answer: 1,
  },
  {
    q: "Flash cards work best when you…",
    options: [
      "Only read the front",
      "Active recall both sides",
      "Never review again",
      "Cram once",
    ],
    answer: 1,
  },
  {
    q: "A good study session usually includes…",
    options: [
      "No breaks",
      "Goal + practice + reflection",
      "Only watching videos",
      "Passive scrolling",
    ],
    answer: 1,
  },
];

const LOCAL_FLASHCARDS = [
  { front: "Active recall", back: "Retrieving knowledge from memory without looking at notes." },
  { front: "Spaced repetition", back: "Reviewing material at expanding intervals to strengthen memory." },
  { front: "Interleaving", back: "Mixing related topics during practice to improve transfer." },
];

export function AiStudyLessonCards({
  onSelect,
  subject,
}: {
  onSelect: (prompt: string) => void;
  subject: string;
}) {
  const recordStudyActivity = useAiPlatformStore((s) => s.recordStudyActivity);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {STUDY_LESSON_CARDS.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => {
            recordStudyActivity(
              card.id === "quiz"
                ? "quiz"
                : card.id === "flashcards"
                  ? "flashcard"
                  : "lesson",
              subject,
            );
            onSelect(card.prompt);
          }}
          className="border-border hover:bg-muted/30 focus-visible:ring-ring rounded-2xl border p-4 text-left transition outline-none focus-visible:ring-2"
        >
          <p className="text-sm font-medium">{card.title}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Launch in chat for {subject}
          </p>
        </button>
      ))}
    </div>
  );
}

export function AiQuizInterface({ subject }: { subject: string }) {
  const recordStudyActivity = useAiPlatformStore((s) => s.recordStudyActivity);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const item = LOCAL_QUIZ[index];

  if (!item) return null;

  const submit = () => {
    if (selected === null) return;
    const correct = selected === item.answer;
    const nextScore = score + (correct ? 1 : 0);
    setScore(nextScore);
    if (index >= LOCAL_QUIZ.length - 1) {
      setDone(true);
      recordStudyActivity("quiz", subject);
      return;
    }
    setIndex((v) => v + 1);
    setSelected(null);
  };

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz complete</CardTitle>
          <CardDescription>
            You scored {score}/{LOCAL_QUIZ.length} on {subject} fundamentals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={() => {
              setIndex(0);
              setSelected(null);
              setScore(0);
              setDone(false);
            }}
          >
            Retry quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI quiz interface</CardTitle>
        <CardDescription>
          Question {index + 1} of {LOCAL_QUIZ.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">{item.q}</p>
        <div className="grid gap-2">
          {item.options.map((option, optionIndex) => (
            <button
              key={option}
              type="button"
              onClick={() => setSelected(optionIndex)}
              className={cn(
                "border-border rounded-xl border px-3 py-2 text-left text-sm",
                selected === optionIndex
                  ? "bg-muted ring-ring ring-2"
                  : "hover:bg-muted/30",
              )}
              aria-pressed={selected === optionIndex}
            >
              {option}
            </button>
          ))}
        </div>
        <Button type="button" disabled={selected === null} onClick={submit}>
          {index >= LOCAL_QUIZ.length - 1 ? "Finish" : "Next"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function AiFlashCards({ subject }: { subject: string }) {
  const recordStudyActivity = useAiPlatformStore((s) => s.recordStudyActivity);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = LOCAL_FLASHCARDS[index];

  if (!card) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flash cards</CardTitle>
        <CardDescription>
          {subject} · card {index + 1}/{LOCAL_FLASHCARDS.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          className="border-border hover:bg-muted/20 focus-visible:ring-ring min-h-28 w-full rounded-2xl border px-4 py-6 text-center text-sm outline-none transition focus-visible:ring-2"
          aria-label={flipped ? "Show front" : "Show back"}
        >
          {flipped ? card.back : card.front}
        </button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={index === 0}
            onClick={() => {
              setIndex((v) => Math.max(0, v - 1));
              setFlipped(false);
            }}
          >
            Previous
          </Button>
          <Button
            type="button"
            onClick={() => {
              recordStudyActivity("flashcard", subject);
              if (index >= LOCAL_FLASHCARDS.length - 1) {
                setIndex(0);
              } else {
                setIndex((v) => v + 1);
              }
              setFlipped(false);
            }}
          >
            {index >= LOCAL_FLASHCARDS.length - 1 ? "Restart" : "Next card"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

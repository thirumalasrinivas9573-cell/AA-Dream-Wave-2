"use client";

import { Eraser } from "lucide-react";
import { useEffect, useState } from "react";

import { AiChatPanel, AiPageHeader } from "@/components/ai/ai-shared";
import {
  AiFlashCards,
  AiQuizInterface,
  AiStudyLessonCards,
} from "@/components/ai/ai-study-tools";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TEACHER_PROMPTS, TEACHER_SUBJECTS } from "@/constants/ai-platform";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import { useAiPlatformStore } from "@/store/ai-platform-store";
import type { AiChatMessage } from "@/types/ai-platform";

export function AiTeacherPage() {
  const { token } = useAuth();
  const hydrate = useAiPlatformStore((s) => s.hydrate);
  const hydrated = useAiPlatformStore((s) => s.hydrated);
  const recordStudyActivity = useAiPlatformStore((s) => s.recordStudyActivity);

  const [subjectId, setSubjectId] = useState<(typeof TEACHER_SUBJECTS)[number]["id"]>(
    TEACHER_SUBJECTS[0].id,
  );
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState<"simpler" | "deeper" | "actions" | "">("");
  const [studioTab, setStudioTab] = useState<"chat" | "quiz" | "flashcards">(
    "chat",
  );

  const subject =
    TEACHER_SUBJECTS.find((item) => item.id === subjectId) ?? TEACHER_SUBJECTS[0];
  const session = `teacher_${subject.id}`;

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function load() {
      setHistoryLoading(true);
      setError(null);
      try {
        const data = await studentService.ai.history(session, token!);
        if (!active) return;
        if (data.messages?.length) {
          setMessages(data.messages);
        } else {
          setMessages([
            {
              role: "assistant",
              content: `I’m your AI Teacher for ${subject.label}. Ask for a lesson, example, or practice drill.`,
            },
          ]);
        }
      } catch (err) {
        if (!active) return;
        setMessages([
          {
            role: "assistant",
            content: `I’m your AI Teacher for ${subject.label}. Ask for a lesson, example, or practice drill.`,
          },
        ]);
        setError(toUserSafeMessage(err));
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    queueMicrotask(() => {
      void load();
    });
    return () => {
      active = false;
    };
  }, [session, subject.label, token]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || !token || loading) return;
    setInput("");
    setError(null);
    setStudioTab("chat");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    recordStudyActivity("lesson", subject.label);

    const lessonPrompt = `Subject: ${subject.label}. Teach interactively. User request: ${text}`;

    try {
      const data = await studentService.ai.chat(lessonPrompt, token, {
        session,
        ...(depth ? { mode: depth } : {}),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn’t load a lesson just now. Please try again in a moment.",
        },
      ]);
      setError(toUserSafeMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    if (!token) return;
    try {
      await studentService.ai.clearHistory(session, token);
      setMessages([
        {
          role: "assistant",
          content: `Fresh lesson space for ${subject.label}. What should we cover?`,
        },
      ]);
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  };

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <AiPageHeader
        title="AI Study Experience"
        description="Lesson cards, chapter summaries, quizzes, flash cards, practice, and assignments."
        actions={
          <Button type="button" variant="outline" className="h-10" onClick={() => void clear()}>
            <Eraser className="size-4" aria-hidden="true" />
            Clear lesson
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TEACHER_SUBJECTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubjectId(item.id)}
            className={cn(
              "border-border rounded-2xl border p-4 text-left transition",
              subjectId === item.id
                ? "bg-muted/50 ring-ring ring-2"
                : "hover:bg-muted/30",
            )}
            aria-pressed={subjectId === item.id}
          >
            <p className="font-medium">{item.label}</p>
            <p className="text-muted-foreground mt-1 text-xs text-pretty">
              {item.blurb}
            </p>
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">AI lesson cards</h2>
        <AiStudyLessonCards
          subject={subject.label}
          onSelect={(prompt) => void send(prompt)}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Lesson depth</CardTitle>
          <CardDescription>
            Adjust how the teacher explains each answer.
          </CardDescription>
        </CardHeader>
        <div className="mt-3 flex flex-wrap gap-2 px-6 pb-6">
          {(
            [
              { id: "", label: "Balanced" },
              { id: "simpler", label: "Simpler" },
              { id: "deeper", label: "Deeper" },
              { id: "actions", label: "Actions only" },
            ] as const
          ).map((item) => (
            <Button
              key={item.id || "balanced"}
              type="button"
              size="sm"
              variant={depth === item.id ? "default" : "outline"}
              onClick={() => setDepth(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "chat", label: "Lesson chat" },
            { id: "quiz", label: "Quiz" },
            { id: "flashcards", label: "Flash cards" },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={studioTab === tab.id ? "default" : "outline"}
            onClick={() => setStudioTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {studioTab === "quiz" ? <AiQuizInterface subject={subject.label} /> : null}
      {studioTab === "flashcards" ? (
        <AiFlashCards subject={subject.label} />
      ) : null}

      {studioTab === "chat" ? (
        <AiChatPanel
          messages={messages}
          loading={loading}
          historyLoading={historyLoading}
          error={error}
          input={input}
          onInputChange={setInput}
          onSend={(text) => void send(text)}
          suggestions={[...TEACHER_PROMPTS]}
          placeholder={`Ask about ${subject.label}…`}
          toolId="teacher"
          emptyTitle="Start a lesson"
          emptyDescription="Choose a subject and ask for an explanation, summary, or practice set."
        />
      ) : null}
    </div>
  );
}

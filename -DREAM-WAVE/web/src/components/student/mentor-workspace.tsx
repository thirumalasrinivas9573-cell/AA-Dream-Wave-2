"use client";

import { Eraser } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AiChatPanel, AiPageHeader } from "@/components/ai/ai-shared";
import { AuthAlert } from "@/components/auth/auth-alert";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { MENTOR_PROMPTS } from "@/constants/ai-platform";
import { ROUTES } from "@/constants/routes";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import { useAiPlatformStore } from "@/store/ai-platform-store";
import type { AiChatMessage } from "@/types/ai-platform";
import type { MentorMode } from "@/types/student";

const MODES: Array<{
  id: MentorMode;
  label: string;
  description: string;
}> = [
  {
    id: "general",
    label: "Sage",
    description: "Career coaching and practical guidance",
  },
  {
    id: "hindu",
    label: "Arjuna",
    description: "Vedic wisdom with modern career plans",
  },
  {
    id: "christian",
    label: "Grace",
    description: "Faith-informed encouragement and clarity",
  },
  {
    id: "muslim",
    label: "Nur",
    description: "Islamic wisdom with actionable mentoring",
  },
];

function welcomeMessage(mode: MentorMode, firstName: string): string {
  switch (mode) {
    case "hindu":
      return `Namaste ${firstName}. I am Arjuna. Share what is on your mind, and we will build clarity with purpose.`;
    case "christian":
      return `Peace be with you, ${firstName}. I am Grace. How can I support your next step today?`;
    case "muslim":
      return `Assalamu Alaikum, ${firstName}. I am Nur. What would you like guidance on?`;
    default:
      return `Hey ${firstName}. I’m Sage, your AI mentor. What’s on your mind?`;
  }
}

export function MentorWorkspace() {
  const { token, user } = useAuth();
  const hydrate = useAiPlatformStore((s) => s.hydrate);
  const hydrated = useAiPlatformStore((s) => s.hydrated);
  const toggleDailyGoal = useAiPlatformStore((s) => s.toggleDailyGoal);
  const dailyGoals = useAiPlatformStore((s) => s.dailyGoals);

  const [mode, setMode] = useState<MentorMode>("general");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstName = user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!token) return;
      setHistoryLoading(true);
      setError(null);
      try {
        const data = await studentService.mentor.history(mode, token);
        if (!active) return;
        if (data.messages?.length) {
          setMessages(
            data.messages.map((item) => ({
              role: item.role,
              content: item.content,
            })),
          );
        } else {
          setMessages([
            {
              role: "assistant",
              content: welcomeMessage(mode, firstName),
            },
          ]);
        }
      } catch (err) {
        if (!active) return;
        setMessages([
          {
            role: "assistant",
            content: welcomeMessage(mode, firstName),
          },
        ]);
        setError(toUserSafeMessage(err));
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    queueMicrotask(() => {
      void loadHistory();
    });
    return () => {
      active = false;
    };
  }, [firstName, mode, token]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || !token || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    const mentorGoal = dailyGoals.find((goal) => goal.id === "goal-mentor");
    if (mentorGoal && !mentorGoal.done) toggleDailyGoal("goal-mentor");

    try {
      const data = await studentService.mentor.chat(text, mode, token);
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
            "I couldn’t reach the mentor service just now. Please try again in a moment.",
        },
      ]);
      setError(toUserSafeMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!token) return;
    try {
      await studentService.mentor.clearHistory(mode, token);
      setMessages([
        {
          role: "assistant",
          content: welcomeMessage(mode, firstName),
        },
      ]);
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  };

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <AiPageHeader
        title="AI Mentor"
        description="Modern mentoring chat with voice input, search, bookmarks, and suggested prompts."
        actions={
          <>
            <Link
              href={ROUTES.ai}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              AI Home
            </Link>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => void clearHistory()}
            >
              <Eraser className="size-4" aria-hidden="true" />
              Clear chat
            </Button>
          </>
        }
      />

      {error && historyLoading ? (
        <AuthAlert variant="error" title="Mentor notice" description={error} />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={cn(
              "border-border rounded-2xl border p-4 text-left transition",
              mode === item.id
                ? "bg-muted/50 ring-ring ring-2"
                : "hover:bg-muted/30",
            )}
            aria-pressed={mode === item.id}
          >
            <p className="font-medium">{item.label}</p>
            <p className="text-muted-foreground mt-1 text-xs text-pretty">
              {item.description}
            </p>
          </button>
        ))}
      </div>

      <AiChatPanel
        messages={messages}
        loading={loading}
        historyLoading={historyLoading}
        error={error}
        input={input}
        onInputChange={setInput}
        onSend={(text) => void send(text)}
        suggestions={[...MENTOR_PROMPTS]}
        placeholder="Ask your mentor anything…"
        toolId="mentor"
        emptyTitle="Start mentoring"
        emptyDescription="Pick a persona and ask about career, learning, or motivation."
      />
    </div>
  );
}

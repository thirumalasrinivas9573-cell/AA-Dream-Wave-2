"use client";

import { BookOpen, Eraser, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { AiChatPanel, AiPageHeader } from "@/components/ai/ai-shared";
import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BOOK_ASSISTANT_PROMPTS } from "@/constants/ai-platform";
import { toUserSafeMessage } from "@/lib/errors";
import { studentService } from "@/services/student.service";
import { useAiPlatformStore } from "@/store/ai-platform-store";
import type { AiBookSuggestion, AiChatMessage } from "@/types/ai-platform";

export function AiBookAssistantPage() {
  const { token } = useAuth();
  const hydrate = useAiPlatformStore((s) => s.hydrate);
  const hydrated = useAiPlatformStore((s) => s.hydrated);
  const addPrompt = useAiPlatformStore((s) => s.addPrompt);

  const [topic, setTopic] = useState("");
  const [topicError, setTopicError] = useState<string | null>(null);
  const [books, setBooks] = useState<AiBookSuggestion[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function load() {
      setHistoryLoading(true);
      try {
        const data = await studentService.ai.history("books", token!);
        if (!active) return;
        if (data.messages?.length) {
          setMessages(data.messages);
        } else {
          setMessages([
            {
              role: "assistant",
              content:
                "I’m your Book Assistant. Ask for chapter explanations, summaries, or reading recommendations.",
            },
          ]);
        }
      } catch (err) {
        if (!active) return;
        setError(toUserSafeMessage(err));
        setMessages([
          {
            role: "assistant",
            content:
              "I’m your Book Assistant. Ask for chapter explanations or reading picks.",
          },
        ]);
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  const recommend = async () => {
    const trimmed = topic.trim();
    if (!trimmed) {
      setTopicError("Enter a topic for recommendations.");
      return;
    }
    if (!token) return;
    setTopicError(null);
    setRecommendError(null);
    setRecommendLoading(true);
    addPrompt(trimmed, "books");
    try {
      const data = await studentService.ai.books(trimmed, token);
      setBooks(data.books || []);
    } catch (err) {
      setRecommendError(toUserSafeMessage(err));
    } finally {
      setRecommendLoading(false);
    }
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || !token || loading) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await studentService.ai.chat(text, token, {
        session: "books",
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
            "Book assistant is unavailable right now. Please try again shortly.",
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
      await studentService.ai.clearHistory("books", token);
      setMessages([
        {
          role: "assistant",
          content: "Chat cleared. What book or chapter should we explore?",
        },
      ]);
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  };

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <AiPageHeader
        title="AI Book Assistant"
        description="Book chat, chapter explanations, and reading recommendations."
        actions={
          <Button type="button" variant="outline" className="h-10" onClick={() => void clear()}>
            <Eraser className="size-4" aria-hidden="true" />
            Clear chat
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Reading recommendations</CardTitle>
          <CardDescription>
            Get curated titles for any learning topic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendError ? (
            <AuthAlert
              variant="error"
              title="Recommendation error"
              description={recommendError}
            />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="book-topic">Topic</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="book-topic"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (topicError) setTopicError(null);
                }}
                placeholder="e.g. deep work, system design"
                aria-invalid={Boolean(topicError)}
              />
              <Button
                type="button"
                className="h-10 sm:min-w-40"
                disabled={recommendLoading}
                onClick={() => void recommend()}
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Recommend
              </Button>
            </div>
            {topicError ? (
              <p className="text-destructive text-xs">{topicError}</p>
            ) : null}
          </div>

          {recommendLoading ? (
            <div className="flex justify-center py-8">
              <Spinner label="Finding books" />
            </div>
          ) : null}

          {!recommendLoading && books.length === 0 ? (
            <EmptyState
              title="No recommendations yet"
              description="Enter a topic to generate reading suggestions."
            />
          ) : null}

          {books.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {books.map((book) => (
                <Card key={`${book.title}-${book.author}`} padding="sm">
                  <CardHeader>
                    <div className="mb-1 flex items-center gap-2">
                      <BookOpen className="size-4" aria-hidden="true" />
                      <CardTitle className="text-sm">{book.title}</CardTitle>
                    </div>
                    <CardDescription>
                      {book.author}
                      {book.category ? ` · ${book.category}` : ""}
                      {book.level ? ` · ${book.level}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-xs text-pretty">
                      {book.reason}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() =>
                        void send(
                          `Explain the core ideas of “${book.title}” by ${book.author} and how I should apply them.`,
                        )
                      }
                    >
                      Discuss this book
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AiChatPanel
        messages={messages}
        loading={loading}
        historyLoading={historyLoading}
        error={error}
        input={input}
        onInputChange={setInput}
        onSend={(text) => void send(text)}
        suggestions={[...BOOK_ASSISTANT_PROMPTS]}
        placeholder="Ask about a book or chapter…"
        toolId="books"
      />
    </div>
  );
}

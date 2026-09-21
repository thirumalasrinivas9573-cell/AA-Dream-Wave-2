"use client";

import { Bookmark, Heart, Mic, MicOff, Search, Send } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMounted } from "@/hooks/use-mounted";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { useAiPlatformStore } from "@/store/ai-platform-store";
import type { AiChatMessage } from "@/types/ai-platform";

export function AiPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-sm">AI Learning Experience</p>
        <h1 className="page-title">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div>
      ) : null}
    </header>
  );
}

export function TypingIndicator({ label = "AI is thinking" }: { label?: string }) {
  return (
    <div
      className="bg-muted text-muted-foreground fade-in inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner label={label} />
      <span className="flex gap-1" aria-hidden="true">
        <span className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full motion-reduce:animate-none [animation-delay:-0.2s]" />
        <span className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full motion-reduce:animate-none [animation-delay:-0.1s]" />
        <span className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full motion-reduce:animate-none" />
      </span>
      Thinking…
    </div>
  );
}

function StreamingText({ text }: { text: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(0);
  const [syncedText, setSyncedText] = useState(text);

  if (text !== syncedText) {
    setSyncedText(text);
    setVisible(0);
  }

  useEffect(() => {
    if (reducedMotion) return;
    if (visible >= text.length) return;
    const id = window.setTimeout(() => {
      setVisible((current) =>
        Math.min(
          text.length,
          current + Math.max(1, Math.ceil(text.length / 48)),
        ),
      );
    }, 28);
    return () => window.clearTimeout(id);
  }, [reducedMotion, text, visible]);

  if (reducedMotion) {
    return <span aria-live="polite">{text}</span>;
  }

  return (
    <span aria-live="polite">
      {text.slice(0, visible)}
      {visible < text.length ? (
        <span className="bg-foreground/70 ml-0.5 inline-block h-3 w-1 animate-pulse align-middle" />
      ) : null}
    </span>
  );
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type AiChatPanelProps = {
  messages: AiChatMessage[];
  loading?: boolean;
  historyLoading?: boolean;
  error?: string | null;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (raw?: string) => void;
  suggestions?: string[];
  placeholder?: string;
  toolId: string;
  emptyTitle?: string;
  emptyDescription?: string;
  headerSlot?: ReactNode;
  streamLastAssistant?: boolean;
};

export function AiChatPanel({
  messages,
  loading = false,
  historyLoading = false,
  error = null,
  input,
  onInputChange,
  onSend,
  suggestions = [],
  placeholder = "Ask anything…",
  toolId,
  emptyTitle = "Start a conversation",
  emptyDescription = "Ask a question or pick a suggestion below.",
  headerSlot,
  streamLastAssistant = true,
}: AiChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const addPrompt = useAiPlatformStore((s) => s.addPrompt);
  const promptHistory = useAiPlatformStore((s) => s.promptHistory);
  const toggleFavoritePrompt = useAiPlatformStore((s) => s.toggleFavoritePrompt);
  const bookmarkConversation = useAiPlatformStore((s) => s.bookmarkConversation);
  const [showHistory, setShowHistory] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [bookmarkedFlash, setBookmarkedFlash] = useState(false);
  const mounted = useMounted();
  const voiceSupported = mounted && Boolean(getSpeechRecognition());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    addPrompt(text, toolId);
    onSend(text);
  };

  const toolHistory = promptHistory
    .filter((item) => item.tool === toolId)
    .slice(0, 8);

  const filteredMessages = useMemo(() => {
    const q = chatQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((message) =>
      message.content.toLowerCase().includes(q),
    );
  }, [chatQuery, messages]);

  const toggleVoice = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript?.trim();
      if (transcript) onInputChange(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const bookmarkCurrent = () => {
    const lastAssistant = [...messages]
      .reverse()
      .find((item) => item.role === "assistant");
    const lastUser = [...messages].reverse().find((item) => item.role === "user");
    if (!lastAssistant && !lastUser) return;
    bookmarkConversation({
      tool: toolId,
      title: lastUser?.content.slice(0, 64) || `${toolId} conversation`,
      preview: lastAssistant?.content || lastUser?.content || "",
    });
    setBookmarkedFlash(true);
    window.setTimeout(() => setBookmarkedFlash(false), 1600);
  };

  const lastAssistantIndex = useMemo(() => {
    for (let i = filteredMessages.length - 1; i >= 0; i -= 1) {
      if (filteredMessages[i]?.role === "assistant") return i;
    }
    return -1;
  }, [filteredMessages]);

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <AuthAlert variant="error" title="AI notice" description={error} />
      ) : null}

      {headerSlot}

      <div className="border-border bg-card/40 flex min-h-[20rem] flex-1 flex-col overflow-hidden rounded-2xl border sm:min-h-[26rem]">
        <div className="border-border flex flex-col gap-2 border-b p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[12rem]">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input
              value={chatQuery}
              onChange={(event) => setChatQuery(event.target.value)}
              placeholder="Search this chat…"
              className="h-9 pl-9"
              aria-label="Search conversation"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={bookmarkCurrent}
            disabled={messages.length === 0}
            aria-label="Bookmark conversation"
          >
            <Bookmark
              className={cn("size-3.5", bookmarkedFlash && "fill-current")}
              aria-hidden="true"
            />
            {bookmarkedFlash ? "Saved" : "Bookmark"}
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {historyLoading ? (
            <div className="flex justify-center py-16">
              <Spinner label="Loading conversation" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <EmptyState
              title={chatQuery ? "No matching messages" : emptyTitle}
              description={
                chatQuery
                  ? "Try a different search term."
                  : emptyDescription
              }
            />
          ) : (
            filteredMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.slice(0, 16)}`}
                className={cn(
                  "max-w-[92%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap md:max-w-[78%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted text-foreground",
                )}
              >
                {streamLastAssistant &&
                !loading &&
                !chatQuery &&
                message.role === "assistant" &&
                index === lastAssistantIndex ? (
                  <StreamingText text={message.content} />
                ) : (
                  message.content
                )}
              </div>
            ))
          )}
          {loading ? <TypingIndicator /> : null}
          <div ref={bottomRef} />
        </div>

        <div className="border-border space-y-3 border-t p-4">
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="Suggested prompts">
              {suggestions.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => send(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowHistory((v) => !v)}
            >
              Prompt history
            </Button>
          </div>

          {showHistory && toolHistory.length > 0 ? (
            <ul className="space-y-2">
              {toolHistory.map((item) => (
                <li
                  key={item.id}
                  className="border-border flex items-start gap-2 rounded-xl border px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    className="hover:bg-muted flex-1 rounded-lg px-1 py-0.5 text-left"
                    onClick={() => send(item.text)}
                  >
                    {item.text}
                  </button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={
                      item.favorite ? "Remove favorite" : "Favorite prompt"
                    }
                    aria-pressed={Boolean(item.favorite)}
                    onClick={() => toggleFavoritePrompt(item.id)}
                  >
                    <Heart
                      className={cn(
                        "size-4",
                        item.favorite && "fill-current text-rose-500",
                      )}
                    />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <Textarea
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder={placeholder}
              className="min-h-20 flex-1"
              disabled={loading}
              aria-label="Message"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <div className="flex gap-2 sm:flex-col">
              {voiceSupported ? (
                <Button
                  type="button"
                  variant={listening ? "default" : "outline"}
                  className="h-10"
                  aria-pressed={listening}
                  aria-label={listening ? "Stop voice input" : "Start voice input"}
                  onClick={toggleVoice}
                  disabled={loading}
                >
                  {listening ? (
                    <MicOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Mic className="size-4" aria-hidden="true" />
                  )}
                  {listening ? "Listening" : "Voice"}
                </Button>
              ) : null}
              <Button
                type="submit"
                className="h-10 sm:min-w-28"
                disabled={loading || !input.trim()}
              >
                <Send className="size-4" aria-hidden="true" />
                Send
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

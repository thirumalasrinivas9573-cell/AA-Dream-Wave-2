"use client";

import { Paperclip, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { CommunityNav, CommunityPageHeader } from "@/components/community/community-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCommunityStore } from "@/store/community-store";

export function MessagesPage() {
  const hydrate = useCommunityStore((s) => s.hydrate);
  const hydrated = useCommunityStore((s) => s.hydrated);
  const conversations = useCommunityStore((s) => s.conversations);
  const messages = useCommunityStore((s) => s.messages);
  const sendMessage = useCommunityStore((s) => s.sendMessage);

  const [activeId, setActiveId] = useState<string>("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [conversations],
  );

  const currentId = activeId || sortedConversations[0]?.id || "";
  const thread = useMemo(
    () => messages.filter((item) => item.conversationId === currentId),
    [currentId, messages],
  );
  const activeConversation = sortedConversations.find(
    (item) => item.id === currentId,
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading messages" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <CommunityPageHeader
        title="Messaging"
        description="Conversations, chat, media/file sharing, and notifications."
      />
      <CommunityNav />

      {sortedConversations.length === 0 ? (
        <EmptyState
          title="No conversations"
          description="Start collaborating in a team or mentor session."
        />
      ) : (
        <div className="grid min-h-[24rem] gap-4 lg:min-h-[28rem] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <Card className="max-lg:max-h-72 max-lg:overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-base">Conversation list</CardTitle>
              <CardDescription>
                Unread badges highlight new activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveId(conversation.id)}
                  className={cn(
                    "border-border w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    currentId === conversation.id
                      ? "bg-muted/50 ring-ring ring-2"
                      : "hover:bg-muted/30",
                  )}
                  aria-current={currentId === conversation.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{conversation.title}</p>
                    {conversation.unread > 0 ? (
                      <Badge>{conversation.unread}</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                    {conversation.lastMessage}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">
                {activeConversation?.title || "Chat"}
              </CardTitle>
              <CardDescription>
                {activeConversation?.participants.join(" · ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
              <div
                className="min-h-56 flex-1 space-y-2 overflow-y-auto rounded-xl border border-border p-3"
                role="log"
                aria-label="Chat messages"
              >
                {thread.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      message.from === "You"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted",
                    )}
                  >
                    <p className="text-[10px] opacity-80">{message.from}</p>
                    {message.kind === "file" ? (
                      <p className="inline-flex items-center gap-1">
                        <Paperclip className="size-3.5" aria-hidden="true" />
                        {message.fileName || message.body}
                      </p>
                    ) : (
                      <p>{message.body}</p>
                    )}
                  </div>
                ))}
              </div>
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage(currentId, draft);
                  setDraft("");
                }}
              >
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message…"
                  aria-label="Message"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      sendMessage(currentId, "shared-resource.pdf", "file");
                    }}
                  >
                    <Paperclip className="size-4" aria-hidden="true" />
                    File
                  </Button>
                  <Button type="submit" disabled={!draft.trim()}>
                    <Send className="size-4" aria-hidden="true" />
                    Send
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

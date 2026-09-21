"use client";

import { Bookmark, MessageSquare, Share2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { RetryAction } from "@/components/common/retry-action";
import { Spinner } from "@/components/common/spinner";
import { CommunityNav, CommunityPageHeader } from "@/components/community/community-nav";
import { useAuth } from "@/components/providers/auth-provider";
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
import { Textarea } from "@/components/ui/textarea";
import { mapCommunityApiPost } from "@/lib/community/map-post";
import { communityApi } from "@/lib/api/community";
import { toUserSafeMessage } from "@/lib/errors";
import { useCommunityStore } from "@/store/community-store";
import type { DiscussionPost } from "@/types/community";

const TAGS = ["General", "Achievement", "Books", "Goals", "Habits"] as const;
const FEED_MODES = [
  { id: "for_you", label: "For You" },
  { id: "following", label: "Following" },
  { id: "projects", label: "Projects" },
  { id: "research", label: "Research" },
  { id: "opportunities", label: "Opportunities" },
] as const;

export function DiscussionsPage() {
  const { token } = useAuth();
  const hydrate = useCommunityStore((s) => s.hydrate);
  const hydrated = useCommunityStore((s) => s.hydrated);
  const toggleSavePost = useCommunityStore((s) => s.toggleSavePost);
  const addComment = useCommunityStore((s) => s.addComment);

  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingLiveFeed, setUsingLiveFeed] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<(typeof TAGS)[number]>("General");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<(typeof FEED_MODES)[number]["id"]>("for_you");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!token) {
      await Promise.resolve();
      setPosts(useCommunityStore.getState().posts);
      setUsingLiveFeed(false);
      setLoading(false);
      return;
    }

    try {
      const data = await communityApi.getFeed(token, { mode: feedMode });
      const mapped = (data.posts ?? []).map(mapCommunityApiPost);
      setPosts(mapped);
      setLiked(
        Object.fromEntries(
          (data.posts ?? []).map((post) => [post._id, Boolean(post.likedByMe)]),
        ),
      );
      setUsingLiveFeed(true);
    } catch (err) {
      setError(toUserSafeMessage(err));
      setPosts(useCommunityStore.getState().posts);
      setUsingLiveFeed(false);
    } finally {
      setLoading(false);
    }
  }, [token, feedMode]);

  useEffect(() => {
    if (!hydrated) return;
    const frame = window.requestAnimationFrame(() => {
      void loadFeed();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, loadFeed]);

  const publish = async () => {
    if (!title.trim() || !body.trim()) return;
    const content = `${title.trim()}\n\n${body.trim()}`;

    if (!token || !usingLiveFeed) {
      useCommunityStore.getState().createPost({
        communityId:
          useCommunityStore.getState().communities.find((c) => c.joined)?.id ||
          useCommunityStore.getState().communities[0]?.id ||
          "general",
        title: title.trim(),
        body: body.trim(),
        tags: [tag],
      });
      setPosts(useCommunityStore.getState().posts);
      setTitle("");
      setBody("");
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const data = await communityApi.create(
        { content, title: title.trim(), tag, postType: "DISCUSSION", visibility: "public" },
        token,
      );
      setPosts((prev) => [mapCommunityApiPost(data.post), ...prev]);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  const onLike = async (postId: string) => {
    if (!token || !usingLiveFeed) {
      useCommunityStore.getState().reactToPost(postId, "like");
      setPosts(useCommunityStore.getState().posts);
      return;
    }

    try {
      const data = await communityApi.toggleLike(postId, token);
      setLiked((prev) => ({ ...prev, [postId]: data.likedByMe }));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                reactions: post.reactions.map((reaction) =>
                  reaction.type === "like"
                    ? { ...reaction, count: data.likeCount }
                    : reaction,
                ),
              }
            : post,
        ),
      );
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  };

  if (!hydrated || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading discussions" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <CommunityPageHeader
        title="Discussions"
        description={
          usingLiveFeed
            ? "Live community feed connected to Dream Wave API."
            : "Local community feed — sign in to sync with the live API."
        }
      />
      <CommunityNav />

      {usingLiveFeed ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Feed filters">
          {FEED_MODES.map((mode) => (
            <Button
              key={mode.id}
              type="button"
              size="sm"
              variant={feedMode === mode.id ? "default" : "outline"}
              aria-pressed={feedMode === mode.id}
              onClick={() => setFeedMode(mode.id)}
            >
              {mode.label}
            </Button>
          ))}
        </div>
      ) : null}

      {error ? (
        <AuthAlert
          variant="error"
          title="Community sync notice"
          description={error}
        >
          <div className="mt-2">
            <RetryAction onRetry={() => void loadFeed()} />
          </div>
        </AuthAlert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create a post</CardTitle>
          <CardDescription>Share an update with your communities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Post title"
            aria-label="Post title"
          />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your discussion…"
            className="min-h-24"
            aria-label="Post body"
          />
          <div className="flex flex-wrap gap-2">
            {TAGS.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={tag === item ? "default" : "outline"}
                aria-pressed={tag === item}
                onClick={() => setTag(item)}
              >
                {item}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            disabled={!title.trim() || !body.trim() || publishing}
            onClick={() => void publish()}
          >
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </CardContent>
      </Card>

      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Be the first to start a discussion."
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="interactive-surface">
              <CardHeader>
                <CardTitle className="text-base">{post.title}</CardTitle>
                <CardDescription>
                  {post.author} · {new Date(post.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm whitespace-pre-wrap">{post.body}</p>
                {post.linkedEntity?.snapshot ? (
                  <div className="bg-muted/40 rounded-xl border p-3 text-sm">
                    <p className="font-medium">
                      {(post.linkedEntity.snapshot.title as string) ||
                        (post.linkedEntity.snapshot.topic as string) ||
                        "Linked content"}
                    </p>
                    {post.linkedEntity.snapshot.description ? (
                      <p className="text-muted-foreground mt-1">{String(post.linkedEntity.snapshot.description)}</p>
                    ) : null}
                  </div>
                ) : null}
                {post.relevanceReason ? (
                  <p className="text-muted-foreground text-xs">{post.relevanceReason}</p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {post.reactions.map((reaction) => (
                    <Button
                      key={reaction.type}
                      type="button"
                      size="sm"
                      variant={
                        reaction.type === "like" && liked[post.id]
                          ? "default"
                          : "outline"
                      }
                      aria-pressed={
                        reaction.type === "like" ? Boolean(liked[post.id]) : undefined
                      }
                      onClick={() => void onLike(post.id)}
                    >
                      {reaction.type} · {reaction.count}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-pressed={Boolean(post.saved)}
                    onClick={async () => {
                      if (usingLiveFeed && token) {
                        try {
                          const data = await communityApi.toggleBookmark(post.id, token);
                          setPosts((prev) =>
                            prev.map((item) =>
                              item.id === post.id ? { ...item, saved: data.bookmarkedByMe } : item,
                            ),
                          );
                        } catch (err) {
                          setError(toUserSafeMessage(err));
                        }
                        return;
                      }
                      toggleSavePost(post.id);
                      setPosts(useCommunityStore.getState().posts);
                    }}
                  >
                    <Bookmark className="size-3.5" aria-hidden="true" />
                    {post.saved ? "Saved" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const url = `${window.location.origin}/community/discussions`;
                      try {
                        await navigator.clipboard.writeText(url);
                        setSharedId(post.id);
                        window.setTimeout(() => setSharedId(null), 1200);
                      } catch {
                        setSharedId(post.id);
                      }
                    }}
                  >
                    <Share2 className="size-3.5" aria-hidden="true" />
                    {sharedId === post.id ? "Copied" : "Share"}
                  </Button>
                </div>

                <div className="border-border space-y-2 rounded-xl border p-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    AI suggested replies
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {post.aiSuggestions.map((suggestion) => (
                      <Button
                        key={suggestion}
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [post.id]: suggestion,
                          }))
                        }
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="size-3.5" aria-hidden="true" />
                    Comments
                  </p>
                  {post.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-border rounded-xl border px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{comment.author}</p>
                      <p className="text-muted-foreground mt-1">{comment.body}</p>
                    </div>
                  ))}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={commentDrafts[post.id] || ""}
                      onChange={(event) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post.id]: event.target.value,
                        }))
                      }
                      placeholder="Write a comment…"
                      aria-label={`Comment on ${post.title}`}
                    />
                    <Button
                      type="button"
                      onClick={async () => {
                        const draft = commentDrafts[post.id] || "";
                        if (!draft.trim()) return;
                        if (usingLiveFeed && token) {
                          try {
                            const data = await communityApi.addComment(post.id, draft.trim(), token);
                            setPosts((prev) =>
                              prev.map((item) =>
                                item.id === post.id
                                  ? {
                                      ...item,
                                      comments: [
                                        ...item.comments,
                                        {
                                          id: data.comment?.id || `local-${Date.now()}`,
                                          author: data.comment?.name || "You",
                                          body: data.comment?.content || draft.trim(),
                                          createdAt: data.comment?.createdAt || new Date().toISOString(),
                                          replies: [],
                                        },
                                      ],
                                    }
                                  : item,
                              ),
                            );
                          } catch (err) {
                            setError(toUserSafeMessage(err));
                          }
                        } else if (usingLiveFeed) {
                          setPosts((prev) =>
                            prev.map((item) =>
                              item.id === post.id
                                ? {
                                    ...item,
                                    comments: [
                                      ...item.comments,
                                      {
                                        id: `local-${Date.now()}`,
                                        author: "You",
                                        body: draft.trim(),
                                        createdAt: new Date().toISOString(),
                                        replies: [],
                                      },
                                    ],
                                  }
                                : item,
                            ),
                          );
                        } else {
                          addComment(post.id, draft);
                          setPosts(useCommunityStore.getState().posts);
                        }
                        setCommentDrafts((prev) => ({ ...prev, [post.id]: "" }));
                      }}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

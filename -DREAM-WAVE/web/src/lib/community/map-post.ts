import type { CommunityApiPost } from "@/lib/api/community";
import type { DiscussionPost } from "@/types/community";

/**
 * Maps backend community posts into the discussions UI model.
 */
export function mapCommunityApiPost(post: CommunityApiPost): DiscussionPost {
  const lines = post.content.split("\n").map((line) => line.trim()).filter(Boolean);
  const title = post.title?.trim() || lines[0]?.slice(0, 120) || post.tag || post.postType || "Community update";
  const body =
    post.title?.trim() && lines.length > 0
      ? post.content.replace(new RegExp(`^${lines[0]}\\s*`), "").trim() || post.content
      : lines.length > 1
        ? lines.slice(1).join("\n")
        : post.content;

  const reactions = [
    { type: "like" as const, count: post.likeCount ?? post.likes?.length ?? 0 },
    { type: "insight" as const, count: post.insight?.count ?? 0 },
    { type: "helpful" as const, count: post.helpful?.count ?? 0 },
  ];

  const mapped: DiscussionPost = {
    id: post.id || post._id,
    communityId: "live-feed",
    author: post.authorName,
    title,
    body,
    tags: [post.postType || post.tag || "General"].filter(Boolean) as string[],
    createdAt: post.createdAt ?? new Date().toISOString(),
    reactions,
    comments: (post.comments ?? []).map((comment, index) => ({
      id: comment.id ?? comment._id ?? `${post._id}-c${index}`,
      author: comment.name ?? "Member",
      body: comment.content ?? "",
      createdAt: comment.createdAt ?? new Date().toISOString(),
      replies: [],
    })),
    saved: Boolean(post.bookmarkedByMe),
    aiSuggestions: [],
    linkedEntity: post.linkedEntity ?? null,
    relevanceReason: post.relevanceReason ?? null,
  };

  if (post.postType) mapped.postType = post.postType;
  if (post.visibility) mapped.visibility = post.visibility;
  if (post.likedByMe !== undefined) mapped.likedByMe = post.likedByMe;

  return mapped;
}

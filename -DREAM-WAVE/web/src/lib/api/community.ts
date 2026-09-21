import { apiRequest } from "@/lib/api/client";

export type CommunityLinkedEntity = {
  entityType: string;
  entityId: string;
  snapshot?: Record<string, unknown>;
};

export type CommunityApiPost = {
  id?: string;
  _id: string;
  userId?: string;
  authorName: string;
  authorInitials?: string;
  authorRole?: string;
  title?: string;
  content: string;
  tag?: string;
  postType?: string;
  visibility?: string;
  linkedEntity?: CommunityLinkedEntity | null;
  likeCount?: number;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
  relevanceReason?: string | null;
  aiClassification?: string;
  createdAt?: string;
  likes?: string[];
  insight?: { count: number; reactedByMe: boolean };
  helpful?: { count: number; reactedByMe: boolean };
  comments?: Array<{
    id?: string;
    _id?: string;
    userId?: string;
    name?: string;
    content?: string;
    createdAt?: string;
  }>;
};

export type CommunityPostsResponse = {
  success: boolean;
  posts: CommunityApiPost[];
  total?: number;
  page?: number;
  limit?: number;
  mode?: string;
};

export type CommunityPostResponse = {
  success: boolean;
  post: CommunityApiPost;
};

export type CommunityLikeResponse = {
  success: boolean;
  likeCount: number;
  likedByMe: boolean;
};

export const communityApi = {
  list: (token: string, params?: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) search.set(k, v);
      }
    }
    const q = search.toString();
    return apiRequest<CommunityPostsResponse>(`/community${q ? `?${q}` : ""}`, {
      method: "GET",
      token,
    });
  },

  getFeed: (token: string, params?: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) search.set(k, v);
      }
    }
    const q = search.toString();
    return apiRequest<CommunityPostsResponse>(`/community/feed${q ? `?${q}` : ""}`, {
      method: "GET",
      token,
    });
  },

  create: (
    payload: {
      content: string;
      title?: string;
      tag?: string;
      postType?: string;
      visibility?: string;
      linkedEntity?: { entityType: string; entityId: string };
    },
    token: string,
  ) =>
    apiRequest<CommunityPostResponse>("/community", {
      method: "POST",
      body: payload,
      token,
    }),

  update: (id: string, payload: { content?: string; title?: string; visibility?: string }, token: string) =>
    apiRequest<CommunityPostResponse>(`/community/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),

  toggleLike: (id: string, token: string) =>
    apiRequest<CommunityLikeResponse>(`/community/${id}/like`, {
      method: "PUT",
      token,
    }),

  toggleReaction: (id: string, type: "insight" | "helpful", token: string) =>
    apiRequest<{ success: boolean; reactedByMe: boolean; count: number }>(
      `/community/${id}/reactions/${type}`,
      { method: "PUT", token },
    ),

  addComment: (id: string, content: string, token: string) =>
    apiRequest<{ success: boolean; comment: NonNullable<CommunityApiPost["comments"]>[number] }>(
      `/community/${id}/comments`,
      { method: "POST", body: { content }, token },
    ),

  toggleBookmark: (id: string, token: string) =>
    apiRequest<{ success: boolean; bookmarkedByMe: boolean }>(`/community/${id}/bookmark`, {
      method: "POST",
      token,
    }),

  remove: (id: string, token: string) =>
    apiRequest<{ success: boolean }>(`/community/${id}`, {
      method: "DELETE",
      token,
    }),

  search: (token: string, q: string) =>
    apiRequest<{ success: boolean; posts: CommunityApiPost[]; users: Array<{ id: string; name: string; role: string }> }>(
      `/community/search?q=${encodeURIComponent(q)}`,
      { token },
    ),

  getAiSuggestions: (id: string, token: string) =>
    apiRequest<{ success: boolean; suggestions: string[] }>(`/community/${id}/ai-suggestions`, {
      token,
    }),

  follow: (targetType: string, targetId: string, token: string) =>
    apiRequest<{ success: boolean; following: boolean }>("/community/follow", {
      method: "POST",
      body: { targetType, targetId },
      token,
    }),

  requestCollaboration: (
    payload: { targetUserId: string; postId?: string; message?: string },
    token: string,
  ) =>
    apiRequest<{ success: boolean; request: { id: string; status: string } }>(
      "/community/collaboration",
      { method: "POST", body: payload, token },
    ),
};

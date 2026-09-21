"use client";

import { SEED_COMMUNITY } from "@/constants/community";
import { STORAGE_KEYS } from "@/constants/storage";
import { createAppStore } from "@/store";
import type {
  CommunityUserState,
  DiscussionPost,
} from "@/types/community";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

function loadState(): CommunityUserState {
  const stored = getJsonStorageItem<Partial<CommunityUserState>>(
    STORAGE_KEYS.communityData,
  );
  if (stored && Array.isArray(stored.communities)) {
    return {
      ...structuredClone(SEED_COMMUNITY),
      ...stored,
      communities: stored.communities,
      posts: stored.posts ?? SEED_COMMUNITY.posts,
      mentors: stored.mentors ?? SEED_COMMUNITY.mentors,
      groups: stored.groups ?? SEED_COMMUNITY.groups,
      teams: stored.teams ?? SEED_COMMUNITY.teams,
      projects: stored.projects ?? SEED_COMMUNITY.projects,
      conversations: stored.conversations ?? SEED_COMMUNITY.conversations,
      messages: stored.messages ?? SEED_COMMUNITY.messages,
      activity: stored.activity ?? SEED_COMMUNITY.activity,
      bookedMentorIds: stored.bookedMentorIds ?? SEED_COMMUNITY.bookedMentorIds,
    };
  }
  return structuredClone(SEED_COMMUNITY);
}

function persist(state: CommunityUserState) {
  setJsonStorageItem(STORAGE_KEYS.communityData, state);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function snapshot(get: () => CommunityStore): CommunityUserState {
  const state = get();
  return {
    communities: state.communities,
    posts: state.posts,
    mentors: state.mentors,
    groups: state.groups,
    teams: state.teams,
    projects: state.projects,
    conversations: state.conversations,
    messages: state.messages,
    activity: state.activity,
    bookedMentorIds: state.bookedMentorIds,
  };
}

type CommunityStore = CommunityUserState & {
  hydrated: boolean;
  hydrate: () => void;
  toggleJoinCommunity: (id: string) => void;
  toggleSavePost: (id: string) => void;
  reactToPost: (id: string, type: "like" | "insight" | "helpful") => void;
  addComment: (postId: string, body: string) => void;
  createPost: (input: {
    communityId: string;
    title: string;
    body: string;
    tags: string[];
  }) => void;
  toggleTeamTask: (teamId: string, taskId: string) => void;
  bookMentor: (mentorId: string) => void;
  sendMessage: (conversationId: string, body: string, kind?: "text" | "file") => void;
};

export const useCommunityStore = createAppStore<CommunityStore>((set, get) => ({
  ...SEED_COMMUNITY,
  hydrated: false,

  hydrate: () => {
    set({ ...loadState(), hydrated: true });
  },

  toggleJoinCommunity: (id) => {
    set((state) => {
      const communities = state.communities.map((item) =>
        item.id === id
          ? {
              ...item,
              joined: !item.joined,
              members: item.joined
                ? Math.max(0, item.members - 1)
                : item.members + 1,
            }
          : item,
      );
      const community = communities.find((item) => item.id === id);
      const activity = community
        ? [
            {
              id: createId("act"),
              label: community.joined
                ? `Joined ${community.name}`
                : `Left ${community.name}`,
              at: new Date().toISOString(),
              kind: "join" as const,
            },
            ...state.activity,
          ].slice(0, 30)
        : state.activity;
      const next = { ...snapshot(get), communities, activity };
      persist(next);
      return { communities, activity };
    });
  },

  toggleSavePost: (id) => {
    set((state) => {
      const posts = state.posts.map((post) =>
        post.id === id ? { ...post, saved: !post.saved } : post,
      );
      const next = { ...snapshot(get), posts };
      persist(next);
      return { posts };
    });
  },

  reactToPost: (id, type) => {
    set((state) => {
      const posts = state.posts.map((post) => {
        if (post.id !== id) return post;
        const reactions = post.reactions.map((reaction) =>
          reaction.type === type
            ? { ...reaction, count: reaction.count + 1 }
            : reaction,
        );
        return { ...post, reactions };
      });
      const next = { ...snapshot(get), posts };
      persist(next);
      return { posts };
    });
  },

  addComment: (postId, body) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    set((state) => {
      const posts = state.posts.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: [
            ...post.comments,
            {
              id: createId("c"),
              author: "You",
              body: trimmed,
              createdAt: new Date().toISOString(),
              replies: [],
            },
          ],
        };
      });
      const next = { ...snapshot(get), posts };
      persist(next);
      return { posts };
    });
  },

  createPost: ({ communityId, title, body, tags }) => {
    const post: DiscussionPost = {
      id: createId("post"),
      communityId,
      author: "You",
      title: title.trim() || "Untitled discussion",
      body: body.trim(),
      tags,
      createdAt: new Date().toISOString(),
      reactions: [
        { type: "like", count: 0 },
        { type: "insight", count: 0 },
        { type: "helpful", count: 0 },
      ],
      comments: [],
      saved: false,
      aiSuggestions: [
        "Invite a teammate to expand on this idea.",
        "Ask for one concrete example from the community.",
      ],
    };
    set((state) => {
      const posts = [post, ...state.posts];
      const activity = [
        {
          id: createId("act"),
          label: `Posted: ${post.title}`,
          at: new Date().toISOString(),
          kind: "post" as const,
        },
        ...state.activity,
      ].slice(0, 30);
      const next = { ...snapshot(get), posts, activity };
      persist(next);
      return { posts, activity };
    });
  },

  toggleTeamTask: (teamId, taskId) => {
    set((state) => {
      const teams = state.teams.map((team) => {
        if (team.id !== teamId) return team;
        return {
          ...team,
          sharedTasks: team.sharedTasks.map((task) =>
            task.id === taskId ? { ...task, done: !task.done } : task,
          ),
        };
      });
      const next = { ...snapshot(get), teams };
      persist(next);
      return { teams };
    });
  },

  bookMentor: (mentorId) => {
    set((state) => {
      if (state.bookedMentorIds.includes(mentorId)) return {};
      const bookedMentorIds = [...state.bookedMentorIds, mentorId];
      const mentor = state.mentors.find((item) => item.id === mentorId);
      const activity = mentor
        ? [
            {
              id: createId("act"),
              label: `Booked mentor session with ${mentor.name}`,
              at: new Date().toISOString(),
              kind: "session" as const,
            },
            ...state.activity,
          ].slice(0, 30)
        : state.activity;
      const next = { ...snapshot(get), bookedMentorIds, activity };
      persist(next);
      return { bookedMentorIds, activity };
    });
  },

  sendMessage: (conversationId, body, kind = "text") => {
    const trimmed = body.trim();
    if (!trimmed) return;
    set((state) => {
      const message =
        kind === "file"
          ? {
              id: createId("msg"),
              conversationId,
              from: "You",
              body: trimmed,
              at: new Date().toISOString(),
              kind: "file" as const,
              fileName: trimmed,
            }
          : {
              id: createId("msg"),
              conversationId,
              from: "You",
              body: trimmed,
              at: new Date().toISOString(),
              kind: "text" as const,
            };
      const messages = [...state.messages, message];
      const conversations = state.conversations.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              lastMessage: trimmed,
              updatedAt: message.at,
              unread: 0,
            }
          : item,
      );
      const next = { ...snapshot(get), messages, conversations };
      persist(next);
      return { messages, conversations };
    });
  },
}));

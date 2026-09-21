"use client";

import { DEFAULT_DAILY_GOALS } from "@/constants/ai-platform";
import { STORAGE_KEYS } from "@/constants/storage";
import { createAppStore } from "@/store";
import type {
  AiConversationBookmark,
  AiDailyGoal,
  AiPlatformUserState,
  AiPromptRecord,
  AiRoadmapProgress,
  AiStudyProgress,
} from "@/types/ai-platform";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

const DEFAULT_STUDY: AiStudyProgress = {
  quizzesCompleted: 0,
  flashcardsReviewed: 0,
  lessonsStarted: 0,
};

const DEFAULT_STATE: AiPlatformUserState = {
  favorites: [],
  promptHistory: [],
  recentSearches: [],
  roadmapProgress: null,
  notifications: [],
  dailyGoals: DEFAULT_DAILY_GOALS.map((goal) => ({ ...goal })),
  conversationBookmarks: [],
  studyProgress: DEFAULT_STUDY,
};

function loadState(): AiPlatformUserState {
  const stored = getJsonStorageItem<Partial<AiPlatformUserState>>(
    STORAGE_KEYS.aiPlatformData,
  );
  if (stored && Array.isArray(stored.promptHistory)) {
    return {
      favorites: stored.favorites ?? [],
      promptHistory: stored.promptHistory ?? [],
      recentSearches: stored.recentSearches ?? [],
      roadmapProgress: stored.roadmapProgress ?? null,
      notifications: stored.notifications ?? [],
      dailyGoals:
        stored.dailyGoals?.length
          ? stored.dailyGoals
          : DEFAULT_DAILY_GOALS.map((goal) => ({ ...goal })),
      conversationBookmarks: stored.conversationBookmarks ?? [],
      studyProgress: {
        ...DEFAULT_STUDY,
        ...(stored.studyProgress ?? {}),
      },
    };
  }
  return structuredClone(DEFAULT_STATE);
}

function persist(state: AiPlatformUserState) {
  setJsonStorageItem(STORAGE_KEYS.aiPlatformData, state);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type AiPlatformStore = AiPlatformUserState & {
  hydrated: boolean;
  hydrate: () => void;
  addPrompt: (text: string, tool: string) => void;
  toggleFavoritePrompt: (id: string) => void;
  removePrompt: (id: string) => void;
  clearPromptHistory: () => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  setRoadmapProgress: (progress: AiRoadmapProgress | null) => void;
  toggleRoadmapStep: (stepKey: string) => void;
  pushNotification: (message: string) => void;
  clearNotifications: () => void;
  toggleDailyGoal: (id: string) => void;
  resetDailyGoals: () => void;
  bookmarkConversation: (input: {
    tool: string;
    title: string;
    preview: string;
  }) => void;
  removeConversationBookmark: (id: string) => void;
  recordStudyActivity: (
    kind: "quiz" | "flashcard" | "lesson",
    subject?: string,
  ) => void;
};

function snapshot(get: () => AiPlatformStore): AiPlatformUserState {
  const state = get();
  return {
    favorites: state.favorites,
    promptHistory: state.promptHistory,
    recentSearches: state.recentSearches,
    roadmapProgress: state.roadmapProgress,
    notifications: state.notifications,
    dailyGoals: state.dailyGoals,
    conversationBookmarks: state.conversationBookmarks,
    studyProgress: state.studyProgress,
  };
}

export const useAiPlatformStore = createAppStore<AiPlatformStore>((set, get) => ({
  ...DEFAULT_STATE,
  hydrated: false,

  hydrate: () => {
    const loaded = loadState();
    set({ ...loaded, hydrated: true });
  },

  addPrompt: (text, tool) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const record: AiPromptRecord = {
      id: createId("prompt"),
      text: trimmed,
      tool,
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const promptHistory = [
        record,
        ...state.promptHistory.filter((item) => item.text !== trimmed),
      ].slice(0, 40);
      const next = { ...snapshot(get), promptHistory };
      persist(next);
      return { promptHistory };
    });
  },

  toggleFavoritePrompt: (id) => {
    set((state) => {
      const promptHistory = state.promptHistory.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite } : item,
      );
      const favorites = promptHistory.filter((item) => item.favorite);
      const next = { ...snapshot(get), promptHistory, favorites };
      persist(next);
      return { promptHistory, favorites };
    });
  },

  removePrompt: (id) => {
    set((state) => {
      const promptHistory = state.promptHistory.filter((item) => item.id !== id);
      const favorites = promptHistory.filter((item) => item.favorite);
      const next = { ...snapshot(get), promptHistory, favorites };
      persist(next);
      return { promptHistory, favorites };
    });
  },

  clearPromptHistory: () => {
    const next = {
      ...snapshot(get),
      promptHistory: [],
      favorites: [],
    };
    persist(next);
    set({ promptHistory: [], favorites: [] });
  },

  addRecentSearch: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    set((state) => {
      const recentSearches = [
        trimmed,
        ...state.recentSearches.filter((item) => item !== trimmed),
      ].slice(0, 12);
      const next = { ...snapshot(get), recentSearches };
      persist(next);
      return { recentSearches };
    });
  },

  clearRecentSearches: () => {
    const next = { ...snapshot(get), recentSearches: [] };
    persist(next);
    set({ recentSearches: [] });
  },

  setRoadmapProgress: (progress) => {
    const next = { ...snapshot(get), roadmapProgress: progress };
    persist(next);
    set({ roadmapProgress: progress });
  },

  toggleRoadmapStep: (stepKey) => {
    set((state) => {
      if (!state.roadmapProgress) return {};
      const exists = state.roadmapProgress.completedSteps.includes(stepKey);
      const completedSteps = exists
        ? state.roadmapProgress.completedSteps.filter((s) => s !== stepKey)
        : [...state.roadmapProgress.completedSteps, stepKey];
      const roadmapProgress: AiRoadmapProgress = {
        ...state.roadmapProgress,
        completedSteps,
        updatedAt: new Date().toISOString(),
      };
      const dailyGoals = state.dailyGoals.map((goal) =>
        goal.id === "goal-roadmap" ? { ...goal, done: true } : goal,
      );
      const next = { ...snapshot(get), roadmapProgress, dailyGoals };
      persist(next);
      return { roadmapProgress, dailyGoals };
    });
  },

  pushNotification: (message) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    set((state) => {
      const notifications = [trimmed, ...state.notifications].slice(0, 8);
      const next = { ...snapshot(get), notifications };
      persist(next);
      return { notifications };
    });
  },

  clearNotifications: () => {
    const next = { ...snapshot(get), notifications: [] };
    persist(next);
    set({ notifications: [] });
  },

  toggleDailyGoal: (id) => {
    set((state) => {
      const dailyGoals: AiDailyGoal[] = state.dailyGoals.map((goal) =>
        goal.id === id ? { ...goal, done: !goal.done } : goal,
      );
      const next = { ...snapshot(get), dailyGoals };
      persist(next);
      return { dailyGoals };
    });
  },

  resetDailyGoals: () => {
    const dailyGoals = DEFAULT_DAILY_GOALS.map((goal) => ({ ...goal }));
    const next = { ...snapshot(get), dailyGoals };
    persist(next);
    set({ dailyGoals });
  },

  bookmarkConversation: ({ tool, title, preview }) => {
    const record: AiConversationBookmark = {
      id: createId("chat"),
      tool,
      title: title.trim() || "Saved conversation",
      preview: preview.trim().slice(0, 160),
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const conversationBookmarks = [
        record,
        ...state.conversationBookmarks.filter(
          (item) => item.preview !== record.preview,
        ),
      ].slice(0, 24);
      const next = { ...snapshot(get), conversationBookmarks };
      persist(next);
      return { conversationBookmarks };
    });
  },

  removeConversationBookmark: (id) => {
    set((state) => {
      const conversationBookmarks = state.conversationBookmarks.filter(
        (item) => item.id !== id,
      );
      const next = { ...snapshot(get), conversationBookmarks };
      persist(next);
      return { conversationBookmarks };
    });
  },

  recordStudyActivity: (kind, subject) => {
    set((state) => {
      const studyProgress: AiStudyProgress = {
        quizzesCompleted:
          state.studyProgress.quizzesCompleted + (kind === "quiz" ? 1 : 0),
        flashcardsReviewed:
          state.studyProgress.flashcardsReviewed +
          (kind === "flashcard" ? 1 : 0),
        lessonsStarted:
          state.studyProgress.lessonsStarted + (kind === "lesson" ? 1 : 0),
        lastActivityAt: new Date().toISOString(),
      };
      const nextSubject = subject || state.studyProgress.lastSubject;
      if (nextSubject) studyProgress.lastSubject = nextSubject;
      const dailyGoals = state.dailyGoals.map((goal) =>
        goal.id === "goal-study" ? { ...goal, done: true } : goal,
      );
      const next = { ...snapshot(get), studyProgress, dailyGoals };
      persist(next);
      return { studyProgress, dailyGoals };
    });
  },
}));

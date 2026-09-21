"use client";

import { DEFAULT_DAILY_GOALS } from "@/constants/learn";
import { STORAGE_KEYS } from "@/constants/storage";
import { createAppStore } from "@/store";
import type {
  LearnBookmark,
  LearnDailyGoal,
  LearnHighlight,
  LearnNote,
  LearnUserState,
  WatchProgress,
} from "@/types/learn";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function cloneDailyGoals(): LearnDailyGoal[] {
  return DEFAULT_DAILY_GOALS.map((goal) => ({ ...goal }));
}

const DEFAULT_STATE: LearnUserState = {
  favorites: ["atom-basics", "algo-loops"],
  history: ["atom-basics", "math-vectors"],
  progress: [
    {
      animationId: "atom-basics",
      positionSec: 28,
      percent: 30,
      completed: false,
      lastWatchedAt: new Date(Date.now() - 7200000).toISOString(),
      chapterId: "ab-2",
    },
  ],
  notes: [],
  bookmarks: [],
  highlights: [],
  completedQuizzes: [],
  dailyGoals: cloneDailyGoals(),
  streakDays: 3,
  lastActiveDate: todayKey(),
};

function loadState(): LearnUserState {
  const stored = getJsonStorageItem<LearnUserState>(STORAGE_KEYS.learnData);
  if (stored && Array.isArray(stored.favorites)) {
    return {
      ...structuredClone(DEFAULT_STATE),
      ...stored,
      highlights: stored.highlights ?? [],
      dailyGoals:
        Array.isArray(stored.dailyGoals) && stored.dailyGoals.length > 0
          ? stored.dailyGoals
          : cloneDailyGoals(),
      streakDays: stored.streakDays ?? DEFAULT_STATE.streakDays,
      lastActiveDate: stored.lastActiveDate ?? DEFAULT_STATE.lastActiveDate,
    };
  }
  return structuredClone(DEFAULT_STATE);
}

function persist(state: LearnUserState) {
  setJsonStorageItem(STORAGE_KEYS.learnData, state);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type LearnStore = LearnUserState & {
  hydrated: boolean;
  hydrate: () => void;
  toggleFavorite: (id: string) => void;
  pushHistory: (id: string) => void;
  upsertProgress: (progress: WatchProgress) => void;
  addNote: (note: Omit<LearnNote, "id" | "createdAt">) => void;
  removeNote: (id: string) => void;
  addBookmark: (bookmark: Omit<LearnBookmark, "id" | "createdAt">) => void;
  removeBookmark: (id: string) => void;
  addHighlight: (highlight: Omit<LearnHighlight, "id" | "createdAt">) => void;
  removeHighlight: (id: string) => void;
  markQuizComplete: (animationId: string) => void;
  toggleDailyGoal: (goalId: string) => void;
  completeDailyGoal: (goalId: string) => void;
  touchStreak: () => void;
};

function snapshot(get: () => LearnStore): LearnUserState {
  const state = get();
  return {
    favorites: state.favorites,
    history: state.history,
    progress: state.progress,
    notes: state.notes,
    bookmarks: state.bookmarks,
    highlights: state.highlights,
    completedQuizzes: state.completedQuizzes,
    dailyGoals: state.dailyGoals,
    streakDays: state.streakDays,
    lastActiveDate: state.lastActiveDate,
  };
}

function withStreak(state: LearnUserState): Pick<
  LearnUserState,
  "streakDays" | "lastActiveDate"
> {
  const today = todayKey();
  if (state.lastActiveDate === today) {
    return {
      streakDays: state.streakDays,
      lastActiveDate: state.lastActiveDate,
    };
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  const streakDays =
    state.lastActiveDate === yKey ? state.streakDays + 1 : 1;
  return { streakDays, lastActiveDate: today };
}

export const useLearnStore = createAppStore<LearnStore>((set, get) => ({
  ...DEFAULT_STATE,
  hydrated: false,

  hydrate: () => {
    set({ ...loadState(), hydrated: true });
  },

  toggleFavorite: (id) => {
    set((state) => {
      const favorites = state.favorites.includes(id)
        ? state.favorites.filter((item) => item !== id)
        : [id, ...state.favorites];
      const next = { ...snapshot(get), favorites };
      persist(next);
      return { favorites };
    });
  },

  pushHistory: (id) => {
    set((state) => {
      const history = [id, ...state.history.filter((item) => item !== id)].slice(
        0,
        24,
      );
      const streak = withStreak(snapshot(get));
      const next = { ...snapshot(get), history, ...streak };
      persist(next);
      return { history, ...streak };
    });
  },

  upsertProgress: (progress) => {
    set((state) => {
      const without = state.progress.filter(
        (item) => item.animationId !== progress.animationId,
      );
      const nextProgress = [progress, ...without];
      const streak = withStreak(snapshot(get));
      const next = { ...snapshot(get), progress: nextProgress, ...streak };
      persist(next);
      return { progress: nextProgress, ...streak };
    });
  },

  addNote: (note) => {
    set((state) => {
      const entry: LearnNote = {
        ...note,
        id: createId("note"),
        createdAt: new Date().toISOString(),
      };
      const notes = [entry, ...state.notes].slice(0, 80);
      const dailyGoals = state.dailyGoals.map((goal) =>
        goal.id === "goal-notes" && notes.length >= 2
          ? { ...goal, completed: true }
          : goal,
      );
      const next = { ...snapshot(get), notes, dailyGoals };
      persist(next);
      return { notes, dailyGoals };
    });
  },

  removeNote: (id) => {
    set((state) => {
      const notes = state.notes.filter((item) => item.id !== id);
      const next = { ...snapshot(get), notes };
      persist(next);
      return { notes };
    });
  },

  addBookmark: (bookmark) => {
    set((state) => {
      const entry: LearnBookmark = {
        ...bookmark,
        id: createId("bm"),
        createdAt: new Date().toISOString(),
      };
      const bookmarks = [entry, ...state.bookmarks].slice(0, 80);
      const next = { ...snapshot(get), bookmarks };
      persist(next);
      return { bookmarks };
    });
  },

  removeBookmark: (id) => {
    set((state) => {
      const bookmarks = state.bookmarks.filter((item) => item.id !== id);
      const next = { ...snapshot(get), bookmarks };
      persist(next);
      return { bookmarks };
    });
  },

  addHighlight: (highlight) => {
    set((state) => {
      const entry: LearnHighlight = {
        ...highlight,
        id: createId("hl"),
        createdAt: new Date().toISOString(),
      };
      const highlights = [entry, ...state.highlights].slice(0, 80);
      const next = { ...snapshot(get), highlights };
      persist(next);
      return { highlights };
    });
  },

  removeHighlight: (id) => {
    set((state) => {
      const highlights = state.highlights.filter((item) => item.id !== id);
      const next = { ...snapshot(get), highlights };
      persist(next);
      return { highlights };
    });
  },

  markQuizComplete: (animationId) => {
    set((state) => {
      if (state.completedQuizzes.includes(animationId)) return {};
      const completedQuizzes = [animationId, ...state.completedQuizzes];
      const dailyGoals = state.dailyGoals.map((goal) =>
        goal.id === "goal-quiz" ? { ...goal, completed: true } : goal,
      );
      const next = { ...snapshot(get), completedQuizzes, dailyGoals };
      persist(next);
      return { completedQuizzes, dailyGoals };
    });
  },

  toggleDailyGoal: (goalId) => {
    set((state) => {
      const dailyGoals = state.dailyGoals.map((goal) =>
        goal.id === goalId ? { ...goal, completed: !goal.completed } : goal,
      );
      const next = { ...snapshot(get), dailyGoals };
      persist(next);
      return { dailyGoals };
    });
  },

  completeDailyGoal: (goalId) => {
    set((state) => {
      const dailyGoals = state.dailyGoals.map((goal) =>
        goal.id === goalId ? { ...goal, completed: true } : goal,
      );
      const next = { ...snapshot(get), dailyGoals };
      persist(next);
      return { dailyGoals };
    });
  },

  touchStreak: () => {
    set(() => {
      const streak = withStreak(snapshot(get));
      const next = { ...snapshot(get), ...streak };
      persist(next);
      return streak;
    });
  },
}));

"use client";

import { DEFAULT_COLLECTIONS } from "@/constants/knowledge";
import { STORAGE_KEYS } from "@/constants/storage";
import { createAppStore } from "@/store";
import type {
  Bookmark,
  BookNote,
  FavoriteCollection,
  Highlight,
  KnowledgeUserState,
  ReadingProgress,
} from "@/types/knowledge";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

const DEFAULT_STATE: KnowledgeUserState = {
  favorites: ["atomic-habits", "deep-work"],
  recentSearches: ["habits", "focus"],
  progress: [
    {
      bookId: "atomic-habits",
      chapterId: "ah-1",
      percent: 34,
      lastReadAt: new Date(Date.now() - 3600000).toISOString(),
      completed: false,
    },
  ],
  bookmarks: [],
  notes: [],
  highlights: [],
  history: ["atomic-habits", "deep-work"],
  collections: structuredClone(DEFAULT_COLLECTIONS),
};

function loadState(): KnowledgeUserState {
  const stored = getJsonStorageItem<KnowledgeUserState>(
    STORAGE_KEYS.knowledgeData,
  );
  if (stored && Array.isArray(stored.favorites)) {
    return {
      ...structuredClone(DEFAULT_STATE),
      ...stored,
      collections:
        Array.isArray(stored.collections) && stored.collections.length > 0
          ? stored.collections
          : structuredClone(DEFAULT_COLLECTIONS),
    };
  }
  return structuredClone(DEFAULT_STATE);
}

function persist(state: KnowledgeUserState) {
  setJsonStorageItem(STORAGE_KEYS.knowledgeData, state);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type KnowledgeStore = KnowledgeUserState & {
  hydrated: boolean;
  hydrate: () => void;
  toggleFavorite: (bookId: string) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  upsertProgress: (progress: ReadingProgress) => void;
  addBookmark: (bookmark: Omit<Bookmark, "id" | "createdAt">) => void;
  removeBookmark: (id: string) => void;
  addNote: (note: Omit<BookNote, "id" | "createdAt">) => void;
  removeNote: (id: string) => void;
  addHighlight: (highlight: Omit<Highlight, "id" | "createdAt">) => void;
  removeHighlight: (id: string) => void;
  pushHistory: (bookId: string) => void;
  toggleCollectionBook: (collectionId: string, bookId: string) => void;
};

function snapshot(get: () => KnowledgeStore): KnowledgeUserState {
  const state = get();
  return {
    favorites: state.favorites,
    recentSearches: state.recentSearches,
    progress: state.progress,
    bookmarks: state.bookmarks,
    notes: state.notes,
    highlights: state.highlights,
    history: state.history,
    collections: state.collections,
  };
}

export const useKnowledgeStore = createAppStore<KnowledgeStore>((set, get) => ({
  ...DEFAULT_STATE,
  hydrated: false,
  hydrate: () => {
    set({ ...loadState(), hydrated: true });
  },
  toggleFavorite: (bookId) => {
    set((state) => {
      const favorites = state.favorites.includes(bookId)
        ? state.favorites.filter((id) => id !== bookId)
        : [bookId, ...state.favorites];
      const next = { ...snapshot(get), favorites };
      persist(next);
      return { favorites };
    });
  },
  addRecentSearch: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    set((state) => {
      const recentSearches = [
        trimmed,
        ...state.recentSearches.filter(
          (item) => item.toLowerCase() !== trimmed.toLowerCase(),
        ),
      ].slice(0, 8);
      persist({ ...snapshot(get), recentSearches });
      return { recentSearches };
    });
  },
  clearRecentSearches: () => {
    set(() => {
      persist({ ...snapshot(get), recentSearches: [] });
      return { recentSearches: [] };
    });
  },
  upsertProgress: (progress) => {
    set((state) => {
      const exists = state.progress.some(
        (row) => row.bookId === progress.bookId,
      );
      const nextProgress = exists
        ? state.progress.map((row) =>
            row.bookId === progress.bookId ? progress : row,
          )
        : [progress, ...state.progress];
      const history = [
        progress.bookId,
        ...state.history.filter((id) => id !== progress.bookId),
      ].slice(0, 20);
      persist({ ...snapshot(get), progress: nextProgress, history });
      return { progress: nextProgress, history };
    });
  },
  addBookmark: (bookmark) => {
    set((state) => {
      const bookmarks = [
        {
          ...bookmark,
          id: createId("bm"),
          createdAt: new Date().toISOString(),
        },
        ...state.bookmarks,
      ];
      persist({ ...snapshot(get), bookmarks });
      return { bookmarks };
    });
  },
  removeBookmark: (id) => {
    set((state) => {
      const bookmarks = state.bookmarks.filter((row) => row.id !== id);
      persist({ ...snapshot(get), bookmarks });
      return { bookmarks };
    });
  },
  addNote: (note) => {
    set((state) => {
      const notes = [
        { ...note, id: createId("note"), createdAt: new Date().toISOString() },
        ...state.notes,
      ];
      persist({ ...snapshot(get), notes });
      return { notes };
    });
  },
  removeNote: (id) => {
    set((state) => {
      const notes = state.notes.filter((row) => row.id !== id);
      persist({ ...snapshot(get), notes });
      return { notes };
    });
  },
  addHighlight: (highlight) => {
    set((state) => {
      const highlights = [
        {
          ...highlight,
          id: createId("hl"),
          createdAt: new Date().toISOString(),
        },
        ...state.highlights,
      ];
      persist({ ...snapshot(get), highlights });
      return { highlights };
    });
  },
  removeHighlight: (id) => {
    set((state) => {
      const highlights = state.highlights.filter((row) => row.id !== id);
      persist({ ...snapshot(get), highlights });
      return { highlights };
    });
  },
  pushHistory: (bookId) => {
    set((state) => {
      const history = [
        bookId,
        ...state.history.filter((id) => id !== bookId),
      ].slice(0, 20);
      persist({ ...snapshot(get), history });
      return { history };
    });
  },
  toggleCollectionBook: (collectionId, bookId) => {
    set((state) => {
      const collections: FavoriteCollection[] = state.collections.map(
        (collection) => {
          if (collection.id !== collectionId) return collection;
          const has = collection.bookIds.includes(bookId);
          return {
            ...collection,
            bookIds: has
              ? collection.bookIds.filter((id) => id !== bookId)
              : [...collection.bookIds, bookId],
          };
        },
      );
      persist({ ...snapshot(get), collections });
      return { collections };
    });
  },
}));

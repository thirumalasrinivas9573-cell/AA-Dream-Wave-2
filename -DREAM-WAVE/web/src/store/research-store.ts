"use client";

import {
  DEFAULT_RESEARCH_PREFS,
  SEED_COLLECTIONS,
  SEED_DOCUMENTS,
  SEED_NOTES,
  SEED_PROJECTS,
} from "@/constants/research";
import { STORAGE_KEYS } from "@/constants/storage";
import { createAppStore } from "@/store";
import type {
  ResearchCollection,
  ResearchDocument,
  ResearchHighlight,
  ResearchNote,
  ResearchProject,
  ResearchTimelineEvent,
  ResearchUserState,
  ResearchWorkspacePrefs,
} from "@/types/research";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

const DEFAULT_STATE: ResearchUserState = {
  projects: SEED_PROJECTS,
  notes: SEED_NOTES,
  collections: SEED_COLLECTIONS,
  documents: SEED_DOCUMENTS,
  prefs: DEFAULT_RESEARCH_PREFS,
};

function loadState(): ResearchUserState {
  const stored = getJsonStorageItem<Partial<ResearchUserState>>(
    STORAGE_KEYS.researchData,
  );
  if (stored && Array.isArray(stored.projects)) {
    return {
      projects: stored.projects,
      notes: stored.notes ?? [],
      collections: stored.collections ?? [],
      documents: stored.documents ?? [],
      prefs: { ...DEFAULT_RESEARCH_PREFS, ...(stored.prefs ?? {}) },
    };
  }
  return structuredClone(DEFAULT_STATE);
}

function persist(state: ResearchUserState) {
  setJsonStorageItem(STORAGE_KEYS.researchData, state);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function snapshot(get: () => ResearchStore): ResearchUserState {
  const state = get();
  return {
    projects: state.projects,
    notes: state.notes,
    collections: state.collections,
    documents: state.documents,
    prefs: state.prefs,
  };
}

type ResearchStore = ResearchUserState & {
  hydrated: boolean;
  hydrate: () => void;
  createProject: (input: {
    title: string;
    topic: string;
    category?: string;
  }) => string;
  updateProject: (
    id: string,
    patch: Partial<
      Pick<
        ResearchProject,
        | "title"
        | "topic"
        | "summary"
        | "content"
        | "tags"
        | "category"
        | "collectionId"
        | "status"
        | "progress"
        | "documentId"
      >
    >,
  ) => void;
  addTimelineEvent: (
    projectId: string,
    event: Omit<ResearchTimelineEvent, "id" | "at"> & { at?: string },
  ) => void;
  upsertNote: (
    note: Omit<ResearchNote, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ) => void;
  removeNote: (id: string) => void;
  upsertCollection: (
    collection: Omit<ResearchCollection, "id"> & { id?: string },
  ) => void;
  updatePrefs: (patch: Partial<ResearchWorkspacePrefs>) => void;
  addHighlight: (
    documentId: string,
    highlight: Omit<ResearchHighlight, "id" | "createdAt">,
  ) => void;
  addBookmark: (
    documentId: string,
    label: string,
    page: number,
  ) => void;
  getProject: (id: string) => ResearchProject | undefined;
  getDocument: (id: string) => ResearchDocument | undefined;
};

export const useResearchStore = createAppStore<ResearchStore>((set, get) => ({
  ...DEFAULT_STATE,
  hydrated: false,

  hydrate: () => {
    const loaded = loadState();
    set({ ...loaded, hydrated: true });
  },

  getProject: (id) => get().projects.find((item) => item.id === id),

  getDocument: (id) => get().documents.find((item) => item.id === id),

  createProject: ({ title, topic, category }) => {
    const id = createId("proj");
    const stamp = new Date().toISOString();
    const project: ResearchProject = {
      id,
      title: title.trim() || "Untitled research",
      topic: topic.trim() || "General inquiry",
      status: "active",
      summary: "",
      content: `# ${title.trim() || "Untitled research"}\n\n## Research question\n\n## Notes\n\n`,
      tags: [],
      category: category || "General",
      collectionId: null,
      progress: 5,
      documentId: null,
      timeline: [
        {
          id: createId("tl"),
          label: "Project created",
          at: stamp,
          kind: "created",
        },
      ],
      createdAt: stamp,
      updatedAt: stamp,
    };
    set((state) => {
      const projects = [project, ...state.projects];
      const next = { ...snapshot(get), projects };
      persist(next);
      return { projects };
    });
    return id;
  },

  updateProject: (id, patch) => {
    set((state) => {
      const projects = state.projects.map((project) => {
        if (project.id !== id) return project;
        return {
          ...project,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
      });
      const next = { ...snapshot(get), projects };
      persist(next);
      return { projects };
    });
  },

  addTimelineEvent: (projectId, event) => {
    set((state) => {
      const projects = state.projects.map((project) => {
        if (project.id !== projectId) return project;
        const entry: ResearchTimelineEvent = {
          id: createId("tl"),
          label: event.label,
          kind: event.kind,
          at: event.at || new Date().toISOString(),
        };
        return {
          ...project,
          timeline: [entry, ...project.timeline].slice(0, 40),
          updatedAt: new Date().toISOString(),
        };
      });
      const next = { ...snapshot(get), projects };
      persist(next);
      return { projects };
    });
  },

  upsertNote: (note) => {
    set((state) => {
      const stamp = new Date().toISOString();
      let notes: ResearchNote[];
      if (note.id) {
        notes = state.notes.map((item) =>
          item.id === note.id
            ? {
                ...item,
                title: note.title,
                body: note.body,
                tags: note.tags,
                category: note.category,
                collectionId: note.collectionId,
                updatedAt: stamp,
              }
            : item,
        );
      } else {
        notes = [
          {
            id: createId("note"),
            title: note.title,
            body: note.body,
            tags: note.tags,
            category: note.category,
            collectionId: note.collectionId,
            createdAt: stamp,
            updatedAt: stamp,
          },
          ...state.notes,
        ];
      }
      const next = { ...snapshot(get), notes };
      persist(next);
      return { notes };
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

  upsertCollection: (collection) => {
    set((state) => {
      let collections: ResearchCollection[];
      if (collection.id) {
        collections = state.collections.map((item) =>
          item.id === collection.id
            ? {
                ...item,
                name: collection.name,
                description: collection.description,
                color: collection.color,
              }
            : item,
        );
      } else {
        collections = [
          {
            id: createId("col"),
            name: collection.name,
            description: collection.description,
            color: collection.color,
          },
          ...state.collections,
        ];
      }
      const next = { ...snapshot(get), collections };
      persist(next);
      return { collections };
    });
  },

  updatePrefs: (patch) => {
    set((state) => {
      const prefs = { ...state.prefs, ...patch };
      const next = { ...snapshot(get), prefs };
      persist(next);
      return { prefs };
    });
  },

  addHighlight: (documentId, highlight) => {
    set((state) => {
      const documents = state.documents.map((doc) => {
        if (doc.id !== documentId) return doc;
        return {
          ...doc,
          highlights: [
            {
              id: createId("hl"),
              text: highlight.text,
              ...(highlight.note ? { note: highlight.note } : {}),
              createdAt: new Date().toISOString(),
            },
            ...doc.highlights,
          ],
        };
      });
      const next = { ...snapshot(get), documents };
      persist(next);
      return { documents };
    });
  },

  addBookmark: (documentId, label, page) => {
    set((state) => {
      const documents = state.documents.map((doc) => {
        if (doc.id !== documentId) return doc;
        return {
          ...doc,
          bookmarks: [
            {
              id: createId("bm"),
              label,
              page,
              createdAt: new Date().toISOString(),
            },
            ...doc.bookmarks,
          ],
        };
      });
      const next = { ...snapshot(get), documents };
      persist(next);
      return { documents };
    });
  },
}));

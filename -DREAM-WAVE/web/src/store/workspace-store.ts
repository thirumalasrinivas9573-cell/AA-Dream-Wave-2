"use client";

import { STORAGE_KEYS } from "@/constants/storage";
import { SEED_WORKSPACE } from "@/constants/workspace";
import { createAppStore } from "@/store";
import type {
  FocusSession,
  WorkspaceCalendarEvent,
  WorkspaceGoal,
  WorkspaceNote,
  WorkspaceTask,
  WorkspaceTaskStatus,
  WorkspaceUserState,
} from "@/types/workspace";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function loadState(): WorkspaceUserState {
  const stored = getJsonStorageItem<WorkspaceUserState>(
    STORAGE_KEYS.workspaceData,
  );
  if (stored && Array.isArray(stored.tasks)) {
    return {
      ...structuredClone(SEED_WORKSPACE),
      ...stored,
      tasks: stored.tasks ?? SEED_WORKSPACE.tasks,
      goals: stored.goals ?? SEED_WORKSPACE.goals,
      notes: stored.notes ?? SEED_WORKSPACE.notes,
      events: stored.events ?? SEED_WORKSPACE.events,
      sessions: stored.sessions ?? SEED_WORKSPACE.sessions,
      dailyInsights: stored.dailyInsights ?? SEED_WORKSPACE.dailyInsights,
      weeklyInsights: stored.weeklyInsights ?? SEED_WORKSPACE.weeklyInsights,
    };
  }
  return structuredClone(SEED_WORKSPACE);
}

function persist(state: WorkspaceUserState) {
  setJsonStorageItem(STORAGE_KEYS.workspaceData, state);
}

function scoreFromState(state: WorkspaceUserState) {
  const done = state.tasks.filter((t) => t.status === "done").length;
  const total = Math.max(1, state.tasks.length);
  const goalAvg =
    state.goals.reduce((sum, g) => sum + g.progress, 0) /
    Math.max(1, state.goals.length);
  const focusBoost = Math.min(20, state.focusMinutesToday / 2);
  return Math.min(
    100,
    Math.round((done / total) * 40 + goalAvg * 0.4 + focusBoost),
  );
}

type WorkspaceStore = WorkspaceUserState & {
  hydrated: boolean;
  hydrate: () => void;
  addTask: (task: Omit<WorkspaceTask, "id" | "createdAt">) => void;
  updateTaskStatus: (id: string, status: WorkspaceTaskStatus) => void;
  updateTask: (id: string, patch: Partial<WorkspaceTask>) => void;
  removeTask: (id: string) => void;
  addGoal: (goal: Omit<WorkspaceGoal, "id">) => void;
  updateGoalProgress: (id: string, progress: number) => void;
  removeGoal: (id: string) => void;
  addNote: (note: Omit<WorkspaceNote, "id" | "updatedAt">) => void;
  updateNote: (id: string, patch: Partial<WorkspaceNote>) => void;
  removeNote: (id: string) => void;
  addEvent: (event: Omit<WorkspaceCalendarEvent, "id">) => void;
  removeEvent: (id: string) => void;
  completeFocusSession: (session: Omit<FocusSession, "id" | "completedAt">) => void;
  setPomodoroLengths: (focus: number, brk: number) => void;
};

function snapshot(get: () => WorkspaceStore): WorkspaceUserState {
  const s = get();
  return {
    tasks: s.tasks,
    goals: s.goals,
    notes: s.notes,
    events: s.events,
    sessions: s.sessions,
    focusMinutesToday: s.focusMinutesToday,
    productivityScore: s.productivityScore,
    dailyInsights: s.dailyInsights,
    weeklyInsights: s.weeklyInsights,
    pomodoroLength: s.pomodoroLength,
    breakLength: s.breakLength,
  };
}

export const useWorkspaceStore = createAppStore<WorkspaceStore>((set, get) => ({
  ...SEED_WORKSPACE,
  hydrated: false,

  hydrate: () => {
    set({ ...loadState(), hydrated: true });
  },

  addTask: (task) => {
    set(() => {
      const entry: WorkspaceTask = {
        ...task,
        id: createId("wt"),
        createdAt: new Date().toISOString(),
      };
      const tasks = [entry, ...snapshot(get).tasks];
      const next = {
        ...snapshot(get),
        tasks,
        productivityScore: scoreFromState({ ...snapshot(get), tasks }),
      };
      persist(next);
      return { tasks, productivityScore: next.productivityScore };
    });
  },

  updateTaskStatus: (id, status) => {
    set((state) => {
      const tasks = state.tasks.map((task) =>
        task.id === id ? { ...task, status } : task,
      );
      const next = {
        ...snapshot(get),
        tasks,
        productivityScore: scoreFromState({ ...snapshot(get), tasks }),
      };
      persist(next);
      return { tasks, productivityScore: next.productivityScore };
    });
  },

  updateTask: (id, patch) => {
    set((state) => {
      const tasks = state.tasks.map((task) =>
        task.id === id ? { ...task, ...patch } : task,
      );
      const next = { ...snapshot(get), tasks };
      persist(next);
      return { tasks };
    });
  },

  removeTask: (id) => {
    set((state) => {
      const tasks = state.tasks.filter((task) => task.id !== id);
      const next = {
        ...snapshot(get),
        tasks,
        productivityScore: scoreFromState({ ...snapshot(get), tasks }),
      };
      persist(next);
      return { tasks, productivityScore: next.productivityScore };
    });
  },

  addGoal: (goal) => {
    set(() => {
      const goals = [{ ...goal, id: createId("wg") }, ...snapshot(get).goals];
      const next = { ...snapshot(get), goals };
      persist(next);
      return { goals };
    });
  },

  updateGoalProgress: (id, progress) => {
    set((state) => {
      const goals = state.goals.map((goal) =>
        goal.id === id
          ? { ...goal, progress: Math.max(0, Math.min(100, progress)) }
          : goal,
      );
      const next = {
        ...snapshot(get),
        goals,
        productivityScore: scoreFromState({ ...snapshot(get), goals }),
      };
      persist(next);
      return { goals, productivityScore: next.productivityScore };
    });
  },

  removeGoal: (id) => {
    set((state) => {
      const goals = state.goals.filter((goal) => goal.id !== id);
      const next = { ...snapshot(get), goals };
      persist(next);
      return { goals };
    });
  },

  addNote: (note) => {
    set(() => {
      const entry: WorkspaceNote = {
        ...note,
        id: createId("wn"),
        updatedAt: new Date().toISOString(),
      };
      const notes = [entry, ...snapshot(get).notes];
      const next = { ...snapshot(get), notes };
      persist(next);
      return { notes };
    });
  },

  updateNote: (id, patch) => {
    set((state) => {
      const notes = state.notes.map((note) =>
        note.id === id
          ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note,
      );
      const next = { ...snapshot(get), notes };
      persist(next);
      return { notes };
    });
  },

  removeNote: (id) => {
    set((state) => {
      const notes = state.notes.filter((note) => note.id !== id);
      const next = { ...snapshot(get), notes };
      persist(next);
      return { notes };
    });
  },

  addEvent: (event) => {
    set(() => {
      const events = [
        { ...event, id: createId("we") },
        ...snapshot(get).events,
      ];
      const next = { ...snapshot(get), events };
      persist(next);
      return { events };
    });
  },

  removeEvent: (id) => {
    set((state) => {
      const events = state.events.filter((event) => event.id !== id);
      const next = { ...snapshot(get), events };
      persist(next);
      return { events };
    });
  },

  completeFocusSession: (session) => {
    set((state) => {
      const entry: FocusSession = {
        ...session,
        id: createId("ws"),
        completedAt: new Date().toISOString(),
      };
      const sessions = [entry, ...state.sessions].slice(0, 40);
      const focusMinutesToday =
        session.mode === "focus"
          ? state.focusMinutesToday + session.minutes
          : state.focusMinutesToday;
      const nextBase = { ...snapshot(get), sessions, focusMinutesToday };
      const next = {
        ...nextBase,
        productivityScore: scoreFromState(nextBase),
      };
      persist(next);
      return {
        sessions,
        focusMinutesToday,
        productivityScore: next.productivityScore,
      };
    });
  },

  setPomodoroLengths: (focus, brk) => {
    set(() => {
      const next = {
        ...snapshot(get),
        pomodoroLength: focus,
        breakLength: brk,
      };
      persist(next);
      return { pomodoroLength: focus, breakLength: brk };
    });
  },
}));

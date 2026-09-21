"use client";

import { SEED_CAREER_INTELLIGENCE } from "@/constants/career-intelligence";
import { STORAGE_KEYS } from "@/constants/storage";
import { createAppStore } from "@/store";
import type {
  CareerGoal,
  CareerIntelligenceState,
  CareerJob,
  CareerJobStatus,
  InterviewMode,
  InterviewSession,
  ResumeVersion,
} from "@/types/career-intelligence";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

function loadState(): CareerIntelligenceState {
  const stored = getJsonStorageItem<Partial<CareerIntelligenceState>>(
    STORAGE_KEYS.careerIntelData,
  );
  if (stored && Array.isArray(stored.jobs)) {
    return {
      ...SEED_CAREER_INTELLIGENCE,
      ...stored,
      goals: stored.goals ?? SEED_CAREER_INTELLIGENCE.goals,
      milestones: stored.milestones ?? SEED_CAREER_INTELLIGENCE.milestones,
      jobs: stored.jobs,
      interviews: stored.interviews ?? [],
      resumeVersions:
        stored.resumeVersions ?? SEED_CAREER_INTELLIGENCE.resumeVersions,
      growthSeries:
        stored.growthSeries ?? SEED_CAREER_INTELLIGENCE.growthSeries,
    };
  }
  return structuredClone(SEED_CAREER_INTELLIGENCE);
}

function persist(state: CareerIntelligenceState) {
  setJsonStorageItem(STORAGE_KEYS.careerIntelData, state);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function snapshot(get: () => CareerIntelStore): CareerIntelligenceState {
  const state = get();
  return {
    readinessScore: state.readinessScore,
    interviewReadiness: state.interviewReadiness,
    placementReadiness: state.placementReadiness,
    goals: state.goals,
    milestones: state.milestones,
    jobs: state.jobs,
    interviews: state.interviews,
    resumeVersions: state.resumeVersions,
    growthSeries: state.growthSeries,
  };
}

type CareerIntelStore = CareerIntelligenceState & {
  hydrated: boolean;
  hydrate: () => void;
  toggleGoal: (id: string) => void;
  setJobStatus: (id: string, status: CareerJobStatus) => void;
  addInterviewSession: (
    input: Omit<InterviewSession, "id" | "createdAt">,
  ) => void;
  addResumeVersion: (
    input: Omit<ResumeVersion, "id" | "createdAt">,
  ) => void;
  bumpReadiness: (delta?: number) => void;
};

export const useCareerIntelStore = createAppStore<CareerIntelStore>(
  (set, get) => ({
    ...SEED_CAREER_INTELLIGENCE,
    hydrated: false,

    hydrate: () => {
      const loaded = loadState();
      set({ ...loaded, hydrated: true });
    },

    toggleGoal: (id) => {
      set((state) => {
        const goals: CareerGoal[] = state.goals.map((goal) =>
          goal.id === id ? { ...goal, done: !goal.done } : goal,
        );
        const doneRatio =
          goals.filter((goal) => goal.done).length / Math.max(1, goals.length);
        const readinessScore = Math.min(
          100,
          Math.round(state.readinessScore * 0.85 + doneRatio * 100 * 0.15),
        );
        const next = { ...snapshot(get), goals, readinessScore };
        persist(next);
        return { goals, readinessScore };
      });
    },

    setJobStatus: (id, status) => {
      set((state) => {
        const jobs: CareerJob[] = state.jobs.map((job) =>
          job.id === id ? { ...job, status } : job,
        );
        const applied = jobs.filter((job) => job.status === "applied").length;
        const placementReadiness = Math.min(
          100,
          Math.round(state.placementReadiness * 0.8 + applied * 8),
        );
        const next = { ...snapshot(get), jobs, placementReadiness };
        persist(next);
        return { jobs, placementReadiness };
      });
    },

    addInterviewSession: (input) => {
      set((state) => {
        const session: InterviewSession = {
          id: createId("iv"),
          ...input,
          createdAt: new Date().toISOString(),
        };
        const interviews = [session, ...state.interviews].slice(0, 30);
        const avg =
          interviews.reduce((sum, item) => sum + item.score, 0) /
          Math.max(1, interviews.length);
        const interviewReadiness = Math.round(avg);
        const next = { ...snapshot(get), interviews, interviewReadiness };
        persist(next);
        return { interviews, interviewReadiness };
      });
    },

    addResumeVersion: (input) => {
      set((state) => {
        const version: ResumeVersion = {
          id: createId("rv"),
          ...input,
          createdAt: new Date().toISOString(),
        };
        const resumeVersions = [version, ...state.resumeVersions].slice(0, 12);
        const next = { ...snapshot(get), resumeVersions };
        persist(next);
        return { resumeVersions };
      });
    },

    bumpReadiness: (delta = 2) => {
      set((state) => {
        const readinessScore = Math.min(100, state.readinessScore + delta);
        const growthSeries = [...state.growthSeries.slice(-6), readinessScore];
        const next = { ...snapshot(get), readinessScore, growthSeries };
        persist(next);
        return { readinessScore, growthSeries };
      });
    },
  }),
);

export type { InterviewMode };

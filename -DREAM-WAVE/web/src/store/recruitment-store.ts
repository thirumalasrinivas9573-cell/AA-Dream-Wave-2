"use client";

import { create } from "zustand";

import { recruitmentApi } from "@/lib/api/recruitment";
import type {
  ApplicationDetail,
  AtsStats,
  RecruitmentApplication,
  RecruitmentFunnel,
  RecruitmentJob,
} from "@/types/recruitment";

type RecruitmentState = {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  stats: AtsStats | null;
  funnel: RecruitmentFunnel | null;
  applications: RecruitmentApplication[];
  pagination: { page: number; pageCount: number; total: number };
  jobs: RecruitmentJob[];
  currentDetail: ApplicationDetail | null;
  stages: string[];
  tags: string[];
  fetchOverview: (token: string) => Promise<void>;
  fetchApplications: (
    token: string,
    filters?: Record<string, string | number | undefined>,
  ) => Promise<void>;
  fetchApplication: (token: string, id: string) => Promise<void>;
  transitionStage: (
    token: string,
    id: string,
    stage: string,
    extra?: Record<string, unknown>,
  ) => Promise<boolean>;
  addNote: (token: string, id: string, content: string) => Promise<void>;
  updateTags: (token: string, id: string, tags: string[]) => Promise<void>;
  bulkTransition: (token: string, ids: string[], stage: string) => Promise<void>;
  clearDetail: () => void;
};

export const useRecruitmentStore = create<RecruitmentState>((set, get) => ({
  hydrated: false,
  loading: false,
  error: null,
  stats: null,
  funnel: null,
  applications: [],
  pagination: { page: 1, pageCount: 1, total: 0 },
  jobs: [],
  currentDetail: null,
  stages: [],
  tags: [],

  fetchOverview: async (token) => {
    set({ loading: true, error: null });
    try {
      const [meta, statsRes, funnelRes, jobsRes] = await Promise.all([
        recruitmentApi.getMeta(token),
        recruitmentApi.getStats(token),
        recruitmentApi.getFunnel(token),
        recruitmentApi.listJobs(token),
      ]);
      set({
        stages: meta.stages,
        tags: meta.tags,
        stats: statsRes.stats,
        funnel: funnelRes.funnel,
        jobs: jobsRes.jobs,
        hydrated: true,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load ATS",
        hydrated: true,
      });
    }
  },

  fetchApplications: async (token, filters) => {
    set({ loading: true, error: null });
    try {
      const res = await recruitmentApi.listApplications(token, filters);
      set({
        applications: res.applications,
        pagination: res.pagination,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load applications",
      });
    }
  },

  fetchApplication: async (token, id) => {
    set({ loading: true, error: null });
    try {
      const metaPromise =
        get().tags.length === 0
          ? recruitmentApi.getMeta(token).then((m) => ({ tags: m.tags, stages: m.stages }))
          : Promise.resolve(null);
      const [res, meta] = await Promise.all([
        recruitmentApi.getApplication(token, id),
        metaPromise,
      ]);
      set({
        currentDetail: {
          application: res.application,
          notes: res.notes,
          activity: res.activity,
          assessments: res.assessments,
          interviews: res.interviews,
          offer: res.offer,
        },
        ...(meta ? { tags: meta.tags, stages: meta.stages } : {}),
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Application unavailable",
        currentDetail: null,
      });
    }
  },

  transitionStage: async (token, id, stage, extra) => {
    set({ loading: true, error: null });
    try {
      await recruitmentApi.transitionStage(token, id, stage, extra);
      await get().fetchApplication(token, id);
      set({ loading: false });
      return true;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Invalid transition",
      });
      return false;
    }
  },

  addNote: async (token, id, content) => {
    await recruitmentApi.addNote(token, id, content);
    await get().fetchApplication(token, id);
  },

  updateTags: async (token, id, tags) => {
    await recruitmentApi.updateTags(token, id, tags);
    await get().fetchApplication(token, id);
  },

  bulkTransition: async (token, ids, stage) => {
    await recruitmentApi.bulkTransition(token, ids, stage);
    await get().fetchApplications(token);
  },

  clearDetail: () => set({ currentDetail: null, error: null }),
}));

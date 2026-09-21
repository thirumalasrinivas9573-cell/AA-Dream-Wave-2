"use client";

import { create } from "zustand";

import { institutionResearchApi } from "@/lib/api/institution-research";
import type {
  InnovationIdea,
  ResearchOpportunity,
  ResearchOpportunityApplication,
  ResearchProject,
  ResearchPublication,
  ResearchStats,
  ResearchWorkspace,
} from "@/types/research-management";

type ResearchState = {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  stats: ResearchStats | null;
  workspace: ResearchWorkspace | null;
  projects: ResearchProject[];
  publications: ResearchPublication[];
  opportunities: ResearchOpportunity[];
  applications: ResearchOpportunityApplication[];
  ideas: InnovationIdea[];
  fetchWorkspace: (token: string) => Promise<void>;
  fetchProjects: (token: string, params?: Record<string, string | undefined>) => Promise<void>;
  fetchOpportunities: (token: string, params?: Record<string, string | undefined>) => Promise<void>;
  fetchApplications: (token: string, params?: Record<string, string | undefined>) => Promise<void>;
  fetchIdeas: (token: string, params?: Record<string, string | undefined>) => Promise<void>;
  fetchPublications: (token: string) => Promise<void>;
};

export const useResearchManagementStore = create<ResearchState>((set) => ({
  hydrated: false,
  loading: false,
  error: null,
  stats: null,
  workspace: null,
  projects: [],
  publications: [],
  opportunities: [],
  applications: [],
  ideas: [],

  fetchWorkspace: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await institutionResearchApi.getWorkspace(token);
      set({
        workspace: res.workspace,
        stats: res.workspace.stats,
        projects: res.workspace.recentProjects.map((p) => ({ ...p, _id: p._id, title: p.title, status: p.status })),
        hydrated: true,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load research workspace",
        hydrated: true,
      });
    }
  },

  fetchProjects: async (token, params) => {
    set({ loading: true, error: null });
    try {
      const res = await institutionResearchApi.listProjects(token, params);
      set({ projects: res.projects, loading: false, hydrated: true });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Failed to load projects" });
    }
  },

  fetchOpportunities: async (token, params) => {
    set({ loading: true, error: null });
    try {
      const res = await institutionResearchApi.listOpportunities(token, params);
      set({ opportunities: res.opportunities, loading: false, hydrated: true });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Failed to load opportunities" });
    }
  },

  fetchApplications: async (token, params) => {
    set({ loading: true, error: null });
    try {
      const res = await institutionResearchApi.listApplications(token, params);
      set({ applications: res.applications, loading: false, hydrated: true });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Failed to load applications" });
    }
  },

  fetchIdeas: async (token, params) => {
    set({ loading: true, error: null });
    try {
      const res = await institutionResearchApi.listIdeas(token, params);
      set({ ideas: res.ideas, loading: false, hydrated: true });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Failed to load ideas" });
    }
  },

  fetchPublications: async (token) => {
    try {
      const res = await institutionResearchApi.listPublications(token);
      set({ publications: res.publications, hydrated: true });
    } catch {
      /* non-critical */
    }
  },
}));

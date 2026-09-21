"use client";

import { create } from "zustand";

import { institutionProgramsApi } from "@/lib/api/institution-programs";
import type {
  CreateProgramPayload,
  InstitutionProgram,
  ProgramDashboard,
  ProgramStatus,
} from "@/types/institution-program";

type ProgramState = {
  loading: boolean;
  error: string | null;
  programs: InstitutionProgram[];
  currentProgram: InstitutionProgram | null;
  dashboard: ProgramDashboard | null;
  pagination: { page: number; pageCount: number; total: number };
  fetchPrograms: (
    token: string,
    portal?: "institution" | "company",
    filters?: Record<string, string | undefined>,
  ) => Promise<void>;
  fetchProgram: (token: string, id: string, portal?: "institution" | "company") => Promise<void>;
  createProgram: (
    token: string,
    payload: CreateProgramPayload,
    portal?: "institution" | "company",
  ) => Promise<InstitutionProgram | null>;
  updateStatus: (
    token: string,
    id: string,
    status: ProgramStatus,
    portal?: "institution" | "company",
  ) => Promise<void>;
  clearCurrent: () => void;
};

export const useInstitutionProgramStore = create<ProgramState>((set, get) => ({
  loading: false,
  error: null,
  programs: [],
  currentProgram: null,
  dashboard: null,
  pagination: { page: 1, pageCount: 1, total: 0 },

  fetchPrograms: async (token, portal = "institution", filters) => {
    set({ loading: true, error: null });
    try {
      const res = await institutionProgramsApi.list(token, portal, filters);
      set({
        programs: res.programs,
        pagination: res.pagination,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load programs",
      });
    }
  },

  fetchProgram: async (token, id, portal = "institution") => {
    set({ loading: true, error: null });
    try {
      const [programRes, dashboardRes] = await Promise.all([
        institutionProgramsApi.get(token, id, portal),
        institutionProgramsApi.getDashboard(token, id, portal),
      ]);
      set({
        currentProgram: programRes.program,
        dashboard: dashboardRes.dashboard,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Program unavailable",
        currentProgram: null,
        dashboard: null,
      });
    }
  },

  createProgram: async (token, payload, portal = "institution") => {
    set({ loading: true, error: null });
    try {
      const res = await institutionProgramsApi.create(token, payload, portal);
      await get().fetchPrograms(token, portal);
      set({ loading: false });
      return res.program;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to create program",
      });
      return null;
    }
  },

  updateStatus: async (token, id, status, portal = "institution") => {
    await institutionProgramsApi.updateStatus(token, id, status, portal);
    await get().fetchProgram(token, id, portal);
    await get().fetchPrograms(token, portal);
  },

  clearCurrent: () => set({ currentProgram: null, dashboard: null, error: null }),
}));

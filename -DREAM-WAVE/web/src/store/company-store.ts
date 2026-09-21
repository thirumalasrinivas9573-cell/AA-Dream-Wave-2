"use client";

import { STORAGE_KEYS } from "@/constants/storage";
import { createAppStore } from "@/store";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

export type CompanyJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  applicants: number;
  status: "open" | "paused" | "closed";
  openings: number;
};

export type CompanyApplication = {
  id: string;
  candidate: string;
  role: string;
  stage: "applied" | "screen" | "interview" | "offer" | "hired" | "rejected";
  score: number;
  updatedAt: string;
};

export type CompanyInterview = {
  id: string;
  candidate: string;
  role: string;
  when: string;
  mode: "onsite" | "remote";
  interviewer: string;
};

export type CompanyState = {
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  interviews: CompanyInterview[];
  pipeline: number[];
};

const SEED: CompanyState = {
  jobs: [
    {
      id: "job-1",
      title: "Frontend Engineer",
      department: "Product",
      location: "Remote",
      applicants: 48,
      status: "open",
      openings: 2,
    },
    {
      id: "job-2",
      title: "Data Analyst",
      department: "Insights",
      location: "Hyderabad",
      applicants: 31,
      status: "open",
      openings: 1,
    },
    {
      id: "job-3",
      title: "Learning Experience Designer",
      department: "People",
      location: "Bengaluru",
      applicants: 19,
      status: "paused",
      openings: 1,
    },
  ],
  applications: [
    {
      id: "app-1",
      candidate: "Aisha Khan",
      role: "Frontend Engineer",
      stage: "interview",
      score: 88,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "app-2",
      candidate: "Rohan Mehta",
      role: "Data Analyst",
      stage: "screen",
      score: 76,
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "app-3",
      candidate: "Priya Nair",
      role: "Frontend Engineer",
      stage: "offer",
      score: 92,
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "app-4",
      candidate: "Sam Patel",
      role: "Learning Experience Designer",
      stage: "applied",
      score: 71,
      updatedAt: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: "app-5",
      candidate: "Elena Cruz",
      role: "Data Analyst",
      stage: "hired",
      score: 90,
      updatedAt: new Date(Date.now() - 345600000).toISOString(),
    },
  ],
  interviews: [
    {
      id: "int-1",
      candidate: "Aisha Khan",
      role: "Frontend Engineer",
      when: new Date(Date.now() + 86400000).toISOString(),
      mode: "remote",
      interviewer: "Jordan Blake",
    },
    {
      id: "int-2",
      candidate: "Rohan Mehta",
      role: "Data Analyst",
      when: new Date(Date.now() + 172800000).toISOString(),
      mode: "onsite",
      interviewer: "Maya Chen",
    },
  ],
  pipeline: [18, 24, 16, 9, 4, 3],
};

function loadState(): CompanyState {
  const stored = getJsonStorageItem<CompanyState>(STORAGE_KEYS.companyData);
  if (stored?.jobs?.length) return stored;
  const seed = structuredClone(SEED);
  setJsonStorageItem(STORAGE_KEYS.companyData, seed);
  return seed;
}

type CompanyStore = CompanyState & {
  hydrated: boolean;
  hydrate: () => void;
};

export const useCompanyStore = createAppStore<CompanyStore>((set) => ({
  ...SEED,
  hydrated: false,
  hydrate: () => {
    const loaded = loadState();
    set({ ...loaded, hydrated: true });
  },
}));

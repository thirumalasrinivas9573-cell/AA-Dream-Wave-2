"use client";

import { EMPTY_PLACEMENT_STATE } from "@/constants/institution-empty-state";
import { PLACEMENT_SEED } from "@/constants/placement-management-seed";
import { STORAGE_KEYS } from "@/constants/storage";
import {
  institutionPlacementsApi,
  type EligibilityResult,
  type PlacementDashboardWidgets,
  type PlacementStats,
} from "@/lib/api/institution-placements";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { createAppStore } from "@/store";
import type {
  ApplicationStage,
  Internship,
  Interview,
  Job,
  Offer,
  PlacementDrive,
  PlacementState,
  Recruiter,
} from "@/types/placement-management";
import { getJsonStorageItem, setJsonStorageItem } from "@/utils/storage";

type PlacementStore = PlacementState & {
  hydrated: boolean;
  apiEnabled: boolean;
  loading: boolean;
  error: string | null;
  stats: PlacementStats | null;
  dashboard: PlacementDashboardWidgets | null;
  eligibility: EligibilityResult[];
  hydrate: () => void;
  fetchWorkspace: (token: string) => Promise<void>;
  fetchDashboard: (token: string) => Promise<void>;
  fetchEligibility: (token: string, opportunityId: string) => Promise<void>;
  transitionDrive: (driveId: string, action: string, token?: string) => Promise<void>;
  generateShortlist: (driveId: string, token?: string) => Promise<void>;
  publishShortlist: (driveId: string, token?: string) => Promise<void>;
  createInterviewApi: (body: Record<string, unknown>, token?: string) => Promise<void>;
  createOfferApi: (body: Record<string, unknown>, token?: string) => Promise<void>;
  sendNotification: (body: Record<string, unknown>, token?: string) => Promise<void>;
  upsertRecruiter: (record: Recruiter) => void;
  removeRecruiter: (id: string) => void;
  upsertDrive: (record: PlacementDrive, token?: string) => Promise<void>;
  removeDrive: (id: string) => void;
  upsertInternship: (record: Internship, token?: string) => Promise<void>;
  removeInternship: (id: string) => void;
  upsertJob: (record: Job, token?: string) => Promise<void>;
  removeJob: (id: string) => void;
  updateApplicationStage: (id: string, stage: ApplicationStage, token?: string) => Promise<void>;
  removeApplication: (id: string) => void;
  upsertInterview: (record: Interview) => void;
  removeInterview: (id: string) => void;
  upsertOffer: (record: Offer) => void;
  removeOffer: (id: string) => void;
};

function persist(state: PlacementState) {
  setJsonStorageItem(STORAGE_KEYS.institutionPlacements, state);
}

function snapshot(store: PlacementStore): PlacementState {
  return {
    recruiters: store.recruiters,
    drives: store.drives,
    internships: store.internships,
    jobs: store.jobs,
    applications: store.applications,
    interviews: store.interviews,
    offers: store.offers,
  };
}

function upsertById<T extends { id: string }>(list: T[], record: T): T[] {
  return list.some((item) => item.id === record.id)
    ? list.map((item) => (item.id === record.id ? record : item))
    : [record, ...list];
}

const STAGE_TO_API: Partial<Record<ApplicationStage, string>> = {
  "hr-round": "final_interview",
  "offer-accepted": "offer_accepted",
  "offer-declined": "offer_declined",
};

function driveToPayload(drive: PlacementDrive, recruiters: Recruiter[]) {
  const recruiter = recruiters.find((r) => r.id === drive.companyId);
  return {
    opportunityType: "campus_drive",
    title: drive.name,
    companyId: drive.companyId,
    partnershipId: (recruiter as Recruiter & { partnershipId?: string })?.partnershipId,
    location: drive.venue,
    workMode: drive.mode,
    venue: drive.venue,
    driveDate: drive.date ? new Date(drive.date).toISOString() : undefined,
    deadline: drive.registrationDeadline
      ? new Date(drive.registrationDeadline).toISOString()
      : undefined,
    requiredSkills: drive.skillsRequired,
    eligibilityRules: {
      departments: drive.eligibleDepartments,
      programs: drive.eligiblePrograms,
      minCgpa: drive.minCgpa,
      maxBacklogs: drive.maxBacklogs,
    },
    status: drive.status === "upcoming" ? "upcoming" : drive.status === "ongoing" ? "open" : drive.status,
  };
}

function internshipToPayload(internship: Internship, recruiters: Recruiter[]) {
  const recruiter = recruiters.find((r) => r.id === internship.companyId);
  return {
    opportunityType: "internship",
    title: internship.title,
    companyId: internship.companyId,
    partnershipId: (recruiter as Recruiter & { partnershipId?: string })?.partnershipId,
    description: internship.eligibility,
    location: internship.location,
    workMode: internship.workMode,
    stipend: internship.stipend,
    deadline: internship.deadline ? new Date(internship.deadline).toISOString() : undefined,
    requiredSkills: internship.requiredSkills,
    openPositions: internship.openPositions,
    status: internship.status,
  };
}

function jobToPayload(job: Job, recruiters: Recruiter[]) {
  const recruiter = recruiters.find((r) => r.id === job.companyId);
  return {
    opportunityType: "full_time",
    title: job.title,
    companyId: job.companyId,
    partnershipId: (recruiter as Recruiter & { partnershipId?: string })?.partnershipId,
    description: job.eligibility,
    location: job.location,
    salary: job.salary,
    employmentType: job.jobType,
    deadline: job.deadline ? new Date(job.deadline).toISOString() : undefined,
    selectionProcess: job.selectionProcess,
    status: job.status,
  };
}

export const usePlacementManagementStore = createAppStore<PlacementStore>(
  (set, get) => {
    const commit = (patch: Partial<PlacementState>) => {
      set(patch);
      if (!get().apiEnabled) {
        persist(snapshot({ ...get(), ...patch } as PlacementStore));
      }
    };

    return {
      ...(isInstitutionDemoDataEnabled() ? PLACEMENT_SEED : EMPTY_PLACEMENT_STATE),
      hydrated: false,
      apiEnabled: false,
      loading: false,
      error: null,
      stats: null,
      dashboard: null,
      eligibility: [],

      hydrate: () => {
        if (get().hydrated) return;
        const stored = getJsonStorageItem<PlacementState>(
          STORAGE_KEYS.institutionPlacements,
        );
        set(
          stored && Array.isArray(stored.recruiters)
            ? { ...stored, hydrated: true, apiEnabled: false }
            : {
                ...(isInstitutionDemoDataEnabled()
                  ? PLACEMENT_SEED
                  : EMPTY_PLACEMENT_STATE),
                hydrated: true,
                apiEnabled: false,
              },
        );
      },

      fetchWorkspace: async (token) => {
        set({ loading: true, error: null, apiEnabled: true });
        try {
          const res = await institutionPlacementsApi.getWorkspace(token);
          const workspace = institutionPlacementsApi.mapWorkspace(res.workspace);
          set({
            ...workspace,
            stats: res.workspace.stats,
            loading: false,
          });
          void get().fetchDashboard(token);
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load placements",
          });
        }
      },

      fetchEligibility: async (token, opportunityId) => {
        set({ loading: true, error: null });
        try {
          const res = await institutionPlacementsApi.listEligibility(token, opportunityId);
          set({ eligibility: res.eligibility, loading: false });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load eligibility",
          });
        }
      },

      fetchDashboard: async (token) => {
        try {
          const res = await institutionPlacementsApi.getDashboard(token);
          set({ dashboard: res.widgets });
        } catch {
          // non-blocking
        }
      },

      transitionDrive: async (driveId, action, token) => {
        if (!get().apiEnabled || !token) return;
        set({ loading: true, error: null });
        try {
          await institutionPlacementsApi.transitionDrive(token, driveId, action);
          await get().fetchWorkspace(token);
        } catch (e) {
          set({ loading: false, error: e instanceof Error ? e.message : "Drive action failed" });
        }
      },

      generateShortlist: async (driveId, token) => {
        if (!get().apiEnabled || !token) return;
        set({ loading: true, error: null });
        try {
          await institutionPlacementsApi.generateShortlist(token, driveId, { mode: "automatic" });
          await get().fetchWorkspace(token);
        } catch (e) {
          set({ loading: false, error: e instanceof Error ? e.message : "Shortlist generation failed" });
        }
      },

      publishShortlist: async (driveId, token) => {
        if (!get().apiEnabled || !token) return;
        set({ loading: true, error: null });
        try {
          await institutionPlacementsApi.publishShortlist(token, driveId);
          await get().fetchWorkspace(token);
        } catch (e) {
          set({ loading: false, error: e instanceof Error ? e.message : "Publish shortlist failed" });
        }
      },

      createInterviewApi: async (body, token) => {
        if (!get().apiEnabled || !token) return;
        set({ loading: true, error: null });
        try {
          await institutionPlacementsApi.createInterview(token, body);
          await get().fetchWorkspace(token);
        } catch (e) {
          set({ loading: false, error: e instanceof Error ? e.message : "Failed to schedule interview" });
        }
      },

      createOfferApi: async (body, token) => {
        if (!get().apiEnabled || !token) return;
        set({ loading: true, error: null });
        try {
          await institutionPlacementsApi.createOffer(token, body);
          await get().fetchWorkspace(token);
        } catch (e) {
          set({ loading: false, error: e instanceof Error ? e.message : "Failed to release offer" });
        }
      },

      sendNotification: async (body, token) => {
        if (!get().apiEnabled || !token) return;
        await institutionPlacementsApi.sendNotification(token, body);
      },

      upsertRecruiter: (record) =>
        commit({ recruiters: upsertById(get().recruiters, record) }),
      removeRecruiter: (id) =>
        commit({ recruiters: get().recruiters.filter((item) => item.id !== id) }),

      upsertDrive: async (record, token) => {
        if (get().apiEnabled && token) {
          set({ loading: true, error: null });
          try {
            const payload = driveToPayload(record, get().recruiters);
            if (record.id && get().drives.some((d) => d.id === record.id)) {
              await institutionPlacementsApi.updateOpportunity(token, record.id, payload);
            } else {
              await institutionPlacementsApi.createOpportunity(token, payload);
            }
            await get().fetchWorkspace(token);
          } catch (e) {
            set({
              loading: false,
              error: e instanceof Error ? e.message : "Failed to save drive",
            });
          }
          return;
        }
        commit({ drives: upsertById(get().drives, record) });
      },

      removeDrive: (id) =>
        commit({ drives: get().drives.filter((item) => item.id !== id) }),

      upsertInternship: async (record, token) => {
        if (get().apiEnabled && token) {
          set({ loading: true, error: null });
          try {
            const payload = internshipToPayload(record, get().recruiters);
            if (record.id && get().internships.some((i) => i.id === record.id)) {
              await institutionPlacementsApi.updateOpportunity(token, record.id, payload);
            } else {
              await institutionPlacementsApi.createOpportunity(token, payload);
            }
            await get().fetchWorkspace(token);
          } catch (e) {
            set({
              loading: false,
              error: e instanceof Error ? e.message : "Failed to save internship",
            });
          }
          return;
        }
        commit({ internships: upsertById(get().internships, record) });
      },

      removeInternship: (id) =>
        commit({ internships: get().internships.filter((item) => item.id !== id) }),

      upsertJob: async (record, token) => {
        if (get().apiEnabled && token) {
          set({ loading: true, error: null });
          try {
            const payload = jobToPayload(record, get().recruiters);
            if (record.id && get().jobs.some((j) => j.id === record.id)) {
              await institutionPlacementsApi.updateOpportunity(token, record.id, payload);
            } else {
              await institutionPlacementsApi.createOpportunity(token, payload);
            }
            await get().fetchWorkspace(token);
          } catch (e) {
            set({
              loading: false,
              error: e instanceof Error ? e.message : "Failed to save job",
            });
          }
          return;
        }
        commit({ jobs: upsertById(get().jobs, record) });
      },

      removeJob: (id) => commit({ jobs: get().jobs.filter((item) => item.id !== id) }),

      updateApplicationStage: async (id, stage, token) => {
        if (get().apiEnabled && token) {
          set({ loading: true, error: null });
          try {
            const apiStage = STAGE_TO_API[stage] || stage;
            await institutionPlacementsApi.reviewApplication(token, id, { stage: apiStage });
            await get().fetchWorkspace(token);
          } catch (e) {
            set({
              loading: false,
              error: e instanceof Error ? e.message : "Failed to update application",
            });
          }
          return;
        }
        commit({
          applications: get().applications.map((item) =>
            item.id === id ? { ...item, stage } : item,
          ),
        });
      },

      removeApplication: (id) =>
        commit({ applications: get().applications.filter((item) => item.id !== id) }),
      upsertInterview: (record) =>
        commit({ interviews: upsertById(get().interviews, record) }),
      removeInterview: (id) =>
        commit({ interviews: get().interviews.filter((item) => item.id !== id) }),
      upsertOffer: (record) => commit({ offers: upsertById(get().offers, record) }),
      removeOffer: (id) =>
        commit({ offers: get().offers.filter((item) => item.id !== id) }),
    };
  },
);

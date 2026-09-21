"use client";

import { create } from "zustand";

import { discoveryApi, partnershipsApi } from "@/lib/api/partnerships";
import type {
  CollaborationDashboard,
  CreatePartnershipRequestPayload,
  DiscoverableCompany,
  DiscoverableInstitution,
  Partnership,
  PartnershipActivity,
  PartnershipDocument,
  PartnershipRespondAction,
  PartnershipStats,
  PartnershipWorkspace,
  RelationshipType,
  SharingScope,
} from "@/types/partnership";

type PartnershipState = {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  partnerships: Partnership[];
  stats: PartnershipStats | null;
  relationshipTypes: RelationshipType[];
  pagination: { page: number; pageCount: number; total: number };
  discoveredCompanies: DiscoverableCompany[];
  discoveredInstitutions: DiscoverableInstitution[];
  discoveryPagination: { page: number; pageCount: number; total: number };
  currentPartnership: Partnership | null;
  workspace: PartnershipWorkspace | null;
  collaborationDashboard: CollaborationDashboard | null;
  activity: PartnershipActivity[];
  documents: PartnershipDocument[];
  fetchAll: (token: string) => Promise<void>;
  fetchStats: (token: string) => Promise<void>;
  fetchPartnerships: (
    token: string,
    filters?: Record<string, string | number | undefined>,
  ) => Promise<void>;
  fetchPartnership: (token: string, id: string) => Promise<void>;
  createRequest: (
    token: string,
    payload: CreatePartnershipRequestPayload,
  ) => Promise<Partnership | null>;
  respondToRequest: (
    token: string,
    id: string,
    action: PartnershipRespondAction,
    message?: string,
  ) => Promise<void>;
  searchCompanies: (
    token: string,
    filters?: Record<string, string | undefined>,
  ) => Promise<void>;
  searchInstitutions: (
    token: string,
    filters?: Record<string, string | undefined>,
  ) => Promise<void>;
  fetchWorkspace: (token: string, id: string) => Promise<void>;
  fetchCollaborationDashboard: (token: string) => Promise<void>;
  updateScope: (token: string, id: string, scopes: SharingScope[]) => Promise<void>;
  pausePartnership: (token: string, id: string) => Promise<void>;
  cancelPartnership: (token: string, id: string) => Promise<void>;
  fetchActivity: (token: string, id: string) => Promise<void>;
  fetchDocuments: (token: string, id: string) => Promise<void>;
  addDocument: (
    token: string,
    id: string,
    payload: { name: string; type: string; fileUrl?: string; expiryDate?: string },
  ) => Promise<void>;
  clearCurrent: () => void;
};

export const usePartnershipStore = create<PartnershipState>((set, get) => ({
  hydrated: false,
  loading: false,
  error: null,
  partnerships: [],
  stats: null,
  relationshipTypes: [],
  pagination: { page: 1, pageCount: 1, total: 0 },
  discoveredCompanies: [],
  discoveredInstitutions: [],
  discoveryPagination: { page: 1, pageCount: 1, total: 0 },
  currentPartnership: null,
  workspace: null,
  collaborationDashboard: null,
  activity: [],
  documents: [],

  fetchAll: async (token) => {
    set({ loading: true, error: null });
    try {
      const [meta, statsRes, listRes] = await Promise.all([
        partnershipsApi.getMeta(token),
        partnershipsApi.getStats(token),
        partnershipsApi.list(token),
      ]);
      set({
        relationshipTypes: meta.relationshipTypes,
        stats: statsRes.stats,
        partnerships: listRes.partnerships,
        pagination: listRes.pagination,
        hydrated: true,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load partnerships",
        hydrated: true,
      });
    }
  },

  fetchStats: async (token) => {
    try {
      const res = await partnershipsApi.getStats(token);
      set({ stats: res.stats });
    } catch {
      /* non-fatal */
    }
  },

  fetchPartnerships: async (token, filters) => {
    set({ loading: true, error: null });
    try {
      const res = await partnershipsApi.list(token, filters);
      set({
        partnerships: res.partnerships,
        pagination: res.pagination,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load partnerships",
      });
    }
  },

  fetchPartnership: async (token, id) => {
    set({ loading: true, error: null });
    try {
      const [partnershipRes, workspaceRes, activityRes, docsRes] = await Promise.all([
        partnershipsApi.get(token, id),
        partnershipsApi.getWorkspace(token, id),
        partnershipsApi.getActivity(token, id),
        partnershipsApi.listDocuments(token, id),
      ]);
      set({
        currentPartnership: partnershipRes.partnership,
        workspace: workspaceRes.workspace,
        activity: workspaceRes.workspace.recentActivity?.length
          ? workspaceRes.workspace.recentActivity
          : activityRes.activity,
        documents: docsRes.documents,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Partnership unavailable",
        currentPartnership: null,
        workspace: null,
      });
    }
  },

  fetchWorkspace: async (token, id) => {
    try {
      const res = await partnershipsApi.getWorkspace(token, id);
      set({
        workspace: res.workspace,
        activity: res.workspace.recentActivity || get().activity,
      });
    } catch {
      /* non-fatal */
    }
  },

  fetchCollaborationDashboard: async (token) => {
    try {
      const res = await partnershipsApi.getCollaborationDashboard(token);
      set({ collaborationDashboard: res.dashboard });
    } catch {
      /* non-fatal */
    }
  },

  updateScope: async (token, id, scopes) => {
    await partnershipsApi.updateScope(token, id, scopes);
    await get().fetchPartnership(token, id);
  },

  pausePartnership: async (token, id) => {
    await partnershipsApi.pause(token, id);
    await get().fetchPartnership(token, id);
    await get().fetchAll(token);
  },

  cancelPartnership: async (token, id) => {
    await partnershipsApi.cancel(token, id);
    await get().fetchPartnership(token, id);
    await get().fetchAll(token);
  },

  createRequest: async (token, payload) => {
    set({ loading: true, error: null });
    try {
      const res = await partnershipsApi.createRequest(token, payload);
      await get().fetchAll(token);
      set({ loading: false });
      return res.partnership;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to send request",
      });
      return null;
    }
  },

  respondToRequest: async (token, id, action, message) => {
    set({ loading: true, error: null });
    try {
      await partnershipsApi.respond(token, id, action, message);
      await get().fetchAll(token);
      if (get().currentPartnership?.id === id) {
        await get().fetchPartnership(token, id);
      }
      set({ loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to respond",
      });
    }
  },

  searchCompanies: async (token, filters) => {
    set({ loading: true, error: null });
    try {
      const res = await discoveryApi.searchCompanies(token, filters);
      set({
        discoveredCompanies: res.companies,
        discoveryPagination: res.pagination,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Company search failed",
        discoveredCompanies: [],
      });
    }
  },

  searchInstitutions: async (token, filters) => {
    set({ loading: true, error: null });
    try {
      const res = await discoveryApi.searchInstitutions(token, filters);
      set({
        discoveredInstitutions: res.institutions,
        discoveryPagination: res.pagination,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Institution search failed",
        discoveredInstitutions: [],
      });
    }
  },

  fetchActivity: async (token, id) => {
    try {
      const res = await partnershipsApi.getActivity(token, id);
      set({ activity: res.activity });
    } catch {
      /* non-fatal */
    }
  },

  fetchDocuments: async (token, id) => {
    try {
      const res = await partnershipsApi.listDocuments(token, id);
      set({ documents: res.documents });
    } catch {
      /* non-fatal */
    }
  },

  addDocument: async (token, id, payload) => {
    await partnershipsApi.addDocument(token, id, payload);
    await get().fetchDocuments(token, id);
    await get().fetchActivity(token, id);
  },

  clearCurrent: () =>
    set({
      currentPartnership: null,
      workspace: null,
      activity: [],
      documents: [],
      error: null,
    }),
}));

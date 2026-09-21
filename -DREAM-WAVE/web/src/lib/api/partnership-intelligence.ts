import { apiRequest } from "@/lib/api/client";

export type PartnerMatch = {
  id: string;
  name: string;
  industry?: string;
  location?: string;
  fitLevel: string;
  score?: number;
  institutionStrengths?: string[];
  companyNeeds?: string[];
  overlappingAreas?: string[];
  missingInformation?: string[];
  potentialCollaborationTypes?: string[];
  disclaimer?: string;
};

export type CollaborationHub = {
  generatedAt: string;
  dashboard: Record<string, unknown>;
  potentialPartners: PartnerMatch[];
  analytics: Record<string, unknown>;
  activityFeed: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    createdAt: string;
    partnershipId?: string;
  }>;
  alerts: Array<{ id: string; priority: string; title: string; detail: string }>;
  counts: {
    activePartnerships: number;
    potentialPartners: number;
    pendingIncoming: number;
    pendingOutgoing: number;
  };
  disclaimer?: string;
};

export type ProposalDraft = {
  state: string;
  requiresReview: boolean;
  requiresApprovalBeforeSend: boolean;
  objective: string;
  collaborationType: string;
  scope: string;
  disclaimer: string;
};

export const partnershipIntelligenceApi = {
  getHub: (token: string) =>
    apiRequest<{ success: boolean; hub: CollaborationHub }>("/partnerships/collaboration/hub", { token }),

  getMatches: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; matches: PartnerMatch[]; total: number }>(
      `/partnerships/matches${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getFeed: (token: string) =>
    apiRequest<{ success: boolean; feed: { items: CollaborationHub["activityFeed"] } }>(
      "/partnerships/collaboration/feed",
      { token },
    ),

  getAnalytics: (token: string) =>
    apiRequest<{ success: boolean; analytics: Record<string, unknown> }>("/partnerships/analytics", { token }),

  getBrief: (token: string, partnershipId: string) =>
    apiRequest<{ success: boolean; brief: Record<string, unknown> }>(
      `/partnerships/${partnershipId}/brief`,
      { token },
    ),

  buildProposalDraft: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; draft: ProposalDraft }>("/partnerships/ai/proposal-draft", {
      method: "POST",
      body,
      token,
    }),

  getHubInsight: (token: string, intent: string) =>
    apiRequest<{ success: boolean; insight: { observation: string; why?: string; nextStep?: string } }>(
      "/partnerships/ai/hub-insights",
      { method: "POST", body: { intent }, token },
    ),
};

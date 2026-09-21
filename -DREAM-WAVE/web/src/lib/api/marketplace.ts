import { apiRequest } from "@/lib/api/client";

export type MatchDetail = {
  generatedAt: string;
  opportunity: {
    id: string;
    source: string;
    title: string;
    status: string;
    requiredSkills: string[];
  };
  match: {
    category: string;
    matchLevel: string;
    reasons: Array<{ type: string; label: string }>;
    nextStep: string;
    actionable: boolean;
  };
  alignment: { explainableScore?: Record<string, unknown>; disclaimer: string };
  requirements: {
    matchedRequirements: Array<{ label: string; detail?: string }>;
    missingRequirements: Array<{ label: string; detail?: string }>;
    unknownRequirements: Array<{ label: string; detail?: string }>;
  };
  skillEvidence: {
    matched: Array<{ skill: string; evidenceLevel: string; evidence: Array<{ type: string; title?: string }> }>;
    missing: Array<{ skill: string; status: string }>;
  };
  explanation: {
    matched: string[];
    missing: string[];
    unknown: string[];
    nextStep: string;
    source: string;
  };
  fromCache?: boolean;
};

export type ApplicationReadiness = {
  state: string;
  safeToApply: boolean;
  requiresUserConfirmation: boolean;
  profileCompleteness: { level: string; score: number; missing: string[] };
  explanation: { what: string; why: string; gaps?: unknown[] };
  disclaimer?: string;
};

export const marketplaceApi = {
  browse: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; marketplace: { items: unknown[]; total: number } }>(
      `/marketplace/browse${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getFeed: (token: string) =>
    apiRequest<{ success: boolean; feed: Record<string, unknown> }>("/marketplace/feed", { token }),

  getMatchDetail: (token: string, source: string, id: string) =>
    apiRequest<{ success: boolean; detail: MatchDetail }>(`/marketplace/match/${source}/${id}`, { token }),

  getReadiness: (token: string, source: string, id: string) =>
    apiRequest<{ success: boolean; readiness: ApplicationReadiness }>(
      `/marketplace/readiness/${source}/${id}`,
      { token },
    ),

  getProfileCompleteness: (token: string) =>
    apiRequest<{ success: boolean; completeness: { level: string; score: number; missing: string[]; optional?: string[] } }>(
      "/marketplace/profile-completeness",
      { token },
    ),

  getMatchingAnalytics: (token: string) =>
    apiRequest<{ success: boolean; analytics: Record<string, unknown> }>("/marketplace/analytics", { token }),

  getAiInsight: (token: string, intent: string, body?: Record<string, unknown>) =>
    apiRequest<{ success: boolean; insight: Record<string, unknown> }>(
      "/marketplace/ai/insights",
      { method: "POST", body: { intent, ...body }, token },
    ),

  matchTalentToRole: (token: string, roleType: string, roleId: string) =>
    apiRequest<{ success: boolean; matching: { candidates: unknown[]; role: Record<string, string> } }>(
      `/marketplace/recruiter/match/${roleType}/${roleId}`,
      { token },
    ),

  getHub: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; hub: Record<string, unknown> }>(`/marketplace/hub${q ? `?${q}` : ""}`, { token });
  },

  getInstitutionMarketplace: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; hub: Record<string, unknown> }>(`/marketplace/institution${q ? `?${q}` : ""}`, { token });
  },

  getCompanyMarketplace: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; hub: Record<string, unknown> }>(`/marketplace/company${q ? `?${q}` : ""}`, { token });
  },

  compare: (token: string, items: Array<{ source: string; id: string }>) =>
    apiRequest<{ success: boolean; comparison: { comparisons: unknown[]; disclaimer: string } }>(
      "/marketplace/compare",
      { method: "POST", body: { items }, token },
    ),

  getQuality: (token: string, source: string, id: string) =>
    apiRequest<{ success: boolean; quality: { level: string; missing: string[] } }>(
      `/marketplace/quality/${source}/${id}`,
      { token },
    ),

  getIndustryInsight: (token: string, intent: string, body?: Record<string, unknown>) =>
    apiRequest<{ success: boolean; insight: Record<string, unknown> }>(
      "/marketplace/industry/ai/insights",
      { method: "POST", body: { intent, ...body }, token },
    ),
};

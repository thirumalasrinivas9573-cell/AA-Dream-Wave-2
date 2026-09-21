import { apiRequest } from "@/lib/api/client";
import type {
  EcosystemAiInsight,
  EcosystemOverview,
  EcosystemRecommendation,
  EcosystemSearchResult,
  MultiAgentEcosystemResult,
  SkillAlignment,
  StudentEcosystemSummary,
} from "@/types/ecosystem-intelligence";

const BASE = "/ecosystem/intelligence";

export const ecosystemIntelligenceApi = {
  getOverview: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; ecosystem: EcosystemOverview }>(
      `${BASE}/overview${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getSkillAlignment: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; alignment: SkillAlignment }>(
      `${BASE}/skills${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getRecommendations: (token: string) =>
    apiRequest<{ success: boolean; recommendations: EcosystemRecommendation[]; generatedAt: string }>(
      `${BASE}/recommendations`,
      { token },
    ),

  search: (token: string, q: string) =>
    apiRequest<{ success: boolean; results: EcosystemSearchResult[]; query: string }>(
      `${BASE}/search?q=${encodeURIComponent(q)}`,
      { token },
    ),

  getAiIntents: (token: string) =>
    apiRequest<{ success: boolean; intents: string[]; multiAgentIntents: string[] }>(
      `${BASE}/ai/intents`,
      { token },
    ),

  getAiInsights: (token: string, intent: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{
      success: boolean;
      intent: string;
      source: string;
      insight: EcosystemAiInsight;
    }>(`${BASE}/ai/insights${q ? `?${q}` : ""}`, {
      method: "POST",
      body: { intent },
      token,
    });
  },

  runMultiAgent: (token: string, intent: string) =>
    apiRequest<{ success: boolean } & MultiAgentEcosystemResult>(
      `${BASE}/ai/multi-agent`,
      { method: "POST", body: { intent }, token },
    ),

  getStudentSummary: (token: string) =>
    apiRequest<{ success: boolean; summary: StudentEcosystemSummary }>(
      "/student/ecosystem/summary",
      { token },
    ),

  getPrograms: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; programs: Record<string, unknown> }>(
      `${BASE}/programs${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getPartnerships: (token: string) =>
    apiRequest<{ success: boolean; partnerships: Record<string, unknown> }>(`${BASE}/partnerships`, { token }),

  getInstitutionHub: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; hub: Record<string, unknown> }>(
      `${BASE}/institution/hub${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getCompanyHub: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; hub: Record<string, unknown> }>(
      `${BASE}/company/hub${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getProgramIntelligence: (token: string, programId: string) =>
    apiRequest<{ success: boolean; intelligence: Record<string, unknown> }>(
      `${BASE}/programs/${programId}/intelligence`,
      { token },
    ),

  getDepartmentIntelligence: (token: string, departmentId: string) =>
    apiRequest<{ success: boolean; intelligence: Record<string, unknown> }>(
      `${BASE}/departments/${encodeURIComponent(departmentId)}/intelligence`,
      { token },
    ),

  getIndustryIntelligence: (token: string) =>
    apiRequest<{ success: boolean; industry: Record<string, unknown> }>(`${BASE}/industry`, { token }),

  getIndustryTrends: (token: string) =>
    apiRequest<{ success: boolean; trends: { status: string; trends: unknown[] } }>(`${BASE}/industry/trends`, { token }),

  getCompanyRecommendations: (token: string) =>
    apiRequest<{ success: boolean; recommendations: unknown[] }>(`${BASE}/company-recommendations`, { token }),

  getStudentAggregates: (token: string) =>
    apiRequest<{ success: boolean; aggregates: Record<string, unknown> }>(`${BASE}/student-aggregates`, { token }),
};

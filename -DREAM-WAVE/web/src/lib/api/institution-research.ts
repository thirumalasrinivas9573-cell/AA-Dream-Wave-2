import { apiRequest } from "@/lib/api/client";
import type {
  InnovationIdea,
  Pagination,
  ResearchOpportunity,
  ResearchOpportunityApplication,
  ResearchProject,
  ResearchPublication,
  ResearchStats,
  ResearchWorkspace,
} from "@/types/research-management";

function opts(token: string) {
  return { token };
}

function qs(params?: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "" && v !== "all") search.set(k, String(v));
    }
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export const institutionResearchApi = {
  getMeta: (token: string) =>
    apiRequest<{ success: boolean }>("/institution/research/meta", opts(token)),

  getStats: (token: string) =>
    apiRequest<{ success: boolean; stats: ResearchStats }>(
      "/institution/research/stats",
      opts(token),
    ),

  getWorkspace: (token: string) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace }>(
      "/institution/research/workspace",
      opts(token),
    ),

  listProjects: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; projects: ResearchProject[]; pagination: Pagination }>(
      `/institution/research/projects${qs(params)}`,
      opts(token),
    ),

  getProject: (token: string, id: string) =>
    apiRequest<{ success: boolean; project: ResearchProject }>(
      `/institution/research/projects/${id}`,
      opts(token),
    ),

  createProject: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; project: ResearchProject }>(
      "/institution/research/projects",
      { method: "POST", body, token },
    ),

  updateProject: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; project: ResearchProject }>(
      `/institution/research/projects/${id}`,
      { method: "PATCH", body, token },
    ),

  transitionProject: (token: string, id: string, status: string) =>
    apiRequest<{ success: boolean; project: ResearchProject }>(
      `/institution/research/projects/${id}/status`,
      { method: "POST", body: { status }, token },
    ),

  addProjectMember: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; project: ResearchProject }>(
      `/institution/research/projects/${id}/members`,
      { method: "POST", body, token },
    ),

  listPublications: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; publications: ResearchPublication[]; pagination: Pagination }>(
      `/institution/research/publications${qs(params)}`,
      opts(token),
    ),

  createPublication: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; publication: ResearchPublication }>(
      "/institution/research/publications",
      { method: "POST", body, token },
    ),

  listOpportunities: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; opportunities: ResearchOpportunity[]; pagination: Pagination }>(
      `/institution/research/opportunities${qs(params)}`,
      opts(token),
    ),

  createOpportunity: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; opportunity: ResearchOpportunity }>(
      "/institution/research/opportunities",
      { method: "POST", body, token },
    ),

  updateOpportunity: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; opportunity: ResearchOpportunity }>(
      `/institution/research/opportunities/${id}`,
      { method: "PATCH", body, token },
    ),

  transitionOpportunity: (token: string, id: string, action: string) =>
    apiRequest<{ success: boolean; opportunity: ResearchOpportunity }>(
      `/institution/research/opportunities/${id}/action`,
      { method: "POST", body: { action }, token },
    ),

  listApplications: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; applications: ResearchOpportunityApplication[]; pagination: Pagination }>(
      `/institution/research/applications${qs(params)}`,
      opts(token),
    ),

  reviewApplication: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; application: ResearchOpportunityApplication }>(
      `/institution/research/applications/${id}/review`,
      { method: "PATCH", body, token },
    ),

  listIdeas: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; ideas: InnovationIdea[]; pagination: Pagination }>(
      `/institution/research/ideas${qs(params)}`,
      opts(token),
    ),

  submitIdea: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; idea: InnovationIdea }>(
      "/institution/research/ideas",
      { method: "POST", body, token },
    ),

  reviewIdea: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; idea: InnovationIdea }>(
      `/institution/research/ideas/${id}/review`,
      { method: "PATCH", body, token },
    ),

  browseOpportunities: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; opportunities: ResearchOpportunity[]; total: number }>(
      `/institution/research/opportunities/browse${qs(params)}`,
      opts(token),
    ),

  applyToOpportunity: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; application: ResearchOpportunityApplication }>(
      `/institution/research/opportunities/${id}/apply`,
      { method: "POST", body, token },
    ),

  submitIdeaAsUser: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; idea: InnovationIdea }>(
      "/institution/research/ideas/submit",
      { method: "POST", body, token },
    ),

  getAnalytics: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; analytics: import("@/types/research-management").InnovationAnalytics }>(
      `/institution/research/analytics${qs(params)}`,
      opts(token),
    ),

  getReportTypes: (token: string) =>
    apiRequest<{ success: boolean; reportTypes: string[] }>(
      "/institution/research/reports/types",
      opts(token),
    ),

  previewReport: (
    token: string,
    type: string,
    params?: Record<string, string | number | undefined>,
  ) =>
    apiRequest<{ success: boolean; report: import("@/types/research-management").InnovationReportPreview }>(
      `/institution/research/reports/${type}${qs(params)}`,
      opts(token),
    ),

  exportReport: (
    token: string,
    type: string,
    format: "csv" | "xlsx" | "pdf" = "csv",
    params?: Record<string, string | undefined>,
  ) => {
    const search = new URLSearchParams({ format });
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) search.set(k, v);
      }
    }
    return apiRequest<{
      success: boolean;
      export: { filename: string; content: string; mimeType: string };
    }>(`/institution/research/reports/${type}/export?${search.toString()}`, opts(token));
  },
};

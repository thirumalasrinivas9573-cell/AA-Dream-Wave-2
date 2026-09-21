import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

export interface ResearchWorkspaceSource {
  sourceRefId: string;
  sourceType: string;
  canonicalSourceId?: string;
  title: string;
  author?: string;
  organization?: string;
  date?: string;
  url?: string;
  page?: number | null;
  section?: string;
  authority?: string;
  excerpt?: string;
  href?: string;
  snapshotAt?: string;
  sourceUpdated?: boolean;
}

export interface ResearchClaim {
  claimId: string;
  text: string;
  type: string;
  supportingSourceRefs: string[];
  status: string;
}

export interface ResearchEvidence {
  claimId: string;
  sourceRefId: string;
  location?: string;
  page?: number | null;
  section?: string;
  excerpt?: string;
  quote?: string;
  limitations?: string[];
}

export interface ResearchReport {
  reportId: string;
  version: number;
  template: string;
  title: string;
  status: string;
  sections: Array<{
    key: string;
    title: string;
    content: string;
    citations?: Array<{ sourceRefId: string; label: string }>;
  }>;
  references: Array<{ sourceRefId: string; citation: string }>;
  qualityIssues?: string[];
  approvedAt?: string;
}

export interface ResearchWorkspace {
  _id: string;
  title: string;
  researchQuestion: string;
  description?: string;
  subquestions?: string[];
  scope?: string;
  status: string;
  sources: ResearchWorkspaceSource[];
  evidence: ResearchEvidence[];
  claims: ResearchClaim[];
  synthesis?: {
    keyFindings: Array<{ label: string; text: string; sourceRefs?: string[] }>;
    agreements: string[];
    contradictions: Array<{ sourceA: string; sourceB: string; description: string }>;
    gaps: string[];
    limitations: string[];
    evidenceMatrix?: Array<{ claim: string; sources: Record<string, string>; status: string }>;
    updatedAt?: string;
  };
  methodology?: {
    searchScope?: string;
    sourceTypes?: string[];
    sourceCount?: number;
    filters?: Record<string, unknown>;
  };
  reports: ResearchReport[];
  notes?: Array<{ content: string; contentType: string; authorUserId: string }>;
  timeline?: Array<{ event: string; description: string; timestamp: string }>;
  plan?: Array<{ order: number; step: string; agentId: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceDashboard {
  workspaceId: string;
  title: string;
  researchQuestion: string;
  status: string;
  sourceCount: number;
  evidenceCount: number;
  claimCount: number;
  gaps: string[];
  keyFindings: Array<{ label: string; text: string }>;
  agreements: string[];
  contradictions: Array<{ sourceA: string; sourceB: string; description: string }>;
  reports: Array<{ reportId: string; version: number; status: string; title: string }>;
  timeline: Array<{ event: string; description: string; timestamp: string }>;
  plan: Array<{ order: number; step: string; agentId: string }>;
}

export const researchWorkspaceApi = {
  list: (token: string, params?: { status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return apiRequest<{ success: boolean; items: ResearchWorkspace[]; total: number }>(
      `/research/workspace${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  create: (
    token: string,
    body: {
      title?: string;
      researchQuestion: string;
      description?: string;
      subquestions?: string[];
      scope?: string;
    },
  ) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace }>(
      "/research/workspace",
      { ...opts(token), method: "POST", body },
    ),

  get: (token: string, id: string) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace }>(
      `/research/workspace/${id}`,
      opts(token),
    ),

  dashboard: (token: string, id: string) =>
    apiRequest<{ success: boolean; dashboard: WorkspaceDashboard }>(
      `/research/workspace/${id}/dashboard`,
      opts(token),
    ),

  collectSources: (token: string, id: string, query?: string, limit?: number) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace; added: string[] }>(
      `/research/workspace/${id}/sources/collect`,
      { ...opts(token), method: "POST", body: { query, limit } },
    ),

  addSource: (token: string, id: string, body: Partial<ResearchWorkspaceSource>) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace; sourceRefId: string }>(
      `/research/workspace/${id}/sources`,
      { ...opts(token), method: "POST", body },
    ),

  removeSource: (token: string, id: string, sourceRefId: string) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace }>(
      `/research/workspace/${id}/sources/${sourceRefId}`,
      { ...opts(token), method: "DELETE" },
    ),

  extractEvidence: (token: string, id: string) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace }>(
      `/research/workspace/${id}/evidence/extract`,
      { ...opts(token), method: "POST" },
    ),

  synthesize: (token: string, id: string) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace }>(
      `/research/workspace/${id}/synthesize`,
      { ...opts(token), method: "POST" },
    ),

  generateReport: (token: string, id: string, body?: { template?: string; title?: string }) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace; report: ResearchReport }>(
      `/research/workspace/${id}/reports`,
      { ...opts(token), method: "POST", body: body ?? {} },
    ),

  reviewReport: (token: string, id: string, reportId: string) =>
    apiRequest<{ success: boolean; report: ResearchReport; issues: string[] }>(
      `/research/workspace/${id}/reports/${reportId}/review`,
      { ...opts(token), method: "POST" },
    ),

  approveReport: (token: string, id: string, reportId: string) =>
    apiRequest<{ success: boolean; report: ResearchReport }>(
      `/research/workspace/${id}/reports/${reportId}/approve`,
      { ...opts(token), method: "POST" },
    ),

  chat: (token: string, id: string, question: string) =>
    apiRequest<{ success: boolean; answer: string; contentType: string }>(
      `/research/workspace/${id}/chat`,
      { ...opts(token), method: "POST", body: { question } },
    ),

  addNote: (token: string, id: string, content: string, contentType?: string) =>
    apiRequest<{ success: boolean; workspace: ResearchWorkspace }>(
      `/research/workspace/${id}/notes`,
      { ...opts(token), method: "POST", body: { content, contentType } },
    ),
};

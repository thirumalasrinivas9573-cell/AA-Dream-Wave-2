import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

export interface SearchResult {
  type: string;
  id: string;
  sourceId?: string;
  title: string;
  description?: string;
  excerpt?: string;
  href?: string;
  score?: number;
  explanation?: string;
  personalized?: boolean;
  section?: string;
  page?: number;
  searchMethod?: string;
}

export interface ResearchSession {
  _id: string;
  question: string;
  plan: Array<{ order: number; step: string; agentId: string }>;
  sources: Array<{
    sourceType: string;
    sourceId: string;
    title: string;
    excerpt: string;
    href?: string;
    section?: string;
    page?: number;
  }>;
  keyFindings: Array<{ label: string; text: string }>;
  answer: string;
  limitations: string[];
  nextActions: string[];
  status: string;
}

export const searchApi = {
  search: (token: string, params: { q: string; type?: string; limit?: number }) => {
    const qs = new URLSearchParams({ q: params.q })
    if (params.type) qs.set("type", params.type)
    if (params.limit) qs.set("limit", String(params.limit))
    return apiRequest<{
      success: boolean;
      results: SearchResult[];
      intent: string;
      zeroResults?: boolean;
      suggestions?: string[];
      ambiguous?: string[];
      recent?: string[];
    }>(`/search?${qs}`, opts(token))
  },

  suggest: (token: string, prefix = "") =>
    apiRequest<{ success: boolean; suggestions: string[] }>(
      `/search/suggest?prefix=${encodeURIComponent(prefix)}`,
      opts(token),
    ),

  research: (token: string, question: string) =>
    apiRequest<{ success: boolean; session: ResearchSession }>(
      "/search/research",
      { ...opts(token), method: "POST", body: { question } },
    ),

  getResearch: (token: string, id: string) =>
    apiRequest<{ success: boolean; session: ResearchSession }>(
      `/search/research/${id}`,
      opts(token),
    ),

  recent: (token: string) =>
    apiRequest<{ success: boolean; recent: Array<{ query: string }> }>(
      "/search/recent",
      opts(token),
    ),

  saveSearch: (token: string, query: string) =>
    apiRequest<{ success: boolean }>(
      "/search/saved",
      { ...opts(token), method: "POST", body: { query } },
    ),

  feedback: (token: string, body: { resultId: string; feedback: string; query?: string }) =>
    apiRequest<{ success: boolean }>(
      "/search/feedback",
      { ...opts(token), method: "POST", body },
    ),

  indexDocument: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; indexed: number }>(
      "/search/index",
      { ...opts(token), method: "POST", body },
    ),
}

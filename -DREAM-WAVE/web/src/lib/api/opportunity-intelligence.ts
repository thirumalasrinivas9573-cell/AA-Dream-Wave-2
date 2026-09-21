const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

async function oiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface OpportunityItem {
  opportunityId: string;
  source: string;
  type: string;
  sourceType: string;
  title: string;
  organization: string;
  location: string;
  deadline: string;
  daysRemaining: number | null;
  freshness: string;
  matchState: string;
  whyRecommended?: string;
  nextAction?: string;
  href?: string;
}

export interface IntelligenceDashboard {
  sections: {
    recommended: OpportunityItem[];
    saved: OpportunityItem[];
    preparing: Array<{ title: string; status: string }>;
    applied: Array<{ title: string; status: string }>;
  };
  skillGaps: string[];
  deadlines: OpportunityItem[];
  coachPrompt: string;
  hasInstitutionLink: boolean;
  disclaimer: string;
}

export interface OpportunityDetail {
  opportunity: OpportunityItem;
  match: {
    state: string;
    whyItMatches: string[];
    whatIsMissing: string[];
    whatIsUnknown: string[];
    skillCategories: {
      required: Array<{ skill: string; category: string }>;
      preferred: Array<{ skill: string; category: string }>;
    };
  };
  preparation: {
    projects: Array<{ title: string; relevance: string }>;
    learning: Array<{ skill: string; next: string }>;
    interview: { state: string; explanation: string };
  };
  application: {
    checklist: Array<{ item: string; status: string; required: boolean }>;
    strategy: {
      topStrengths: string[];
      topGaps: string[];
      topActions: Array<{ action: string; type: string; reason: string }>;
    };
    readinessState: string;
  };
  changes: Array<{ field: string; what: string; impact: string }>;
  disclaimer: string;
}

export const opportunityIntelligenceApi = {
  dashboard: (token: string) =>
    oiFetch<{ dashboard: IntelligenceDashboard }>(
      "/opportunities/intelligence/dashboard",
      token,
    ),

  feed: (token: string) =>
    oiFetch<{ feed: { categories: Record<string, OpportunityItem[]>; hasInstitutionLink: boolean } }>(
      "/opportunities/intelligence/feed",
      token,
    ),

  detail: (token: string, source: string, sourceId: string) =>
    oiFetch<{ detail: OpportunityDetail }>(
      `/opportunities/intelligence/detail/${source}/${sourceId}`,
      token,
    ),

  strategy: (token: string, source: string, sourceId: string) =>
    oiFetch<{ strategy: Record<string, unknown> }>(
      `/opportunities/intelligence/strategy/${source}/${sourceId}`,
      token,
    ),

  save: (token: string, source: string, sourceId: string) =>
    oiFetch<{ saved: boolean }>(
      `/opportunities/intelligence/saved/${source}/${sourceId}`,
      token,
      { method: "POST" },
    ),

  compare: (token: string, items: Array<{ source: string; id: string }>) =>
    oiFetch<{ comparisons: unknown[] }>(
      "/opportunities/intelligence/compare",
      token,
      { method: "POST", body: JSON.stringify({ items }) },
    ),

  coach: (token: string, question: string) =>
    oiFetch<{ answer: string }>(
      "/opportunities/intelligence/coach",
      token,
      { method: "POST", body: JSON.stringify({ question }) },
    ),

  coverLetter: (token: string, source: string, sourceId: string) =>
    oiFetch<{ draft: string; disclaimer: string }>(
      `/opportunities/intelligence/cover-letter/${source}/${sourceId}`,
      token,
      { method: "POST" },
    ),

  search: (token: string, q: string) =>
    oiFetch<{ results: OpportunityItem[]; total: number }>(
      `/opportunities/intelligence/search?q=${encodeURIComponent(q)}`,
      token,
    ),
};

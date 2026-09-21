import { apiRequest } from "@/lib/api/client";

export type MatchReason = {
  type: string;
  label: string;
  detail?: string;
};

export type OpportunityMatch = {
  matchLevel: "STRONG_MATCH" | "GOOD_MATCH" | "POTENTIAL_MATCH" | "NEEDS_REVIEW" | "NOT_ELIGIBLE";
  matchStatus: string;
  reasons: MatchReason[];
  missingRequirements: string[];
  deadline: string;
  daysUntilDeadline: number | null;
  nextAction: string;
  actionable: boolean;
  applicationStatus?: { stage: string; appliedAt?: string } | null;
  explainableScore?: {
    skillCoverage: number;
    eligibilityResult: string;
    softSignalCount: number;
    compositeRank: number;
    rankFormula: string;
  };
};

export type MatchedOpportunity = {
  id: string;
  source: string;
  kind: string;
  category: string;
  title: string;
  organizer: string;
  deadline?: string;
  registrationDeadline?: string;
  location?: string;
  mode?: string;
  requiredSkills: string[];
  href: string;
  isHackathon?: boolean;
  isJob?: boolean;
  isInternship?: boolean;
  isEvent?: boolean;
  match: OpportunityMatch;
};

export type OpportunityFeed = {
  hasInstitutionLink: boolean;
  contextSummary?: {
    careerGoal: string;
    skillCount: number;
    projectCount: number;
    researchTopicCount: number;
  };
  strongMatches: MatchedOpportunity[];
  closingSoon: MatchedOpportunity[];
  skillBuilding: MatchedOpportunity[];
  explore: MatchedOpportunity[];
  totals: { all: number; strong?: number; closingSoon?: number; skillBuilding?: number };
};

export type AiInsight = {
  intent: string;
  mode: string;
  insight: {
    observation: string;
    evidence: Record<string, unknown>;
    interpretation: string;
    limitation: string;
    nextAction?: string | null;
  };
  disclaimer?: string;
  aiSummary?: string;
};

export const opportunitiesApi = {
  getFeed: (token: string, params?: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) search.set(k, v);
      }
    }
    const q = search.toString();
    return apiRequest<{ success: boolean; feed: OpportunityFeed }>(
      `/student/opportunities/feed${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getMatch: (token: string, source: string, id: string) =>
    apiRequest<{ success: boolean; opportunity: MatchedOpportunity; match: OpportunityMatch }>(
      `/student/opportunities/match/${source}/${id}`,
      { token },
    ),

  prepare: (token: string, source: string, id: string) =>
    apiRequest<{ success: boolean; plan: Record<string, unknown> }>(
      `/student/opportunities/prepare/${source}/${id}`,
      { token },
    ),

  compare: (token: string, items: { source: string; id: string }[]) =>
    apiRequest<{ success: boolean; comparison: Record<string, unknown> }>(
      "/student/opportunities/compare",
      { token, method: "POST", body: { items } },
    ),

  discover: (token: string, query: string) =>
    apiRequest<{ success: boolean; query: string; detectedIntents: string[]; feed: OpportunityFeed }>(
      "/student/opportunities/discover",
      { token, method: "POST", body: { query } },
    ),

  feedback: (token: string, body: { source: string; sourceId: string; action: string }) =>
    apiRequest<{ success: boolean; recorded: boolean }>(
      "/student/opportunities/feedback",
      { token, method: "POST", body },
    ),

  getAiIntents: (token: string) =>
    apiRequest<{ success: boolean; intents: string[] }>("/student/opportunities/ai/intents", { token }),

  getAiInsights: (
    token: string,
    body: {
      intent?: string;
      source?: string;
      sourceId?: string;
      query?: string;
      compareItems?: { source: string; id: string }[];
    },
  ) =>
    apiRequest<{ success: boolean; insights: AiInsight }>(
      "/student/opportunities/ai/insights",
      { token, method: "POST", body },
    ),
};

export const MATCH_LEVEL_LABELS: Record<string, string> = {
  STRONG_MATCH: "Strong Match",
  GOOD_MATCH: "Good Match",
  POTENTIAL_MATCH: "Potential Match",
  NEEDS_REVIEW: "Needs Review",
  NOT_ELIGIBLE: "Not Eligible",
};

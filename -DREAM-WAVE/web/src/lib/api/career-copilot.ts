import { apiRequest } from "@/lib/api/client";

export type CareerHub = {
  generatedAt: string;
  careerProfile: {
    currentRole: string;
    targetRole: string;
    careerGoal: string;
    interests: string[];
    careerState: string;
    hasInstitutionLink: boolean;
  };
  currentState: {
    state: string;
    phase: string;
    readiness: { state: string; explanation: { what: string; why: string } };
    readinessLevel: string;
  };
  gapAnalysis: {
    targetCareer: string;
    strengths: Array<{ skill: string; evidenceLevel: string }>;
    gaps: Array<{ skill: string; status: string }>;
    unknown: string[];
    nextSteps: Array<{ type: string; what: string; why: string; nextStep: string; priority: string }>;
  };
  roadmap: {
    careerGoal: string;
    currentPhase: string;
    steps: Array<{ phase: string; title: string; status: string; priority: string; reason: string; order: number }>;
    stale: boolean;
  };
  weeklyPlan: {
    priorities: { high: unknown[]; medium: unknown[]; optional: unknown[] };
  };
  dailyFocus: {
    topPriority: { what: string; why: string; nextStep: string };
    second?: { what: string; why: string } | null;
    optional?: { what: string } | null;
  };
  studentSuccess: { signals: Array<{ type: string; message: string; severity: string }> };
  opportunities: { strongMatches: number; recommended: unknown[]; closingSoon: unknown[] };
  portfolio: Array<{ title: string; skills: string[]; relevance: string }>;
  recommendations: Array<{ type: string; what: string; why: string; nextStep: string; priority: string; href?: string }>;
  progress: { goals: unknown[]; applications: number; interviews: number; skillEvidence: number };
  disclaimer?: string;
};

export const careerCopilotApi = {
  getHub: (token: string) =>
    apiRequest<{ success: boolean; hub: CareerHub }>("/student/career-copilot/hub", { token }),

  getGaps: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; gaps: CareerHub["gapAnalysis"] }>(
      `/student/career-copilot/gaps${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getRoadmap: (token: string) =>
    apiRequest<{ success: boolean; roadmap: CareerHub["roadmap"] }>("/student/career-copilot/roadmap", { token }),

  getWeeklyPlan: (token: string) =>
    apiRequest<{ success: boolean; plan: CareerHub["weeklyPlan"] }>("/student/career-copilot/weekly-plan", { token }),

  getDailyFocus: (token: string) =>
    apiRequest<{ success: boolean; focus: CareerHub["dailyFocus"] }>("/student/career-copilot/daily-focus", { token }),

  getSuccess: (token: string) =>
    apiRequest<{ success: boolean; studentSuccess: CareerHub["studentSuccess"] }>(
      "/student/career-copilot/success",
      { token },
    ),

  getExplore: (token: string) =>
    apiRequest<{ success: boolean; exploration: Record<string, unknown> }>("/student/career-copilot/explore", { token }),

  suggestTasks: (token: string, body?: { stepTitle?: string }) =>
    apiRequest<{ success: boolean; suggestions: unknown[]; requiresConfirmation: boolean }>(
      "/student/career-copilot/suggest-tasks",
      { method: "POST", body: body || {}, token },
    ),

  comparePaths: (token: string, paths: string[]) =>
    apiRequest<{ success: boolean; comparison: { comparisons: unknown[]; disclaimer: string } }>(
      "/student/career-copilot/compare/paths",
      { method: "POST", body: { paths }, token },
    ),

  compareOpportunities: (token: string, items: Array<{ source: string; id: string }>) =>
    apiRequest<{ success: boolean; comparison: { comparisons: unknown[]; disclaimer: string } }>(
      "/student/career-copilot/compare/opportunities",
      { method: "POST", body: { items }, token },
    ),

  prepareApplication: (token: string, source: string, sourceId: string) =>
    apiRequest<{ success: boolean; preparation: Record<string, unknown> }>(
      `/student/career-copilot/prepare/application/${source}/${sourceId}`,
      { token },
    ),

  prepareInterview: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; preparation: Record<string, unknown> }>(
      `/student/career-copilot/prepare/interview${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getAiIntents: (token: string) =>
    apiRequest<{ success: boolean; intents: string[] }>("/student/career-copilot/ai/intents", { token }),

  getAiInsight: (token: string, intent: string, body?: Record<string, unknown>) =>
    apiRequest<{ success: boolean; observation?: string; why?: string; nextStep?: string; insight?: Record<string, unknown> }>(
      "/student/career-copilot/ai/insights",
      { method: "POST", body: { intent, ...body }, token },
    ),
};

import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

function qs(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) search.set(k, v);
    }
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export interface ExecutiveSummary {
  totalStudents?: number | null;
  activeStudents?: number | null;
  activePrograms?: number | null;
  openOpportunities?: number | null;
  activePartnerships?: number | null;
  applicationsSubmitted?: number | null;
  interviewsScheduled?: number | null;
  placements?: number | null;
  placementRate?: number | null;
}

export interface ExecutiveInsight {
  title: string;
  whatChanged: string;
  whyItMatters: string;
  dataBasis: string;
  recommendedNextStep: string;
  limitation?: string;
}

export interface AttentionItem {
  type: string;
  label: string;
  nextStep: string;
}

export interface DataQualityIssue {
  type: string;
  count?: number;
  severity?: string;
  source?: string;
  impact?: string;
  recommendedAction?: string;
}

export interface ExecutiveOverview {
  generatedAt: string;
  freshness: string;
  period: string;
  summary: ExecutiveSummary;
  keyChanges: Array<{ title: string; whatChanged: string; dataBasis: string }>;
  attentionRequired: AttentionItem[];
  placementFunnel: {
    counts: Record<string, number>;
    hasData?: boolean;
    stages?: Array<{ key: string; label: string }>;
  };
  partnershipHealth: Record<string, unknown>;
  skillAlignment: Record<string, unknown>;
  industryDemand: Array<{ skill: string; count?: number }>;
  hasData: boolean;
  dataLimitations: string[];
}

export const executiveIntelligenceApi = {
  getIntents: (token: string) =>
    apiRequest<{ success: boolean; intents: string[] }>(
      "/institution/executive-intelligence/intents",
      opts(token),
    ),

  getOverview: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; executive: ExecutiveOverview }>(
      `/institution/executive-intelligence/overview${qs(params)}`,
      opts(token),
    ),

  getMetrics: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; metrics: Array<{ name: string; value: unknown; status: string }> }>(
      `/institution/executive-intelligence/metrics${qs(params)}`,
      opts(token),
    ),

  getFunnel: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; funnel: ExecutiveOverview["placementFunnel"] }>(
      `/institution/executive-intelligence/funnel${qs(params)}`,
      opts(token),
    ),

  getTrends: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; trends: Array<{ metric: string; direction: string; statement: string }> }>(
      `/institution/executive-intelligence/trends${qs(params)}`,
      opts(token),
    ),

  getSkillDemand: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; skillDemand: { status: string; demand: Array<{ skill: string; requestCount: number }> } }>(
      `/institution/executive-intelligence/skill-demand${qs(params)}`,
      opts(token),
    ),

  getSkillGaps: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; skillGaps: { status: string; classification: string; gaps: unknown[] } }>(
      `/institution/executive-intelligence/skill-gaps${qs(params)}`,
      opts(token),
    ),

  getPartnershipHealth: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; partnershipHealth: Record<string, unknown> }>(
      `/institution/executive-intelligence/partnership-health${qs(params)}`,
      opts(token),
    ),

  getDataQuality: (token: string) =>
    apiRequest<{ success: boolean; dataQuality: { hasIssues: boolean; issues: DataQualityIssue[] } }>(
      "/institution/executive-intelligence/data-quality",
      opts(token),
    ),

  getInsights: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; insights: ExecutiveInsight[] }>(
      `/institution/executive-intelligence/insights${qs(params)}`,
      opts(token),
    ),

  askDecisionSupport: (token: string, question: string) =>
    apiRequest<{ success: boolean; insight: ExecutiveInsight; causalityNote: string }>(
      "/institution/executive-intelligence/decision-support",
      { ...opts(token), method: "POST", body: { question } },
    ),

  createWorkflowFromInsight: (token: string, insightType: string, context?: Record<string, unknown>) =>
    apiRequest<{ success: boolean; execution?: { _id: string } }>(
      "/institution/executive-intelligence/workflow-from-insight",
      { ...opts(token), method: "POST", body: { insightType, context } },
    ),

  getReportTypes: (token: string) =>
    apiRequest<{ success: boolean; reportTypes: string[] }>(
      "/institution/executive-intelligence/reports/types",
      opts(token),
    ),
};

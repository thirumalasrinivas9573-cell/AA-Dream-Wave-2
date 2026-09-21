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

export type BiSkillEntry = { skill: string; count: number };

export type BiTrendResult = {
  hasTrend: boolean;
  message?: string;
  points: Array<{ period: string; count: number }>;
};

export type BiInsightContract = {
  observation: string;
  evidence: Record<string, unknown>;
  interpretation: string;
  limitation: string;
  nextAction?: string | null;
};

export type InstitutionBiDashboard = {
  generatedAt: string;
  scope: "institution";
  period: string;
  overview: {
    students: number;
    activeStudents: number;
    programs: number;
    faculty: number;
    admissionsEnrolled: number;
    admissionsPendingReview: number;
  };
  academic: {
    enrollment: number;
    programActivity: Array<{ name: string; studentCount: number }>;
    courseActivity: Array<{ course: string; studentCount: number }>;
    supportSignals: number;
  };
  career: {
    applications: number;
    interviews: number;
    offers: number;
    placements: number;
    placementRate: number | null;
    placementRateDefinition?: string;
    funnel: Record<string, number>;
  };
  research: {
    active: number;
    completed: number;
    total: number;
    publications: number;
  };
  opportunities: {
    active: number;
    jobs: number;
    internships: number;
  };
  skills: {
    demand: BiSkillEntry[];
    supply: BiSkillEntry[];
    gaps: BiSkillEntry[];
    overlap: BiSkillEntry[];
    hasData: boolean;
  };
  trends: {
    admissions: BiTrendResult;
    applications: BiTrendResult;
    placements: BiTrendResult;
  };
  community: { totalPosts: number; hasData: boolean };
  projects: { sharedProjects: { total: number; active: number; completed: number }; hasData: boolean };
  learning: { hasData: boolean; recordCount?: number; aggregateProgress?: number | null };
  admissions: { totalEnrolled: number; pendingReview: number; hasData: boolean };
  dataQuality: { warnings: Array<{ type: string; count: number; severity: string }>; hasIssues: boolean };
  hasData: boolean;
};

export type CompanyBiDashboard = {
  generatedAt: string;
  scope: "company";
  period: string;
  overview: {
    activeJobs: number;
    activeInternships: number;
    totalApplications: number;
    activeRecruitments: number;
    hired: number;
  };
  funnel: {
    countType: string;
    description: string;
    counts: Record<string, number>;
    hasData: boolean;
  };
  skills: {
    demand: BiSkillEntry[];
    supply: BiSkillEntry[];
    gaps: BiSkillEntry[];
    hasData: boolean;
  };
  trends: {
    applications: BiTrendResult;
    jobsPosted: BiTrendResult;
    hires: BiTrendResult;
  };
  dataQuality: { warnings: Array<{ type: string; count: number; severity: string }>; hasIssues: boolean };
  hasData: boolean;
};

export type StudentCareerAnalytics = {
  generatedAt: string;
  scope: "student";
  period: string;
  applications: number;
  interviews: number;
  offers: number;
  byStage: Record<string, number>;
  openOpportunities: number;
  hasInstitutionLink: boolean;
  skills: { profile: string[]; roadmap: string[]; count: number };
  projects: { count: number };
  learning: { count: number; roadmaps: number };
  hasData: boolean;
};

export const institutionBiApi = {
  getDashboard: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; dashboard: InstitutionBiDashboard }>(
      `/institution/bi/dashboard${qs(params)}`,
      opts(token),
    ),

  getSkills: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; skills: InstitutionBiDashboard["skills"] }>(
      `/institution/bi/skills${qs(params)}`,
      opts(token),
    ),

  getTrends: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; trends: InstitutionBiDashboard["trends"] }>(
      `/institution/bi/trends${qs(params)}`,
      opts(token),
    ),

  getDataQuality: (token: string) =>
    apiRequest<{ success: boolean; dataQuality: InstitutionBiDashboard["dataQuality"] }>(
      "/institution/bi/data-quality",
      opts(token),
    ),

  getAiInsights: (token: string, intent: string, params?: Record<string, string | undefined>) =>
    apiRequest<{
      success: boolean;
      insights: { intent: string; mode: string; insight: BiInsightContract; disclaimer: string };
    }>("/institution/bi/ai/insights", {
      method: "POST",
      token,
      body: { intent, ...params },
    }),
};

export const companyBiApi = {
  getDashboard: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; dashboard: CompanyBiDashboard }>(
      `/recruitment/bi/dashboard${qs(params)}`,
      opts(token),
    ),

  getFunnel: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; funnel: CompanyBiDashboard["funnel"] }>(
      `/recruitment/bi/funnel${qs(params)}`,
      opts(token),
    ),

  getSkills: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; skills: CompanyBiDashboard["skills"] }>(
      `/recruitment/bi/skills${qs(params)}`,
      opts(token),
    ),

  getAiInsights: (token: string, intent: string, params?: Record<string, string | undefined>) =>
    apiRequest<{
      success: boolean;
      insights: { intent: string; mode: string; insight: BiInsightContract; disclaimer: string };
    }>("/recruitment/bi/ai/insights", {
      method: "POST",
      token,
      body: { intent, ...params },
    }),
};

export const studentBiApi = {
  getCareerAnalytics: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; analytics: StudentCareerAnalytics }>(
      `/student/recruitment/career-analytics${qs(params)}`,
      opts(token),
    ),

  getAiInsights: (token: string, intent = "STUDENT_CAREER", params?: Record<string, string | undefined>) =>
    apiRequest<{
      success: boolean;
      insights: { intent: string; mode: string; insight: BiInsightContract; disclaimer: string };
    }>("/student/recruitment/career-analytics/ai/insights", {
      method: "POST",
      token,
      body: { intent, ...params },
    }),
};

export const BI_PERIOD_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

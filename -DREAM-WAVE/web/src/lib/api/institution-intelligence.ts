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

export type InstitutionIntelligenceOverview = {
  generatedAt: string;
  institution: { name: string; departments: number; programs: number };
  metrics: {
    totalStudents: number;
    activeStudents: number;
    faculty: number;
    admissionsEnrolled: number;
    admissionsPendingReview: number;
    placementApplications: number;
    studentsPlaced: number;
    researchProjects: number;
    incubationStartups: number;
    alumniTotal: number;
    activeOpportunities: number;
  };
  hasData: boolean;
};

export type SupportSignalItem = {
  studentId: string;
  studentName: string;
  rollNumber: string;
  department: string;
  course: string;
  signals: Array<{
    type: string;
    label: string;
    detail: string;
    severity: string;
  }>;
  signalCount: number;
};

export type InstitutionAiInsight = {
  title: string;
  points: string[];
  evidence?: Record<string, unknown>;
};

export const institutionIntelligenceApi = {
  getOverview: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; overview: InstitutionIntelligenceOverview }>(
      `/institution/intelligence/overview${qs(params)}`,
      opts(token),
    ),

  getPrograms: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; programs: { departments: Array<{ name: string; studentCount: number; avgCgpa: number | null; placementRate: number | null }>; hasData: boolean } }>(
      `/institution/intelligence/programs${qs(params)}`,
      opts(token),
    ),

  getSupportSignals: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; support: { items: SupportSignalItem[]; total: number; hasData: boolean } }>(
      `/institution/intelligence/support-signals${qs(params)}`,
      opts(token),
    ),

  getAdmissions: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; admissions: { totalEnrolled: number; pendingReview: number; incompleteProfiles: number; hasData: boolean } }>(
      `/institution/intelligence/admissions${qs(params)}`,
      opts(token),
    ),

  getFaculty: (token: string) =>
    apiRequest<{ success: boolean; faculty: { totalFaculty: number; hasData: boolean } }>(
      "/institution/intelligence/faculty",
      opts(token),
    ),

  getAiIntents: (token: string) =>
    apiRequest<{ success: boolean; intents: string[] }>(
      "/institution/intelligence/ai/intents",
      opts(token),
    ),

  getAiInsights: (
    token: string,
    intent: string,
    params?: Record<string, string | undefined>,
  ) =>
    apiRequest<{
      success: boolean;
      intent: string;
      mode: string;
      insights: InstitutionAiInsight[];
      aiSummary?: string;
      disclaimer?: string;
    }>(`/institution/intelligence/ai/insights`, {
      token,
      method: "POST",
      body: { intent, ...params },
    }),
};

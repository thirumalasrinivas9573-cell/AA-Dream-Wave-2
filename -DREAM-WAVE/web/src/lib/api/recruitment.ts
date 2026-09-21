import { apiRequest } from "@/lib/api/client";
import type {
  ApplicationDetail,
  AtsStats,
  RecruitmentApplication,
  RecruitmentFunnel,
  RecruitmentJob,
  RecruitmentInternship,
  CompanyProfile,
  PipelineStage,
  ApplicantDirectoryEntry,
  RecruitmentInterview,
  InterviewPanel,
  RecruiterTeamMember,
  TalentCandidate,
  PartnerInstitution,
  RecruitmentAnalytics,
  RecruitmentReportPreview,
} from "@/types/recruitment";

type Pagination = {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

function opts(token: string) {
  return { token };
}

export const recruitmentApi = {
  getMeta: (token: string) =>
    apiRequest<{ success: boolean; stages: string[]; tags: string[] }>(
      "/recruitment/meta",
      opts(token),
    ),

  getStats: (token: string) =>
    apiRequest<{ success: boolean; stats: AtsStats }>(
      "/recruitment/stats",
      opts(token),
    ),

  getFunnel: (token: string) =>
    apiRequest<{ success: boolean; funnel: RecruitmentFunnel }>(
      "/recruitment/funnel",
      opts(token),
    ),

  listApplications: (
    token: string,
    params?: Record<string, string | number | undefined>,
  ) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "" && v !== "all") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{
      success: boolean;
      applications: RecruitmentApplication[];
      pagination: Pagination;
    }>(`/recruitment/applications${q ? `?${q}` : ""}`, opts(token));
  },

  getApplication: (token: string, id: string) =>
    apiRequest<{ success: boolean } & ApplicationDetail>(
      `/recruitment/applications/${id}`,
      opts(token),
    ),

  createApplication: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; application: RecruitmentApplication }>(
      "/recruitment/applications",
      { method: "POST", body, token },
    ),

  transitionStage: (
    token: string,
    id: string,
    stage: string,
    extra?: Record<string, unknown>,
  ) =>
    apiRequest<{ success: boolean; application: RecruitmentApplication }>(
      `/recruitment/applications/${id}/stage`,
      { method: "PATCH", body: { stage, ...extra }, token },
    ),

  assignRecruiter: (token: string, id: string, recruiterUserId: string) =>
    apiRequest<{ success: boolean; application: RecruitmentApplication }>(
      `/recruitment/applications/${id}/assign`,
      { method: "PATCH", body: { recruiterUserId }, token },
    ),

  bulkAssign: (token: string, applicationIds: string[], recruiterUserId: string) =>
    apiRequest("/recruitment/applications/bulk/assign", {
      method: "POST",
      body: { applicationIds, recruiterUserId },
      token,
    }),

  bulkTransition: (token: string, applicationIds: string[], stage: string) =>
    apiRequest("/recruitment/applications/bulk/stage", {
      method: "POST",
      body: { applicationIds, stage },
      token,
    }),

  addNote: (token: string, id: string, content: string, type = "internal") =>
    apiRequest(`/recruitment/applications/${id}/notes`, {
      method: "POST",
      body: { content, type },
      token,
    }),

  updateTags: (token: string, id: string, tags: string[]) =>
    apiRequest<{ success: boolean; application: RecruitmentApplication }>(
      `/recruitment/applications/${id}/tags`,
      { method: "PATCH", body: { tags }, token },
    ),

  updateRatings: (
    token: string,
    id: string,
    ratings: Record<string, number>,
  ) =>
    apiRequest<{ success: boolean; application: RecruitmentApplication }>(
      `/recruitment/applications/${id}/ratings`,
      { method: "PATCH", body: { ratings }, token },
    ),

  scheduleInterview: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest(`/recruitment/applications/${id}/interviews`, {
      method: "POST",
      body,
      token,
    }),

  submitInterviewFeedback: (
    token: string,
    interviewId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest(`/recruitment/interviews/${interviewId}/feedback`, {
      method: "POST",
      body,
      token,
    }),

  createAssessment: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest(`/recruitment/applications/${id}/assessments`, {
      method: "POST",
      body,
      token,
    }),

  releaseOffer: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest(`/recruitment/applications/${id}/offer`, {
      method: "POST",
      body,
      token,
    }),

  getAllowedTransitions: (token: string, id: string) =>
    apiRequest<{ success: boolean; currentStage: string; allowedTransitions: string[] }>(
      `/recruitment/applications/${id}/transitions`,
      opts(token),
    ),

  bulkUpdateTags: (token: string, applicationIds: string[], tags: string[]) =>
    apiRequest("/recruitment/applications/bulk/tags", {
      method: "POST",
      body: { applicationIds, tags },
      token,
    }),

  listJobs: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; jobs: RecruitmentJob[]; pagination: Pagination }>(
      `/recruitment/jobs${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  createJob: (token: string, body: Record<string, unknown>) =>
    apiRequest("/recruitment/jobs", { method: "POST", body, token }),

  getJob: (token: string, id: string) =>
    apiRequest<{ success: boolean; job: RecruitmentJob }>(
      `/recruitment/jobs/${id}`,
      opts(token),
    ),

  updateJob: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; job: RecruitmentJob }>(
      `/recruitment/jobs/${id}`,
      { method: "PATCH", body, token },
    ),

  transitionJob: (token: string, id: string, action: string) =>
    apiRequest<{ success: boolean; job: RecruitmentJob }>(
      `/recruitment/jobs/${id}/action`,
      { method: "POST", body: { action }, token },
    ),

  listInternships: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; internships: RecruitmentInternship[] }>(
      `/recruitment/internships${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  createInternship: (token: string, body: Record<string, unknown>) =>
    apiRequest("/recruitment/internships", { method: "POST", body, token }),

  updateInternship: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest(`/recruitment/internships/${id}`, { method: "PATCH", body, token }),

  transitionInternship: (token: string, id: string, action: string) =>
    apiRequest(`/recruitment/internships/${id}/action`, {
      method: "POST",
      body: { action },
      token,
    }),

  getProfile: (token: string) =>
    apiRequest<{ success: boolean; profile: CompanyProfile }>(
      "/recruitment/profile",
      opts(token),
    ),

  updateProfile: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; profile: CompanyProfile }>(
      "/recruitment/profile",
      { method: "PATCH", body, token },
    ),

  getPipeline: (token: string) =>
    apiRequest<{ success: boolean; pipeline: { stages: PipelineStage[] } }>(
      "/recruitment/pipeline",
      opts(token),
    ),

  updatePipeline: (token: string, stages: PipelineStage[]) =>
    apiRequest<{ success: boolean; pipeline: { stages: PipelineStage[] } }>(
      "/recruitment/pipeline",
      { method: "PATCH", body: { stages }, token },
    ),

  listApplicants: (
    token: string,
    params?: Record<string, string | number | undefined>,
  ) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{
      success: boolean;
      applicants: ApplicantDirectoryEntry[];
      pagination: Pagination;
    }>(`/recruitment/applicants${q ? `?${q}` : ""}`, opts(token));
  },

  listShortlisted: (
    token: string,
    params?: Record<string, string | number | undefined>,
  ) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{
      success: boolean;
      applications: RecruitmentApplication[];
      pagination: Pagination;
    }>(`/recruitment/shortlist${q ? `?${q}` : ""}`, opts(token));
  },

  bulkShortlistAction: (
    token: string,
    applicationIds: string[],
    action: string,
    extra?: Record<string, unknown>,
  ) =>
    apiRequest("/recruitment/shortlist/bulk", {
      method: "POST",
      body: { applicationIds, action, ...extra },
      token,
    }),

  completeAssessment: (
    token: string,
    assessmentId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest(`/recruitment/assessments/${assessmentId}/complete`, {
      method: "POST",
      body,
      token,
    }),

  listInterviews: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; interviews: RecruitmentInterview[] }>(
      `/recruitment/interviews${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  rescheduleInterview: (token: string, interviewId: string, body: Record<string, unknown>) =>
    apiRequest(`/recruitment/interviews/${interviewId}`, { method: "PATCH", body, token }),

  cancelInterview: (token: string, interviewId: string, reason?: string) =>
    apiRequest(`/recruitment/interviews/${interviewId}/cancel`, {
      method: "POST",
      body: { reason },
      token,
    }),

  recordInterviewOutcome: (token: string, interviewId: string, body: Record<string, unknown>) =>
    apiRequest(`/recruitment/interviews/${interviewId}/outcome`, {
      method: "POST",
      body,
      token,
    }),

  listPanels: (token: string) =>
    apiRequest<{ success: boolean; panels: InterviewPanel[] }>("/recruitment/panels", opts(token)),

  createPanel: (token: string, body: Record<string, unknown>) =>
    apiRequest("/recruitment/panels", { method: "POST", body, token }),

  createOfferDraft: (token: string, applicationId: string, body: Record<string, unknown>) =>
    apiRequest(`/recruitment/applications/${applicationId}/offer/draft`, {
      method: "POST",
      body,
      token,
    }),

  transitionOffer: (token: string, offerId: string, action: string, extra?: Record<string, unknown>) =>
    apiRequest(`/recruitment/offers/${offerId}/action`, {
      method: "POST",
      body: { action, ...extra },
      token,
    }),

  updateOnboarding: (token: string, applicationId: string, status: string, note?: string) =>
    apiRequest(`/recruitment/applications/${applicationId}/onboarding`, {
      method: "PATCH",
      body: { status, note },
      token,
    }),

  discoverTalent: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; candidates: TalentCandidate[]; pagination: Pagination }>(
      `/recruitment/talent/discover${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  sendCommunication: (token: string, body: Record<string, unknown>) =>
    apiRequest("/recruitment/communications", { method: "POST", body, token }),

  updateTeam: (token: string, team: RecruiterTeamMember[]) =>
    apiRequest("/recruitment/team", { method: "PATCH", body: { team }, token }),

  listPartners: (token: string) =>
    apiRequest<{ success: boolean; partners: PartnerInstitution[] }>(
      "/recruitment/partners",
      opts(token),
    ),

  getAnalytics: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; analytics: RecruitmentAnalytics }>(
      `/recruitment/analytics${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  getReportTypes: (token: string) =>
    apiRequest<{ success: boolean; reportTypes: string[] }>(
      "/recruitment/reports/types",
      opts(token),
    ),

  previewReport: (
    token: string,
    type: string,
    params?: Record<string, string | number | undefined>,
  ) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; report: RecruitmentReportPreview }>(
      `/recruitment/reports/${type}${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  exportReport: (
    token: string,
    type: string,
    format: "csv" | "xlsx" | "pdf" = "csv",
    params?: Record<string, string | undefined>,
  ) => {
    const qs = new URLSearchParams({ format });
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    return apiRequest<{
      success: boolean;
      export: { filename: string; content: string; mimeType: string; format: string };
    }>(`/recruitment/reports/${type}/export?${qs.toString()}`, opts(token));
  },
};

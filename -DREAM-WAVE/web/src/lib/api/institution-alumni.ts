import { apiRequest } from "@/lib/api/client";
import type {
  AlumniCareerContribution,
  AlumniGroup,
  AlumniMentorship,
  AlumniMentorshipSession,
  AlumniProfile,
  AlumniStats,
  AlumniWorkspace,
  Pagination,
} from "@/types/alumni-management";

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

export const institutionAlumniApi = {
  getMeta: (token: string) =>
    apiRequest<{ success: boolean }>("/institution/alumni/meta", opts(token)),

  getStats: (token: string) =>
    apiRequest<{ success: boolean; stats: AlumniStats }>("/institution/alumni/stats", opts(token)),

  getWorkspace: (token: string) =>
    apiRequest<{ success: boolean; workspace: AlumniWorkspace }>(
      "/institution/alumni/workspace",
      opts(token),
    ),

  listAlumni: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; alumni: AlumniProfile[]; pagination: Pagination }>(
      `/institution/alumni/directory${qs(params)}`,
      opts(token),
    ),

  createAlumni: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; alumni: AlumniProfile }>(
      "/institution/alumni/directory",
      { method: "POST", body, token },
    ),

  updateAlumni: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; alumni: AlumniProfile }>(
      `/institution/alumni/directory/${id}`,
      { method: "PATCH", body, token },
    ),

  verifyAlumni: (token: string, id: string, verificationStatus: string) =>
    apiRequest<{ success: boolean; alumni: AlumniProfile }>(
      `/institution/alumni/directory/${id}/verify`,
      { method: "POST", body: { verificationStatus }, token },
    ),

  createFromStudent: (token: string, studentId: string) =>
    apiRequest<{ success: boolean; alumni: AlumniProfile }>(
      `/institution/alumni/directory/from-student/${studentId}`,
      { method: "POST", token },
    ),

  listGroups: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; groups: AlumniGroup[]; pagination: Pagination }>(
      `/institution/alumni/groups${qs(params)}`,
      opts(token),
    ),

  createGroup: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; group: AlumniGroup }>(
      "/institution/alumni/groups",
      { method: "POST", body, token },
    ),

  addGroupMember: (token: string, groupId: string, alumniId: string) =>
    apiRequest<{ success: boolean; group: AlumniGroup }>(
      `/institution/alumni/groups/${groupId}/members`,
      { method: "POST", body: { alumniId }, token },
    ),

  listMentorships: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; mentorships: AlumniMentorship[]; pagination: Pagination }>(
      `/institution/alumni/mentorships${qs(params)}`,
      opts(token),
    ),

  updateMentorship: (token: string, id: string, status: string) =>
    apiRequest<{ success: boolean; mentorship: AlumniMentorship }>(
      `/institution/alumni/mentorships/${id}`,
      { method: "PATCH", body: { status }, token },
    ),

  listSessions: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; sessions: AlumniMentorshipSession[]; pagination: Pagination }>(
      `/institution/alumni/sessions${qs(params)}`,
      opts(token),
    ),

  scheduleSession: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; session: AlumniMentorshipSession }>(
      "/institution/alumni/sessions",
      { method: "POST", body, token },
    ),

  completeSession: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; session: AlumniMentorshipSession }>(
      `/institution/alumni/sessions/${id}/complete`,
      { method: "POST", body, token },
    ),

  listContributions: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; contributions: AlumniCareerContribution[]; pagination: Pagination }>(
      `/institution/alumni/career${qs(params)}`,
      opts(token),
    ),

  createContribution: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; contribution: AlumniCareerContribution }>(
      "/institution/alumni/career",
      { method: "POST", body, token },
    ),

  getEngagement: (token: string) =>
    apiRequest<{ success: boolean; analytics: import("@/types/alumni-management").EngagementAnalytics }>(
      "/institution/alumni/engagement",
      opts(token),
    ),

  listEvents: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; events: import("@/types/alumni-management").AlumniEvent[]; pagination: Pagination }>(
      `/institution/alumni/events${qs(params)}`,
      opts(token),
    ),

  createEvent: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/alumni/events", { method: "POST", body, token }),

  publishEvent: (token: string, id: string) =>
    apiRequest(`/institution/alumni/events/${id}/publish`, { method: "POST", token }),

  listInstitutionalContributions: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; contributions: import("@/types/alumni-management").InstitutionalContribution[]; pagination: Pagination }>(
      `/institution/alumni/contributions${qs(params)}`,
      opts(token),
    ),

  createInstitutionalContribution: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/alumni/contributions", { method: "POST", body, token }),

  approveInstitutionalContribution: (token: string, id: string, approvalStatus: string) =>
    apiRequest(`/institution/alumni/contributions/${id}/approve`, {
      method: "POST",
      body: { approvalStatus },
      token,
    }),

  listGroupPosts: (token: string, groupId: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; posts: import("@/types/alumni-management").GroupPost[]; pagination: Pagination }>(
      `/institution/alumni/groups/${groupId}/posts${qs(params)}`,
      opts(token),
    ),

  createGroupPost: (token: string, groupId: string, body: Record<string, unknown>) =>
    apiRequest(`/institution/alumni/groups/${groupId}/posts`, { method: "POST", body, token }),

  listVolunteers: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; volunteers: import("@/types/alumni-management").VolunteerRecord[]; pagination: Pagination }>(
      `/institution/alumni/volunteers${qs(params)}`,
      opts(token),
    ),

  createVolunteerRecord: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/alumni/volunteers", { method: "POST", body, token }),

  listCareerApplications: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; applications: import("@/types/alumni-management").CareerApplication[]; pagination: Pagination }>(
      `/institution/alumni/applications${qs(params)}`,
      opts(token),
    ),

  listAuditLog: (token: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<{ success: boolean; auditLog: import("@/types/alumni-management").AlumniAuditEntry[]; pagination: Pagination }>(
      `/institution/alumni/audit${qs(params)}`,
      opts(token),
    ),

  getAnalytics: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; analytics: import("@/types/alumni-management").AlumniAnalytics }>(
      `/institution/alumni/analytics${qs(params)}`,
      opts(token),
    ),

  getReportTypes: (token: string) =>
    apiRequest<{ success: boolean; reportTypes: string[] }>(
      "/institution/alumni/reports/types",
      opts(token),
    ),

  previewReport: (
    token: string,
    type: string,
    params?: Record<string, string | number | undefined>,
  ) =>
    apiRequest<{ success: boolean; report: import("@/types/alumni-management").AlumniReportPreview }>(
      `/institution/alumni/reports/${type}${qs(params)}`,
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
      export: { format: string; mimeType: string; filename: string; content: string };
    }>(`/institution/alumni/reports/${type}/export?${search}`, opts(token));
  },
};

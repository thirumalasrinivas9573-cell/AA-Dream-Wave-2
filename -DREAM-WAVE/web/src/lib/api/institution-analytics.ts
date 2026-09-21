import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

export type InstitutionAnalytics = {
  totalStudents: number;
  activeStudents: number;
  byDepartment: Record<string, number>;
  byProgram: Record<string, number>;
  byBatch: Record<string, number>;
  bySemester: Record<string, number>;
  bySection: Record<string, number>;
  byAcademicStatus: Record<string, number>;
  byPlacementLifecycle: Record<string, number>;
  placementEligible: number;
  placedStudents: number;
  withSharedProjects: number;
  withVerifiedCertificates: number;
  missingRequiredDocuments: number;
  avgAttendance: number;
  avgCgpa: number;
  hasData: boolean;
};

export type ReportPreview = {
  type: string;
  header: string[];
  rows: Array<Array<string | number>>;
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export const institutionAnalyticsApi = {
  getAnalytics: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; analytics: InstitutionAnalytics }>(
      `/institution/students/analytics${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  getReportTypes: (token: string) =>
    apiRequest<{ success: boolean; reportTypes: string[] }>(
      "/institution/students/reports/types",
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
    return apiRequest<{ success: boolean; report: ReportPreview }>(
      `/institution/students/reports/${type}${q ? `?${q}` : ""}`,
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
      export: { filename: string; content: string; mimeType: string };
    }>(`/institution/students/reports/${type}/export?${qs.toString()}`, opts(token));
  },

  getPermissions: (token: string) =>
    apiRequest<{
      success: boolean;
      roles: string[];
      permissions: string[];
      currentRole: string;
      adminTags: string[];
      noteTypes: string[];
    }>("/institution/students/permissions", opts(token)),
};

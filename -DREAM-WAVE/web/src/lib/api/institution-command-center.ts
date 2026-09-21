import { apiRequest } from "@/lib/api/client";
import type {
  CommandCenterOverview,
  ExecutiveAnalytics,
  ExecutiveAuditEntry,
  ExecutiveReportPreview,
} from "@/types/command-center";

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

export const institutionCommandCenterApi = {
  getOverview: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; overview: CommandCenterOverview }>(
      `/institution/command-center/overview${qs(params)}`,
      opts(token),
    ),

  getAnalytics: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; analytics: ExecutiveAnalytics }>(
      `/institution/command-center/analytics${qs(params)}`,
      opts(token),
    ),

  getKPIs: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; kpis: ExecutiveAnalytics["strategicKPIs"] }>(
      `/institution/command-center/kpis${qs(params)}`,
      opts(token),
    ),

  getCopilot: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{
      success: boolean;
      insights: CommandCenterOverview["copilotInsights"];
      executiveInsights: CommandCenterOverview["executiveInsights"];
    }>(`/institution/command-center/copilot${qs(params)}`, opts(token)),

  getReportTypes: (token: string) =>
    apiRequest<{ success: boolean; reportTypes: string[] }>(
      "/institution/command-center/reports/types",
      opts(token),
    ),

  previewReport: (
    token: string,
    type: string,
    params?: Record<string, string | number | undefined>,
  ) => {
    const search = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") search.set(k, String(v));
      }
    }
    const q = search.toString();
    return apiRequest<{ success: boolean; report: ExecutiveReportPreview }>(
      `/institution/command-center/reports/${type}${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

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
    }>(`/institution/command-center/reports/${type}/export?${search}`, opts(token));
  },

  listAuditLog: (token: string, params?: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") search.set(k, String(v));
      }
    }
    const q = search.toString();
    return apiRequest<{ success: boolean; auditLog: ExecutiveAuditEntry[] }>(
      `/institution/command-center/audit${q ? `?${q}` : ""}`,
      opts(token),
    );
  },
};

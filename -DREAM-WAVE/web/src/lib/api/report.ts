import { apiRequest } from "@/lib/api/client";
import type {
  ReportDocument,
  ReportResponse,
  ReportsResponse,
} from "@/types/student";

export const reportApi = {
  list: (token: string) =>
    apiRequest<ReportsResponse>("/report", { method: "GET", token }),

  generate: (goal: string, token: string) =>
    apiRequest<ReportResponse>("/report", {
      method: "POST",
      body: { goal },
      token,
    }),

  getById: (id: string, token: string) =>
    apiRequest<ReportResponse>(`/report/${id}/download`, {
      method: "GET",
      token,
    }),
};

export type { ReportDocument };

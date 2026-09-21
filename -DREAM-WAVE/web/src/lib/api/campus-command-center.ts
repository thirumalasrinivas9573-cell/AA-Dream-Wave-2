import { apiRequest } from "@/lib/api/client";
import type { CampusCommandCenter, WeeklyCampusReport } from "@/types/campus-command-center";

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

export const campusCommandCenterApi = {
  getOverview: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; commandCenter: CampusCommandCenter }>(
      `/institution/campus-command-center${qs(params)}`,
      { token },
    ),

  getDailyBrief: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; brief: CampusCommandCenter["dailyBrief"]; generatedAt: string }>(
      `/institution/campus-command-center/daily-brief${qs(params)}`,
      { token },
    ),

  getWeeklyReport: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; report: WeeklyCampusReport }>(
      `/institution/campus-command-center/weekly-report${qs(params)}`,
      { token },
    ),

  getAiInsight: (token: string, intent: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; insight: { observation: string; why?: string; nextStep?: string; gaps?: string[] } }>(
      `/institution/campus-command-center/ai/insights${qs(params)}`,
      { token, method: "POST", body: { intent } },
    ),
};

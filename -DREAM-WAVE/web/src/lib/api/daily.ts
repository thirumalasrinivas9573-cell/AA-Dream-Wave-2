import { apiRequest } from "@/lib/api/client";

export type DailyAdviceResponse = {
  success: boolean;
  tip?: string;
  action?: string;
  affirmation?: string;
  advice?: string;
};

export const dailyApi = {
  get: (token: string, payload?: { category?: string; query?: string }) =>
    apiRequest<DailyAdviceResponse>("/daily", {
      method: "POST",
      body: payload ?? {},
      token,
    }),
};

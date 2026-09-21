import { apiRequest } from "@/lib/api/client";
import type { Goal, GoalResponse, GoalsResponse } from "@/types/student";

export type CreateGoalPayload = {
  title: string;
  description?: string;
  category?: string;
  deadline?: string;
};

export type UpdateGoalPayload = Partial<CreateGoalPayload> & {
  progress?: number;
  completed?: boolean;
};

export const goalsApi = {
  list: (token: string) =>
    apiRequest<GoalsResponse>("/goals", { method: "GET", token }),

  create: (payload: CreateGoalPayload, token: string) =>
    apiRequest<GoalResponse>("/goals", {
      method: "POST",
      body: payload,
      token,
    }),

  update: (id: string, payload: UpdateGoalPayload, token: string) =>
    apiRequest<GoalResponse>(`/goals/${id}`, {
      method: "PUT",
      body: payload,
      token,
    }),

  remove: (id: string, token: string) =>
    apiRequest<{ success: boolean }>(`/goals/${id}`, {
      method: "DELETE",
      token,
    }),

  generatePlan: (id: string, token: string) =>
    apiRequest<GoalResponse & { steps?: string[] }>(`/goals/${id}/ai-plan`, {
      method: "POST",
      token,
    }),
};

export type { Goal };

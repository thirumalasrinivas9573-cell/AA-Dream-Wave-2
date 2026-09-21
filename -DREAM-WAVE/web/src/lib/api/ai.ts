import { apiRequest } from "@/lib/api/client";
import type {
  AiAgentResponse,
  AiAgentType,
  AiBooksResponse,
  AiChatResponse,
  AiChatSession,
  AiDashboardStats,
  AiHistoryResponse,
  AiProgress,
  AiResumePayload,
  AiResumeResponse,
  AiRoadmapResponse,
  AiUserProfile,
} from "@/types/ai-platform";

export const aiApi = {
  chat: (
    message: string,
    token: string,
    options?: { session?: AiChatSession; userGoal?: string; mode?: string },
  ) =>
    apiRequest<AiChatResponse>("/ai/chat", {
      method: "POST",
      body: {
        message,
        session: options?.session ?? "mentor",
        ...(options?.userGoal ? { userGoal: options.userGoal } : {}),
        ...(options?.mode ? { mode: options.mode } : {}),
      },
      token,
    }),

  history: (session: AiChatSession, token: string) =>
    apiRequest<AiHistoryResponse>(
      `/ai/history?session=${encodeURIComponent(session)}`,
      {
        method: "GET",
        token,
      },
    ),

  clearHistory: (session: AiChatSession, token: string) =>
    apiRequest<{ success: boolean }>(
      `/ai/history?session=${encodeURIComponent(session)}`,
      {
        method: "DELETE",
        token,
      },
    ),

  agent: (message: string, agentType: AiAgentType, token: string) =>
    apiRequest<AiAgentResponse>("/ai/agent", {
      method: "POST",
      body: { message, agentType },
      token,
    }),

  roadmap: (goal: string, currentLevel: string, token: string) =>
    apiRequest<AiRoadmapResponse>("/ai/roadmap", {
      method: "POST",
      body: { goal, currentLevel },
      token,
    }),

  books: (topic: string, token: string) =>
    apiRequest<AiBooksResponse>("/ai/books", {
      method: "POST",
      body: { topic },
      token,
    }),

  resume: (payload: AiResumePayload, token: string) =>
    apiRequest<AiResumeResponse>("/ai/resume", {
      method: "POST",
      body: payload,
      token,
    }),

  dashboardStats: (token: string) =>
    apiRequest<{ success: boolean; stats: AiDashboardStats }>(
      "/ai/dashboard-stats",
      {
        method: "GET",
        token,
      },
    ),

  progress: (token: string) =>
    apiRequest<{ success: boolean; progress: AiProgress }>("/ai/progress", {
      method: "GET",
      token,
    }),

  nudge: (token: string) =>
    apiRequest<{ success: boolean; nudge: string }>("/ai/nudge", {
      method: "GET",
      token,
    }),

  getProfile: (token: string) =>
    apiRequest<{ success: boolean; profile: AiUserProfile }>(
      "/ai/user-profile",
      {
        method: "GET",
        token,
      },
    ),

  updateProfile: (payload: Partial<AiUserProfile>, token: string) =>
    apiRequest<{ success: boolean; profile: AiUserProfile }>(
      "/ai/user-profile",
      {
        method: "PUT",
        body: payload,
        token,
      },
    ),
};
